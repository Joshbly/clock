// Download Hipparcos New Reduction (van Leeuwen 2007, I/311) from VizieR,
// filter to Hpmag < 6.5 (~9100 stars), and emit a compact stars_hip.js
// file embedded as a Float32Array string literal.
//
// Format per star (6 floats):
//   [RA_J2000_rad, Dec_J2000_rad, pmRA_mas/yr, pmDec_mas/yr, mag, BV_color]
//
// Plus a CONSTELLATION_LINES array of [HIP_a, HIP_b] index pairs from
// the IAU standard 88 asterisms.
//
// Run with: node build_stars.mjs
//
// The Hipparcos New Reduction has these ASCII columns we care about:
//   field  start  end  fmt  description
//   HIP      1     6   I6   Hipparcos identifier
//   RArad   16   28   F13.10 RA J2000 (rad)
//   DErad   30   42   F13.10 Dec J2000 (rad)
//   pmRA    52   59   F8.2  proper motion in RA (mas/yr)
//   pmDE    61   68   F8.2  proper motion in Dec (mas/yr)
//   Hpmag  130  136   F7.4  Hipparcos magnitude
//   B-V    154  159   F6.3  Tycho B-V color (in I/239 cross-reference)
// I/311 doesn't include B-V directly; we'll use I/239 (original Hipparcos)
// for B-V via HIP cross-reference.

import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const OUT = '/Users/joshuablyskal/clock/stars_hip.js';
const CACHE_DIR = '/Users/joshuablyskal/clock/data_scripts/cache';
execSync(`mkdir -p ${CACHE_DIR}`);

// VizieR TAP / CSV endpoints. We'll grab two CSVs:
//   I/311/hip2 — new reduction astrometry (RA/Dec/proper motion)
//   I/239/hip_main — original Hipparcos for B-V color
const VIZ_HIP2_URL =
  'https://vizier.cds.unistra.fr/viz-bin/asu-tsv?' +
  '-source=I/311/hip2' +
  '&-out=HIP,RArad,DErad,pmRA,pmDE,Hpmag' +
  '&-out.max=15000' +
  '&Hpmag=<6.5' +
  '&-out.form=tsv';

const VIZ_HIP1_URL =
  'https://vizier.cds.unistra.fr/viz-bin/asu-tsv?' +
  '-source=I/239/hip_main' +
  '&-out=HIP,B-V' +
  '&-out.max=15000' +
  '&Vmag=<6.5' +
  '&-out.form=tsv';

function fetchCached(url, cacheKey) {
  const cachePath = `${CACHE_DIR}/${cacheKey}`;
  if (existsSync(cachePath)) {
    console.log(`  cache hit: ${cacheKey}`);
    return readFileSync(cachePath, 'utf8');
  }
  console.log(`  fetching ${cacheKey} ...`);
  const data = execSync(`curl -fsSL "${url}"`, { maxBuffer: 200 * 1024 * 1024 }).toString();
  writeFileSync(cachePath, data);
  return data;
}

console.log('downloading hip2 astrometry...');
const hip2Text = fetchCached(VIZ_HIP2_URL, 'hip2.tsv');

console.log('downloading hip1 colors...');
const hip1Text = fetchCached(VIZ_HIP1_URL, 'hip1.tsv');

// Parse VizieR TSV: '#'-comments header, then header line with column names,
// then a separator line '----', then data lines.
function parseVizierTsv(text) {
  const lines = text.split('\n');
  // Find the header / data block
  let i = 0;
  while (i < lines.length && (lines[i].startsWith('#') || lines[i].trim() === '')) i++;
  if (i >= lines.length) return { columns: [], rows: [] };
  const columns = lines[i].split('\t').map(s => s.trim());
  i++;
  // Skip "units" line
  while (i < lines.length && lines[i].startsWith('---') === false && lines[i].trim() !== '') {
    if (lines[i].includes('---')) break;
    i++;
  }
  // Skip the separator row
  while (i < lines.length && lines[i].startsWith('---')) i++;
  const rows = [];
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('#')) continue;
    const fields = line.split('\t').map(s => s.trim());
    if (fields.length < 2) continue;
    rows.push(fields);
  }
  return { columns, rows };
}

const hip2 = parseVizierTsv(hip2Text);
const hip1 = parseVizierTsv(hip1Text);

console.log(`hip2: ${hip2.rows.length} rows, columns: ${hip2.columns.join(',')}`);
console.log(`hip1: ${hip1.rows.length} rows, columns: ${hip1.columns.join(',')}`);

// Build B-V lookup keyed by HIP id
const colHip1HIP = hip1.columns.indexOf('HIP');
const colHip1BV = hip1.columns.indexOf('B-V');
const bvByHip = new Map();
for (const r of hip1.rows) {
  const h = parseInt(r[colHip1HIP]);
  const bv = parseFloat(r[colHip1BV]);
  if (!Number.isFinite(h)) continue;
  if (Number.isFinite(bv)) bvByHip.set(h, bv);
}

// Extract & filter hip2
const colHIP = hip2.columns.indexOf('HIP');
const colRA = hip2.columns.indexOf('RArad');
const colDec = hip2.columns.indexOf('DErad');
const colPmRA = hip2.columns.indexOf('pmRA');
const colPmDec = hip2.columns.indexOf('pmDE');
const colMag = hip2.columns.indexOf('Hpmag');

const stars = [];   // [HIP, RA, Dec, pmRA, pmDec, mag, BV]
for (const r of hip2.rows) {
  const hip = parseInt(r[colHIP]);
  const ra = parseFloat(r[colRA]);
  const dec = parseFloat(r[colDec]);
  if (!Number.isFinite(hip) || !Number.isFinite(ra) || !Number.isFinite(dec)) continue;
  const pmRA = parseFloat(r[colPmRA]) || 0;
  const pmDec = parseFloat(r[colPmDec]) || 0;
  const mag = parseFloat(r[colMag]);
  if (!Number.isFinite(mag) || mag > 6.5) continue;
  const bv = bvByHip.has(hip) ? bvByHip.get(hip) : 0.5; // default neutral
  stars.push([hip, ra, dec, pmRA, pmDec, mag, bv]);
}
console.log(`filtered to ${stars.length} stars (mag < 6.5)`);

// HIP -> index map for constellation lines
const hipToIdx = new Map();
stars.forEach((s, i) => hipToIdx.set(s[0], i));

// IAU 88 modern constellations — line segments (asterisms).
// Source: Marc van der Sluys' constellation_lines.dat (CC-BY-SA),
// converted to HIP IDs. Each entry is [constellationName, [hipA, hipB, ...]],
// where successive HIP IDs form a polyline (consecutive segments).
// We embed only the most popular ~40 patterns to keep the file small.
const CONST_PATTERNS = [
  // [name, hip_path]  — connect stars in order; commas reset the polyline
  ['Ursa Major', [54061, 53910, 58001, 59774, 62956, 65378, 67301]],  // Big Dipper
  ['Cassiopeia', [4427, 6686, 3179, 746, 8886]],
  ['Orion', [27989, 26727, 25336, 26311, 25930, 27989]],
  ['Orion Belt', [25336, 26311, 26727]],
  ['Orion Sword', [26221, 26199, 26197]],
  ['Cygnus', [97649, 100453, 102488, 104732, 102098, 100453]],
  ['Cygnus N', [98110, 100453, 95947]],
  ['Lyra', [91262, 92420, 92791, 93194, 91971]],
  ['Aquila', [97649, 96117, 99473, 97804, 93747, 93805, 95501]],
  ['Leo', [49669, 50335, 54879, 57632, 54872, 50583, 49669]],
  ['Scorpius', [78401, 78820, 80112, 81266, 82396, 82514, 86670, 87073, 86228]],
  ['Sagittarius', [88635, 89642, 89931, 90185, 92041, 93506, 92855, 89931]],
  ['Crux', [60718, 62434, 59747, 61084]],
  ['Centaurus', [68702, 71683, 68002, 65936]],
  ['Cepheus', [109492, 105199, 106032, 116727, 109492]],
  ['Draco', [56211, 61281, 68756, 75458, 78527, 80331, 83895, 87833, 89937, 94376]],
  ['Bootes', [69673, 71075, 71795, 73555, 74785, 71795, 67927, 69673]],
  ['Hercules', [80170, 81693, 84379, 86974, 80170, 79992, 79101]],
  ['Perseus', [13531, 14328, 15863, 17358, 18246, 18614, 18532, 17448, 14817, 14328]],
  ['Taurus', [21421, 20889, 20455, 20205, 25428, 26451, 28360]],
  ['Pleiades', [17847, 17702, 17579, 17531, 17499, 17608]],
  ['Gemini', [36850, 37826, 36046, 35550, 34693, 32246, 30343]],
  ['Canis Major', [32349, 33856, 34444, 35037, 35904, 33856]],
  ['Canis Minor', [37279, 36188]],
  ['Auriga', [24608, 23015, 25428, 28380, 24608]],
  ['Pegasus', [113881, 1067, 113963, 113881, 107315, 109427, 113881]],
  ['Andromeda', [113881, 9640, 5447, 3881]],
  ['Pisces Aust', [113368, 110395, 109074, 107315]],
  ['Virgo', [65474, 69427, 72220, 73555, 71957, 69701, 66249, 65474]],
  ['Libra', [74785, 76333, 76670, 74392, 72622]],
  ['Capricornus', [100345, 102978, 104139, 107556, 106985, 105881, 102978]],
  ['Aquarius', [109074, 110960, 111497, 112961, 114341, 110960]],
  ['Cetus', [3419, 5447, 9487, 10324, 12706, 14146, 12390, 8645, 3419]],
  ['Aries', [9640, 8832, 8903]],
  ['Cancer', [42806, 42911, 43103, 44066, 40526]],
  ['Triangulum', [10670, 10064, 8796]],
  ['Ursa Minor', [11767, 85822, 82080, 77055, 75097, 72607, 79822, 77055]],
  ['Hydra', [42313, 43109, 43234, 43813, 46390, 49081, 52727, 54682, 56343, 57936, 60965, 64962, 69673]],
  ['Corvus', [59199, 59316, 60965, 61359, 59803]],
  ['Crater', [54682, 55282, 55687, 56561, 55687]],
  ['Lupus', [76297, 75141, 73807, 71860, 73807, 76297]],
  ['Eridanus', [22701, 21036, 20042, 18543, 18246, 16537, 14146, 13847, 12413, 9007]],
  ['Ophiuchus', [79593, 84012, 86032, 86742, 84345, 79593]],
  ['Serpens', [77450, 77233, 78072, 78533, 77622, 77450]],
  ['Vela', [44816, 46651, 50191, 52419, 44816]],
  ['Carina', [30438, 39429, 41037, 45556, 50191]]
];

// Convert HIP polylines into pairs of indices into stars[].
// Drop entries whose HIPs aren't in our filtered set.
const lines = [];
let dropped = 0;
for (const [name, path] of CONST_PATTERNS) {
  for (let i = 0; i < path.length - 1; i++) {
    const a = hipToIdx.get(path[i]);
    const b = hipToIdx.get(path[i + 1]);
    if (a === undefined || b === undefined) {
      dropped++;
      continue;
    }
    lines.push([a, b]);
  }
}
console.log(`constellation segments: ${lines.length} (dropped ${dropped} due to missing stars)`);

// Emit compact JS file. Use Float32Array packing: 6 floats per star.
// Encode RA/Dec already as radians (from VizieR), pmRA/pmDec mas/yr,
// magnitude (Hpmag), B-V color.
const FLOATS_PER_STAR = 6;
const buf = new Float32Array(stars.length * FLOATS_PER_STAR);
for (let i = 0; i < stars.length; i++) {
  const s = stars[i];
  buf[i * 6 + 0] = s[1];  // RA rad
  buf[i * 6 + 1] = s[2];  // Dec rad
  buf[i * 6 + 2] = s[3];  // pmRA mas/yr
  buf[i * 6 + 3] = s[4];  // pmDec mas/yr
  buf[i * 6 + 4] = s[5];  // mag
  buf[i * 6 + 5] = s[6];  // B-V
}

// Convert to Base64 for compact text representation
const bytes = Buffer.from(buf.buffer);
const b64 = bytes.toString('base64');

// Format constellation lines as flat array
const linesFlat = [];
for (const [a, b] of lines) linesFlat.push(a, b);

const out = `// Hipparcos New Reduction (van Leeuwen 2007, I/311) — naked-eye stars (Hpmag < 6.5)
// Generated from VizieR by data_scripts/build_stars.mjs.
// Per star: 6 floats = [RA_J2000_rad, Dec_J2000_rad, pmRA_mas/yr, pmDec_mas/yr, mag, B-V].
// Decoded into a Float32Array via the IIFE below.
// Constellation lines: pairs of indices into the star array, from IAU asterisms.

const STARS_COUNT = ${stars.length};
const STARS_FLOATS_PER = ${FLOATS_PER_STAR};
const STARS = (() => {
  const b64 = "${b64}";
  const bin = atob(b64);
  const len = bin.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
  return new Float32Array(u8.buffer);
})();

// Hipparcos catalog epoch is J1991.25 (JD 2448349.0625).
const STARS_EPOCH_JD = 2448349.0625;

// Constellation polyline segments — pairs of indices into STARS.
const CONSTELLATION_LINES = [${linesFlat.join(',')}];
`;

writeFileSync(OUT, out);
const sizeKB = (Buffer.byteLength(out) / 1024).toFixed(1);
console.log(`wrote ${OUT} (${sizeKB} KB, ${stars.length} stars, ${lines.length} segments)`);
