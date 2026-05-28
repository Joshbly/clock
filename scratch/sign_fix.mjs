// Verify the sign-flip fix on _periodicPrecessionMatrix.
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const J2000_JD = 2451545.0;
const PRECESSION_PERIOD_YEARS = 25772;
const EPS = 23.4392911 * D2R;
const _ECLIPTIC_POLE_J2000 = [0, -Math.sin(EPS), Math.cos(EPS)];

// Variant A: current code (theta = -2π dyr/T)
function M_A(jdTT) {
  const dyr = (jdTT - J2000_JD) / 365.25;
  const theta = -2 * Math.PI * dyr / PRECESSION_PERIOD_YEARS;
  return rodriguesMatrix(theta);
}

// Variant B: proposed fix (theta = +2π dyr/T)
function M_B(jdTT) {
  const dyr = (jdTT - J2000_JD) / 365.25;
  const theta = +2 * Math.PI * dyr / PRECESSION_PERIOD_YEARS;
  return rodriguesMatrix(theta);
}

function rodriguesMatrix(theta) {
  const [ex, ey, ez] = _ECLIPTIC_POLE_J2000;
  const c = Math.cos(theta), s = Math.sin(theta), oc = 1 - c;
  return [
    c + ex*ex*oc,        ex*ey*oc - ez*s,    ex*ez*oc + ey*s,
    ey*ex*oc + ez*s,     c + ey*ey*oc,       ey*ez*oc - ex*s,
    ez*ex*oc - ey*s,     ez*ey*oc + ex*s,    c + ez*ez*oc
  ];
}

function poleDist(M, raDeg, decDeg) {
  const ra = raDeg*D2R, dec = decDeg*D2R;
  const cd = Math.cos(dec);
  const x = cd*Math.cos(ra), y = cd*Math.sin(ra), z = Math.sin(dec);
  const z_date = M[6]*x + M[7]*y + M[8]*z;
  return Math.acos(Math.max(-1, Math.min(1, z_date))) * R2D;
}

// Known pole-star epochs (well-established astronomy):
//   Polaris closest:   ~2102 CE     (~ dyr +102, ~0.46°)
//   Thuban closest:    ~2787 BCE    (~ dyr -4787, ~0.1°)
//   Vega closest:      ~13727 CE    (~ dyr +11727, ~4.66°)
//   Kochab closest:    ~1083 CE     (~ dyr -917, ~7°)
//   Errai closest:     ~4000 CE     (~ dyr +2000, ~3°)
//   Alderamin closest: ~7500 CE     (~ dyr +5500, ~3°)

const STARS = [
  { name: 'Polaris',   raDeg: 37.946266,  decDeg: 89.264111,  expectedDyr:  102 },
  { name: 'Thuban',    raDeg: 211.0973,   decDeg: 64.3758,    expectedDyr: -4787 },
  { name: 'Vega',      raDeg: 279.234735, decDeg: 38.783689,  expectedDyr: 11727 },
  { name: 'Kochab',    raDeg: 222.6764,   decDeg: 74.155505,  expectedDyr: -917 },
  { name: 'Errai',     raDeg: 354.838,    decDeg: 77.633,     expectedDyr: 2000 },
  { name: 'Alderamin', raDeg: 319.6446,   decDeg: 62.585572,  expectedDyr: 5500 },
];

function scanMin(distFn) {
  let bestDist = 999, bestDyr = null;
  for (let dyr = -13500; dyr <= 13500; dyr += 5) {
    const d = distFn(dyr);
    if (d < bestDist) { bestDist = d; bestDyr = dyr; }
  }
  return { bestDyr, bestDist };
}

console.log('Star      | Expected dyr | Variant A (current) | Variant B (sign-flip) | Verdict');
console.log('----------|--------------|---------------------|------------------------|--------');
for (const s of STARS) {
  const a = scanMin(dyr => poleDist(M_A(J2000_JD + dyr*365.25), s.raDeg, s.decDeg));
  const b = scanMin(dyr => poleDist(M_B(J2000_JD + dyr*365.25), s.raDeg, s.decDeg));
  const aOk = Math.abs(a.bestDyr - s.expectedDyr) < 500;
  const bOk = Math.abs(b.bestDyr - s.expectedDyr) < 500;
  const verdict = (!aOk && bOk) ? 'B fixes' : (aOk && !bOk) ? 'A correct' : (aOk && bOk) ? 'both' : 'neither';
  console.log(`${s.name.padEnd(9)} |  ${String(s.expectedDyr).padStart(11)} | dyr=${String(a.bestDyr).padStart(6)} (${a.bestDist.toFixed(2)}°)    | dyr=${String(b.bestDyr).padStart(6)} (${b.bestDist.toFixed(2)}°)     | ${verdict}`);
}

// Also: at year +13727, what's the pole-Vega distance under each variant?
console.log('\nAt year 13727 CE (dyr=+11727):');
console.log(`  Variant A (current): Vega at ${poleDist(M_A(J2000_JD + 11727*365.25), 279.234735, 38.783689).toFixed(2)}° from pole`);
console.log(`  Variant B (fix):     Vega at ${poleDist(M_B(J2000_JD + 11727*365.25), 279.234735, 38.783689).toFixed(2)}° from pole`);
console.log('  Expected: ~4.66°');
