// Re-verify pole-star epochs using the EXACT fixed code.
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const J2000_JD = 2451545.0;
const PRECESSION_PERIOD_YEARS = 25772;
const _ECLIPTIC_POLE_J2000 = (() => {
  const eps = 23.4392911 * Math.PI / 180;
  return [0, -Math.sin(eps), Math.cos(eps)];
})();

function _periodicPrecessionMatrix(jdTT) {
  const dyr = (jdTT - J2000_JD) / 365.25;
  const theta = 2 * Math.PI * dyr / PRECESSION_PERIOD_YEARS;  // <-- fixed
  const [ex, ey, ez] = _ECLIPTIC_POLE_J2000;
  const c = Math.cos(theta), s = Math.sin(theta), oc = 1 - c;
  return [
    c + ex*ex*oc,        ex*ey*oc - ez*s,    ex*ez*oc + ey*s,
    ey*ex*oc + ez*s,     c + ey*ey*oc,       ey*ez*oc - ex*s,
    ez*ex*oc - ey*s,     ez*ey*oc + ex*s,    c + ez*ez*oc
  ];
}

function dist(M, raDeg, decDeg) {
  const ra = raDeg*D2R, dec = decDeg*D2R;
  const cd = Math.cos(dec);
  const x = cd*Math.cos(ra), y = cd*Math.sin(ra), z = Math.sin(dec);
  const z_date = M[6]*x + M[7]*y + M[8]*z;
  return Math.acos(Math.max(-1, Math.min(1, z_date))) * R2D;
}

// Authoritative pole-star closest approaches (from standard astronomy refs):
const checks = [
  { name: 'Polaris',   ra: 37.946,  dec: 89.264,  refYr: 2102,  refDist: 0.45 },
  { name: 'Thuban',    ra: 211.097, dec: 64.376,  refYr: -2787, refDist: 0.10 },
  { name: 'Vega',      ra: 279.235, dec: 38.784,  refYr: 13727, refDist: 4.66 },
  { name: 'Errai',     ra: 354.838, dec: 77.633,  refYr: 4000,  refDist: 1.9 },
  { name: 'Alderamin', ra: 319.645, dec: 62.586,  refYr: 7500,  refDist: 2.5 },
  { name: 'Deneb',     ra: 310.358, dec: 45.280,  refYr: 9800,  refDist: 7.0 },
];

console.log('Star      | ref epoch | code at ref | code closest    | err (yr) | err (deg)');
console.log('----------|-----------|-------------|------------------|----------|----------');
for (const c of checks) {
  const refDyr = c.refYr - 2000;
  const refDist = dist(_periodicPrecessionMatrix(J2000_JD + refDyr*365.25), c.ra, c.dec);
  let bestDist = 999, bestDyr = null;
  for (let dyr = -13500; dyr <= 13500; dyr += 1) {
    const d = dist(_periodicPrecessionMatrix(J2000_JD + dyr*365.25), c.ra, c.dec);
    if (d < bestDist) { bestDist = d; bestDyr = dyr; }
  }
  const yrErr = (bestDyr + 2000) - c.refYr;
  const distErr = bestDist - c.refDist;
  console.log(
    `${c.name.padEnd(9)} | ${String(c.refYr).padStart(7)}   | ${refDist.toFixed(2).padStart(8)}°   | yr ${String(bestDyr+2000).padStart(6)} (${bestDist.toFixed(2).padStart(5)}°) | ${yrErr >= 0 ? '+' : ''}${yrErr} yr   | ${(distErr >= 0 ? '+' : '') + distErr.toFixed(2)}°`
  );
}

// Snapshot: pole distance for each star at year 13726 CE — what the user
// will see when they click the "+13 726 CE Vega" preset.
console.log('\n=== Snapshot at year 13727 CE (Vega preset) ===');
const M = _periodicPrecessionMatrix(J2000_JD + 11727*365.25);
for (const c of checks) {
  console.log(`  ${c.name.padEnd(9)} ${dist(M, c.ra, c.dec).toFixed(2)}° from pole`);
}
