// What's near the pole at year 1026 CE? When was Kochab actually
// nearest the pole?
const D2R = Math.PI/180, R2D = 180/Math.PI;
const J2000_JD = 2451545.0;
const PRECESSION_PERIOD_YEARS = 25772;
const _ECLIPTIC_POLE_J2000 = (() => {
  const eps = 23.4392911 * D2R;
  return [0, -Math.sin(eps), Math.cos(eps)];
})();

function M_periodic(jdTT) {
  const dyr = (jdTT - J2000_JD) / 365.25;
  const theta = 2 * Math.PI * dyr / PRECESSION_PERIOD_YEARS;
  const [ex, ey, ez] = _ECLIPTIC_POLE_J2000;
  const c = Math.cos(theta), s = Math.sin(theta), oc = 1 - c;
  return [
    c+ex*ex*oc,    ex*ey*oc-ez*s, ex*ez*oc+ey*s,
    ey*ex*oc+ez*s, c+ey*ey*oc,    ey*ez*oc-ex*s,
    ez*ex*oc-ey*s, ez*ey*oc+ex*s, c+ez*ez*oc
  ];
}

function poleDist(M, raDeg, decDeg) {
  const ra = raDeg*D2R, dec = decDeg*D2R;
  const cd = Math.cos(dec);
  const x = cd*Math.cos(ra), y = cd*Math.sin(ra), z = Math.sin(dec);
  const zD = M[6]*x + M[7]*y + M[8]*z;
  return Math.acos(Math.max(-1, Math.min(1, zD))) * R2D;
}

const STARS = [
  { name: 'Polaris',   raDeg: 37.946266,  decDeg: 89.264111,  mag: 1.98 },
  { name: 'Thuban',    raDeg: 211.0973,   decDeg: 64.3758,    mag: 3.65 },
  { name: 'Kochab',    raDeg: 222.6764,   decDeg: 74.155505,  mag: 2.07 },
  { name: 'Pherkad',   raDeg: 230.182,    decDeg: 71.834,     mag: 3.05 },  // Kochab's "Guard" partner
  { name: 'Alderamin', raDeg: 319.6446,   decDeg: 62.585572,  mag: 2.45 },
  { name: 'Errai',     raDeg: 354.838,    decDeg: 77.633,     mag: 3.21 },
  { name: 'Vega',      raDeg: 279.234735, decDeg: 38.783689,  mag: 0.03 },
  { name: 'Deneb',     raDeg: 310.358,    decDeg: 45.280,     mag: 1.25 },
];

// What's near the pole at year 1026 CE?
console.log('=== Year 1026 CE (the value I currently label "Kochab era") ===');
console.log('   slider offset = -1000 yr from now (2026)');
console.log('   dyr from J2000 = ' + (1026 - 2000));
const M_1026 = M_periodic(J2000_JD + (1026-2000)*365.25);
const at1026 = STARS.map(s => ({...s, d: poleDist(M_1026, s.raDeg, s.decDeg)})).sort((a,b)=>a.d-b.d);
for (const s of at1026.slice(0, 6)) {
  console.log(`   ${s.name.padEnd(10)} ${s.d.toFixed(2)}° from pole  (mag ${s.mag})`);
}

// When is Kochab actually closest to the pole?
console.log('\n=== Kochab\'s actual closest-approach scan ===');
const kochab = STARS.find(s => s.name === 'Kochab');
let bestYr = null, bestDist = 999;
for (let yr = -5000; yr <= 3000; yr += 5) {
  const M = M_periodic(J2000_JD + (yr-2000)*365.25);
  const d = poleDist(M, kochab.raDeg, kochab.decDeg);
  if (d < bestDist) { bestDist = d; bestYr = yr; }
}
console.log(`   Closest approach: year ${bestYr} (${bestYr < 0 ? Math.abs(bestYr)+1+' BCE' : bestYr+' CE'})`);
console.log(`   At distance: ${bestDist.toFixed(2)}°`);
console.log(`   Slider offset to land here: ${bestYr - 2026}`);

// Also Pherkad — the other "Guard"
console.log('\n=== Pherkad (the other "Guard") ===');
const pherkad = STARS.find(s => s.name === 'Pherkad');
let bestYrP = null, bestDistP = 999;
for (let yr = -5000; yr <= 3000; yr += 5) {
  const M = M_periodic(J2000_JD + (yr-2000)*365.25);
  const d = poleDist(M, pherkad.raDeg, pherkad.decDeg);
  if (d < bestDistP) { bestDistP = d; bestYrP = yr; }
}
console.log(`   Closest approach: year ${bestYrP} (${bestYrP < 0 ? Math.abs(bestYrP)+1+' BCE' : bestYrP+' CE'})`);
console.log(`   At distance: ${bestDistP.toFixed(2)}°`);

// What's the nearest NAV star at the Kochab-era closest approach?
console.log('\n=== At Kochab\'s closest-approach year (' + bestYr + ') ===');
const M_bestYr = M_periodic(J2000_JD + (bestYr-2000)*365.25);
const atBest = STARS.map(s => ({...s, d: poleDist(M_bestYr, s.raDeg, s.decDeg)})).sort((a,b)=>a.d-b.d);
for (const s of atBest.slice(0, 6)) {
  console.log(`   ${s.name.padEnd(10)} ${s.d.toFixed(2)}° from pole  (mag ${s.mag})`);
}

// Sanity: Kochab vs Polaris over time
console.log('\n=== Kochab vs Polaris over millennia ===');
console.log('year         | Kochab°  | Polaris° | who\'s closer & by how much');
for (let yr = -3000; yr <= 2200; yr += 200) {
  const M = M_periodic(J2000_JD + (yr-2000)*365.25);
  const k = poleDist(M, kochab.raDeg, kochab.decDeg);
  const p = poleDist(M, STARS[0].raDeg, STARS[0].decDeg);
  const winner = k < p ? `Kochab leads by ${(p-k).toFixed(1)}°` : `Polaris leads by ${(k-p).toFixed(1)}°`;
  const yrLabel = yr < 0 ? `${Math.abs(yr)+1} BCE` : `${yr} CE`;
  console.log(`${yrLabel.padStart(10)}   | ${k.toFixed(2).padStart(6)}   | ${p.toFixed(2).padStart(6)}   | ${winner}`);
}
