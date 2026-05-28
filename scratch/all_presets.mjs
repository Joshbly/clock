// Verify every preset button: what slider offset is "correct"?
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

const STARS = {
  Polaris:   { raDeg: 37.946266,  decDeg: 89.264111 },
  Thuban:    { raDeg: 211.0973,   decDeg: 64.3758 },
  Kochab:    { raDeg: 222.6764,   decDeg: 74.155505 },
  Alderamin: { raDeg: 319.6446,   decDeg: 62.585572 },
  Errai:     { raDeg: 354.838,    decDeg: 77.633 },
  Vega:      { raDeg: 279.234735, decDeg: 38.783689 },
  Deneb:     { raDeg: 310.358,    decDeg: 45.280 },
};

// Find closest approach in BOTH directions
function closestApproaches(starName) {
  const s = STARS[starName];
  let bestForward = { yr: null, d: 999 };
  let bestBackward = { yr: null, d: 999 };
  for (let yr = -15000; yr <= 30000; yr += 5) {
    const M = M_periodic(J2000_JD + (yr-2000)*365.25);
    const d = poleDist(M, s.raDeg, s.decDeg);
    if (yr >= 2026 && d < bestForward.d) bestForward = { yr, d };
    if (yr < 2026 && d < bestBackward.d) bestBackward = { yr, d };
  }
  return { forward: bestForward, backward: bestBackward };
}

// Updated preset values
const presets = [
  { yr: -14000, label: '−11 975 BCE Vega last near pole' },
  { yr:  -4850, label: '−2825 BCE Thuban · pyramids built' },
  { yr:  -3125, label: '−1100 BCE Kochab nearest pole' },
  { yr:      0, label: 'now Polaris' },
  { yr:   2000, label: '+4026 CE Errai γ Cep' },
  { yr:   5500, label: '+7526 CE Alderamin α Cep' },
  { yr:  11700, label: '+13 726 CE Vega ★' },
  { yr:  25772, label: '+27 798 CE full cycle · Polaris returns' },
];

console.log('=== Current presets vs. closest approach ===');
console.log('preset offset | display label                  | nearest star at that yr | actual closest-approach yr for that star | slider offset for that yr');
console.log('---');
for (const p of presets) {
  const yr = 2026 + p.yr;
  const M = M_periodic(J2000_JD + (yr-2000)*365.25);
  const dists = Object.entries(STARS).map(([n,s]) => ({n, d: poleDist(M, s.raDeg, s.decDeg)})).sort((a,b)=>a.d-b.d);
  const nearest = dists[0];
  const yrLabel = yr < 0 ? `${Math.abs(yr)+1} BCE` : `${yr} CE`;
  console.log(`  ${String(p.yr).padStart(7)}     | ${p.label.padEnd(31)} | ${nearest.n.padEnd(9)} ${nearest.d.toFixed(1)}° at ${yrLabel.padStart(11)}`);
}

console.log('\n=== For each star, optimal slider offset (year of closest approach) ===');
for (const name of Object.keys(STARS)) {
  const ap = closestApproaches(name);
  const fwdLabel = ap.forward.yr < 0 ? `${Math.abs(ap.forward.yr)+1} BCE` : `${ap.forward.yr} CE`;
  const bwdLabel = ap.backward.yr < 0 ? `${Math.abs(ap.backward.yr)+1} BCE` : `${ap.backward.yr} CE`;
  console.log(`${name.padEnd(10)} forward: ${fwdLabel.padStart(11)} (offset ${(ap.forward.yr-2026).toString().padStart(6)}, ${ap.forward.d.toFixed(2)}°)   backward: ${bwdLabel.padStart(11)} (offset ${(ap.backward.yr-2026).toString().padStart(6)}, ${ap.backward.d.toFixed(2)}°)`);
}
