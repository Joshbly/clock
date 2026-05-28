// Was the user seeing Vega "inside the circle" at 15901 CE?
// What's actually going on?
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const J2000_JD = 2451545.0;
const PRECESSION_PERIOD_YEARS = 25772;
const _ECLIPTIC_POLE_J2000 = (() => {
  const eps = 23.4392911 * Math.PI / 180;
  return [0, -Math.sin(eps), Math.cos(eps)];
})();

function _periodicPrecessionMatrix(jdTT) {
  const dyr = (jdTT - J2000_JD) / 365.25;
  const theta = 2 * Math.PI * dyr / PRECESSION_PERIOD_YEARS;
  const [ex, ey, ez] = _ECLIPTIC_POLE_J2000;
  const c = Math.cos(theta), s = Math.sin(theta), oc = 1 - c;
  return [
    c + ex*ex*oc,        ex*ey*oc - ez*s,    ex*ez*oc + ey*s,
    ey*ex*oc + ez*s,     c + ey*ey*oc,       ey*ez*oc - ex*s,
    ez*ex*oc - ey*s,     ez*ey*oc + ex*s,    c + ez*ez*oc
  ];
}

// Vega
const ra = 279.234735 * D2R, dec = 38.783689 * D2R;
const cd = Math.cos(dec);
const xJ = cd*Math.cos(ra), yJ = cd*Math.sin(ra), zJ = Math.sin(dec);

// Sweep around the slider's whole range, print Vega's pole distance & date-RA
console.log('year   | dist from pole | date Dec | date RA  | trail label position');
console.log('-------|----------------|----------|----------|---------------------');
for (let yr = 12000; yr <= 20000; yr += 200) {
  const dyr = yr - 2000;
  const M = _periodicPrecessionMatrix(J2000_JD + dyr*365.25);
  const xD = M[0]*xJ + M[1]*yJ + M[2]*zJ;
  const yD = M[3]*xJ + M[4]*yJ + M[5]*zJ;
  const zD = M[6]*xJ + M[7]*yJ + M[8]*zJ;
  const decD = Math.asin(zD) * R2D;
  const raD  = ((Math.atan2(yD, xD) * R2D) + 360) % 360;
  const distPole = 90 - decD;
  console.log(`${String(yr).padStart(6)} | ${distPole.toFixed(2).padStart(13)}° | ${decD.toFixed(2).padStart(7)}° | ${raD.toFixed(1).padStart(6)}° |`);
}

// Now: where is the TRAIL LABEL for "Vega" placed on screen at year 15901?
// That label sits at the point on the precession circle closest to Vega
// (in J2000 frame). Per precessionTrailLabels(), this is a fixed J2000
// point — let me find it.
console.log('\n=== Trail-label position for Vega in J2000 frame ===');
let bestDot = -2, bestPoint = null;
for (let dyr = 0; dyr < PRECESSION_PERIOD_YEARS; dyr += 50) {
  const M = _periodicPrecessionMatrix(J2000_JD + dyr*365.25);
  // Pole in J2000 = third row of M
  const px = M[6], py = M[7], pz = M[8];
  const dot = px*xJ + py*yJ + pz*zJ;
  if (dot > bestDot) {
    bestDot = dot;
    bestPoint = { dyr, raDeg: Math.atan2(py, px)*R2D, decDeg: Math.asin(pz)*R2D };
  }
}
const labelDist = Math.acos(Math.max(-1, Math.min(1, bestDot))) * R2D;
console.log(`Vega label sits at J2000 RA=${((bestPoint.raDeg+360)%360).toFixed(2)}°, Dec=${bestPoint.decDeg.toFixed(2)}°`);
console.log(`This is ${labelDist.toFixed(2)}° from Vega in J2000.`);
console.log(`Corresponds to dyr=${bestPoint.dyr} (year ${2000+bestPoint.dyr}).`);

// At year 15901, where does this label appear on screen relative to the
// celestial pole? The label is at fixed J2000. The pole at year 15901
// in date frame appears at "true north" on screen (alt = observer lat).
// What's the angular distance on screen between (a) the Vega trail label
// and (b) the date-frame pole?
console.log('\n=== At year 15901 CE ===');
const dyr15901 = 13901;
const M = _periodicPrecessionMatrix(J2000_JD + dyr15901*365.25);

// (a) the trail label's J2000 coords transformed to date frame
const labelRaJ = bestPoint.raDeg * D2R, labelDecJ = bestPoint.decDeg * D2R;
const lcd = Math.cos(labelDecJ);
const lxJ = lcd*Math.cos(labelRaJ), lyJ = lcd*Math.sin(labelRaJ), lzJ = Math.sin(labelDecJ);
const lxD = M[0]*lxJ + M[1]*lyJ + M[2]*lzJ;
const lyD = M[3]*lxJ + M[4]*lyJ + M[5]*lzJ;
const lzD = M[6]*lxJ + M[7]*lyJ + M[8]*lzJ;
const labelDateDec = Math.asin(lzD) * R2D;
const labelDateRa  = ((Math.atan2(lyD, lxD)*R2D)+360)%360;
console.log(`Vega trail label in date frame: Dec=${labelDateDec.toFixed(2)}°, RA=${labelDateRa.toFixed(2)}°`);
console.log(`  → ${(90-labelDateDec).toFixed(2)}° from the date-frame pole`);

// (b) Vega itself in date frame at year 15901
const vxD = M[0]*xJ + M[1]*yJ + M[2]*zJ;
const vyD = M[3]*xJ + M[4]*yJ + M[5]*zJ;
const vzD = M[6]*xJ + M[7]*yJ + M[8]*zJ;
const vegaDateDec = Math.asin(vzD) * R2D;
const vegaDateRa  = ((Math.atan2(vyD, vxD)*R2D)+360)%360;
console.log(`Vega itself in date frame: Dec=${vegaDateDec.toFixed(2)}°, RA=${vegaDateRa.toFixed(2)}°`);
console.log(`  → ${(90-vegaDateDec).toFixed(2)}° from the date-frame pole`);

// Angular separation between trail label and Vega (in date frame)
const cosS = lzD*vzD + Math.cos(labelDateDec*D2R)*Math.cos(vegaDateDec*D2R)*Math.cos((labelDateRa-vegaDateRa)*D2R);
const sep = Math.acos(Math.max(-1, Math.min(1, cosS)))*R2D;
console.log(`\nAngular separation between Vega trail-label and Vega star itself: ${sep.toFixed(2)}°`);
console.log(`(This should be constant ~${labelDist.toFixed(2)}° regardless of epoch — they're both fixed in J2000)`);
