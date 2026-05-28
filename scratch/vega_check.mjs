// Scratchpad — verify the periodic precession matrix from index.html
// against the known fact that Vega is closest to the celestial pole
// around 13,727 CE at a distance of ~4.6°.

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const J2000_JD = 2451545.0;

// ---- COPY of the exact code from index.html ----
const PRECESSION_PERIOD_YEARS = 25772;
const _ECLIPTIC_POLE_J2000 = (() => {
  const eps = 23.4392911 * Math.PI / 180;
  return [0, -Math.sin(eps), Math.cos(eps)];
})();

function _periodicPrecessionMatrix(jdTT) {
  const dyr = (jdTT - J2000_JD) / 365.25;
  const theta = -2 * Math.PI * dyr / PRECESSION_PERIOD_YEARS;
  const [ex, ey, ez] = _ECLIPTIC_POLE_J2000;
  const c = Math.cos(theta), s = Math.sin(theta), oc = 1 - c;
  return [
    c + ex*ex*oc,        ex*ey*oc - ez*s,    ex*ez*oc + ey*s,
    ey*ex*oc + ez*s,     c + ey*ey*oc,       ey*ez*oc - ex*s,
    ez*ex*oc - ey*s,     ez*ey*oc + ex*s,    c + ez*ez*oc
  ];
}

// ---- Vega J2000 coords (from NAV_STARS in index.html) ----
const vegaRaDeg  = 279.234735;
const vegaDecDeg = 38.783689;

function angDistDeg(ra1d, dec1d, ra2d, dec2d) {
  const r1 = ra1d * D2R, d1 = dec1d * D2R;
  const r2 = ra2d * D2R, d2 = dec2d * D2R;
  const c = Math.sin(d1)*Math.sin(d2) + Math.cos(d1)*Math.cos(d2)*Math.cos(r1-r2);
  return Math.acos(Math.max(-1, Math.min(1, c))) * R2D;
}

// ---- TEST 1: code-as-written, distance Vega → pole at year 13726 CE ----
// In code: findCurrentPoleStar takes a star at J2000 (ra,dec), unit-vectors it,
// applies M to get z-component in date frame, then distance = acos(z_date).
function poleDistFromCode(dyr, raDeg, decDeg) {
  const jdTT = J2000_JD + dyr * 365.25;
  const M = _periodicPrecessionMatrix(jdTT);
  const ra = raDeg * D2R, dec = decDeg * D2R;
  const cd = Math.cos(dec);
  const x = cd*Math.cos(ra), y = cd*Math.sin(ra), z = Math.sin(dec);
  const z_date = M[6]*x + M[7]*y + M[8]*z;
  return Math.acos(Math.max(-1, Math.min(1, z_date))) * R2D;
}

console.log('===== TEST 1: code as-written =====');
for (const dyr of [-12000, 0, 5000, 11700, 13727, 25772]) {
  console.log(`dyr=${String(dyr).padStart(6)}: code says Vega is ${poleDistFromCode(dyr, vegaRaDeg, vegaDecDeg).toFixed(2)}° from pole`);
}

// ---- TEST 2: the same physics computed an OTHER way ----
// The date-frame pole, expressed in J2000 equatorial coords, IS the third row
// of M (i.e., M[6], M[7], M[8]). Then angular distance to a star at J2000
// (ra,dec) is just the dot product.
function poleDistDirect(dyr, raDeg, decDeg) {
  const jdTT = J2000_JD + dyr * 365.25;
  const M = _periodicPrecessionMatrix(jdTT);
  // date pole in J2000 = third row of M (since M takes J2000 -> date,
  // M^T takes date -> J2000, and date z-axis is (0,0,1) in date frame,
  // so date z-axis in J2000 = M^T · (0,0,1) = third *column* of M^T = third *row* of M)
  const polex = M[6], poley = M[7], polez = M[8];
  const ra = raDeg * D2R, dec = decDeg * D2R;
  const cd = Math.cos(dec);
  const sx = cd*Math.cos(ra), sy = cd*Math.sin(ra), sz = Math.sin(dec);
  const dot = polex*sx + poley*sy + polez*sz;
  return Math.acos(Math.max(-1, Math.min(1, dot))) * R2D;
}

console.log('\n===== TEST 2: direct dot product (should match TEST 1) =====');
for (const dyr of [-12000, 0, 5000, 11700, 13727, 25772]) {
  console.log(`dyr=${String(dyr).padStart(6)}: direct says Vega is ${poleDistDirect(dyr, vegaRaDeg, vegaDecDeg).toFixed(2)}° from pole`);
}

// ---- TEST 3: PURE FIRST-PRINCIPLES PHYSICS ----
// At J2000 the North Celestial Pole points at (0,0,1) in equatorial J2000.
// Precession: this vector rotates around the ecliptic pole at constant rate,
// in the SAME direction as the precession of equinoxes (retrograde).
//
// Let's directly compute the date-frame pole in J2000 using Rodrigues
// rotation of (0,0,1) around the ecliptic pole by angle theta_physical.
// The QUESTION is: what's the sign of theta?
//
// Precession is "retrograde" — viewed from above the north ecliptic pole,
// the celestial pole rotates clockwise. In a right-handed coord system
// where the ecliptic pole points in the +e direction, that's a NEGATIVE
// rotation (sin θ < 0 for positive dyr).

function rodriguesRotateVec(v, axis, theta) {
  const [vx, vy, vz] = v;
  const [kx, ky, kz] = axis;
  const c = Math.cos(theta), s = Math.sin(theta);
  // v_rot = v cos θ + (k × v) sin θ + k (k · v)(1 - cos θ)
  const cross = [ky*vz - kz*vy, kz*vx - kx*vz, kx*vy - ky*vx];
  const kdotv = kx*vx + ky*vy + kz*vz;
  return [
    vx*c + cross[0]*s + kx*kdotv*(1-c),
    vy*c + cross[1]*s + ky*kdotv*(1-c),
    vz*c + cross[2]*s + kz*kdotv*(1-c)
  ];
}

function poleDistRodrigues(dyr, raDeg, decDeg, sign) {
  // sign = -1 means rotate (0,0,1) by negative angle (code convention)
  // sign = +1 means positive angle (alternative)
  const theta = sign * 2 * Math.PI * dyr / PRECESSION_PERIOD_YEARS;
  const pole = rodriguesRotateVec([0,0,1], _ECLIPTIC_POLE_J2000, theta);
  const ra = raDeg * D2R, dec = decDeg * D2R;
  const cd = Math.cos(dec);
  const sx = cd*Math.cos(ra), sy = cd*Math.sin(ra), sz = Math.sin(dec);
  const dot = pole[0]*sx + pole[1]*sy + pole[2]*sz;
  return { dist: Math.acos(Math.max(-1, Math.min(1, dot))) * R2D, pole };
}

console.log('\n===== TEST 3: pure Rodrigues, both signs =====');
for (const dyr of [-12000, 0, 5000, 11700, 13727, 25772]) {
  const neg = poleDistRodrigues(dyr, vegaRaDeg, vegaDecDeg, -1);
  const pos = poleDistRodrigues(dyr, vegaRaDeg, vegaDecDeg, +1);
  console.log(`dyr=${String(dyr).padStart(6)}: sign=-1 → ${neg.dist.toFixed(2)}°,  sign=+1 → ${pos.dist.toFixed(2)}°`);
}

// ---- TEST 4: scan one full cycle to find Vega's actual closest approach
// according to both code AND direct physics. The right answer should be
// near +11700 (13726 CE) and the wrong answer somewhere else. ----
function scanMin(fn) {
  let bestDist = 999, bestDyr = null;
  for (let dyr = -13000; dyr <= 13000; dyr += 10) {
    const d = fn(dyr);
    if (d < bestDist) { bestDist = d; bestDyr = dyr; }
  }
  return { bestDyr, bestDist };
}

console.log('\n===== TEST 4: scan for Vega closest approach =====');
const codeMin = scanMin(dyr => poleDistFromCode(dyr, vegaRaDeg, vegaDecDeg));
console.log(`CODE says Vega closest approach: dyr=${codeMin.bestDyr} (year ${2000+codeMin.bestDyr}), dist=${codeMin.bestDist.toFixed(2)}°`);

const rodNeg = scanMin(dyr => poleDistRodrigues(dyr, vegaRaDeg, vegaDecDeg, -1).dist);
console.log(`Rodrigues sign=-1: dyr=${rodNeg.bestDyr} (year ${2000+rodNeg.bestDyr}), dist=${rodNeg.bestDist.toFixed(2)}°`);

const rodPos = scanMin(dyr => poleDistRodrigues(dyr, vegaRaDeg, vegaDecDeg, +1).dist);
console.log(`Rodrigues sign=+1: dyr=${rodPos.bestDyr} (year ${2000+rodPos.bestDyr}), dist=${rodPos.bestDist.toFixed(2)}°`);

// ---- TEST 5: check Polaris (should be at pole NOW, i.e. dyr=0) ----
const polRaDeg = 37.946266;
const polDecDeg = 89.264111;
console.log('\n===== TEST 5: Polaris (should be ~0.7° at dyr=0) =====');
for (const dyr of [-50, 0, 50, 100]) {
  console.log(`dyr=${String(dyr).padStart(4)}: code=${poleDistFromCode(dyr, polRaDeg, polDecDeg).toFixed(2)}°  rod(-)=${poleDistRodrigues(dyr,polRaDeg,polDecDeg,-1).dist.toFixed(2)}°  rod(+)=${poleDistRodrigues(dyr,polRaDeg,polDecDeg,+1).dist.toFixed(2)}°`);
}

// ---- TEST 6: check Thuban (should be near pole around -2700 BCE = dyr -4700) ----
const thubRa = 211.0973, thubDec = 64.3758;
console.log('\n===== TEST 6: Thuban (should be ~0° at dyr=-4700) =====');
const codeThub = scanMin(d => poleDistFromCode(d, thubRa, thubDec));
const rodThubNeg = scanMin(d => poleDistRodrigues(d, thubRa, thubDec, -1).dist);
const rodThubPos = scanMin(d => poleDistRodrigues(d, thubRa, thubDec, +1).dist);
console.log(`CODE: closest at dyr=${codeThub.bestDyr}, dist=${codeThub.bestDist.toFixed(2)}°`);
console.log(`rod-: closest at dyr=${rodThubNeg.bestDyr}, dist=${rodThubNeg.bestDist.toFixed(2)}°`);
console.log(`rod+: closest at dyr=${rodThubPos.bestDyr}, dist=${rodThubPos.bestDist.toFixed(2)}°`);
