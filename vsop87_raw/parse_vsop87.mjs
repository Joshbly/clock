#!/usr/bin/env node
// VSOP87B parser → compact JS data arrays
//
// VSOP87B format:
//   Each file has multiple series blocks. Each block starts with a header line
//   like " VSOP87 VERSION B2    MERCURY   VARIABLE 1 (LBR)       *T**0   1583 TERMS"
//   Variable: 1=L (longitude rad), 2=B (latitude rad), 3=R (distance AU)
//   T-power: 0..5 (T = Julian millennia from J2000)
//
//   Each data line ends with 5 numbers: S, K, A, B, C
//   Term value = A · cos(B + C·t)
//
//   Total contribution = Σ_n  T^n · Σ_i (A_ni · cos(B_ni + C_ni · t))
//
// We truncate per (variable, T-power) group by keeping only terms whose
// amplitude A is above a threshold (in the unit appropriate to that series).
//
// Output: JS data file with VSOP87 = { mercury: { L: [[...], [...], ...], B: [...], R: [...] }, ... }

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const RAW_DIR = '/Users/joshuablyskal/clock/vsop87_raw';
const OUT_FILE = '/Users/joshuablyskal/clock/vsop87_data.js';

// Threshold for keeping terms (in radians for L, B; in AU for R)
// Lower threshold = more terms = larger file but more accuracy
// 1e-7 rad ≈ 0.02 arcsec
// 1e-6 rad ≈ 0.2 arcsec
// 1e-5 rad ≈ 2 arcsec
// 1e-4 rad ≈ 20 arcsec

// Per-planet thresholds tuned for ~1 arcsec accuracy at the inner planets
// and accepting a bit more error for the outer (which barely move anyway)
const PLANET_FILES = {
  mercury: 'VSOP87B.mer',
  venus:   'VSOP87B.ven',
  earth:   'VSOP87B.ear',
  mars:    'VSOP87B.mar',
  jupiter: 'VSOP87B.jup',
  saturn:  'VSOP87B.sat',
  uranus:  'VSOP87B.ura',
  neptune: 'VSOP87B.nep'
};

// Threshold per planet (in radians for L,B; in AU for R)
// 0 means: keep ALL terms — full published VSOP87B precision.
// The full series is ~35,000 terms total → ~3MB embedded.
const THRESHOLD = 0;

function parseVSOP87File(path) {
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n');

  // result structure: { L: [T0_terms, T1_terms, ...], B: [...], R: [...] }
  // each T_terms is array of [A, B, C]
  const out = { L: [], B: [], R: [] };

  let currentVar = null;
  let currentT = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    if (line.includes('VSOP87 VERSION')) {
      // Header line — parse VARIABLE and T**N
      const varMatch = line.match(/VARIABLE\s+(\d+)/);
      const tMatch = line.match(/\*T\*\*(\d+)/);
      if (!varMatch || !tMatch) continue;
      const v = parseInt(varMatch[1]);
      currentT = parseInt(tMatch[1]);
      currentVar = ['L', 'B', 'R'][v - 1];
      // ensure we have a slot for this T-power
      while (out[currentVar].length <= currentT) out[currentVar].push([]);
      continue;
    }

    if (currentVar === null) continue;

    // Data line — last 3 numbers are A, B, C
    const tokens = line.trim().split(/\s+/);
    if (tokens.length < 3) continue;
    const A = parseFloat(tokens[tokens.length - 3]);
    const B = parseFloat(tokens[tokens.length - 2]);
    const C = parseFloat(tokens[tokens.length - 1]);
    if (!isFinite(A) || !isFinite(B) || !isFinite(C)) continue;

    out[currentVar][currentT].push([A, B, C]);
  }

  return out;
}

function truncate(series, threshold) {
  // series[var][Tpower] is array of [A, B, C]
  // Keep terms where |A| > threshold
  const result = {};
  for (const v of ['L', 'B', 'R']) {
    result[v] = series[v].map(terms =>
      terms.filter(([A]) => Math.abs(A) > threshold)
    );
  }
  return result;
}

function countTerms(series) {
  let total = 0;
  for (const v of ['L', 'B', 'R']) {
    for (const terms of series[v]) total += terms.length;
  }
  return total;
}

function format(planetData) {
  const lines = [];
  lines.push('{');
  for (const v of ['L', 'B', 'R']) {
    lines.push(`  ${v}: [`);
    for (const tArr of planetData[v]) {
      const inner = tArr.map(([A, B, C]) => {
        // round to reasonable precision to save bytes
        const a = A.toExponential(9).replace(/e\+?(-?)0?(\d)/, 'e$1$2');
        const b = B.toFixed(9);
        const c = C.toFixed(9);
        return `[${a},${b},${c}]`;
      }).join(',');
      lines.push(`    [${inner}],`);
    }
    lines.push('  ],');
  }
  lines.push('}');
  return lines.join('\n');
}

const allPlanets = {};
for (const [planet, file] of Object.entries(PLANET_FILES)) {
  const path = join(RAW_DIR, file);
  console.log(`Parsing ${file}...`);
  const series = parseVSOP87File(path);
  const beforeCount = countTerms(series);
  const truncated = truncate(series, THRESHOLD);
  const afterCount = countTerms(truncated);
  console.log(`  ${planet}: ${beforeCount} → ${afterCount} terms`);
  allPlanets[planet] = truncated;
}

// Generate output JS file
let output = '// VSOP87B — Truncated heliocentric ecliptic spherical coordinates\n';
output += '// Source: IMCCE ftp://ftp.imcce.fr/pub/ephem/planets/vsop87/\n';
output += '// Each entry: [A, B, C] giving term A·cos(B + C·t), t in Julian millennia from J2000\n';
output += `// Threshold: ${THRESHOLD} (truncates terms below this amplitude)\n`;
output += `// Generated: ${new Date().toISOString()}\n\n`;
output += 'const VSOP87 = {\n';
for (const [planet, data] of Object.entries(allPlanets)) {
  output += `  ${planet}: ${format(data)},\n`;
}
output += '};\n';

writeFileSync(OUT_FILE, output);

const sizeKB = (output.length / 1024).toFixed(1);
console.log(`\nWrote ${OUT_FILE} (${sizeKB} KB)`);
