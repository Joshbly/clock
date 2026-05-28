// What does "Vega inside the circle" mean? Investigate:
//   (a) the celestial pole crosshair (8 px circle around date pole)
//   (b) the dashed gold precession-trail circle
// At what epoch (if any) does Vega's screen position cross either boundary?
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

// Use the same projection as index.html (stereographic from zenith).
const OBS_LAT = 40.7128 * D2R;
const OBS_LON = -74.006 * D2R;
const sinLat = Math.sin(OBS_LAT), cosLat = Math.cos(OBS_LAT);
const W = 700, H = 700, CX = W/2, CY = H/2, R = 330;

// Lock GMST at "now" — May 28, 2026 ~17:30 local = ~21:30 UT
// astroState.jd ≈ 2461189.4 (May 28, 2026 ~21:30 UT)
// gmstDeg from index.html — copy it
function gmstDeg(jd) {
  const T = (jd - 2451545.0) / 36525;
  let g = 280.46061837 + 360.98564736629*(jd - 2451545.0)
        + 0.000387933*T*T - T*T*T/38710000;
  g = ((g % 360) + 360) % 360;
  return g;
}
const JD_NOW = 2461189.4;
const gmstRad = gmstDeg(JD_NOW) * D2R;

function eqToScreen(raRad, decRad) {
  const cdec = Math.cos(decRad), sdec = Math.sin(decRad);
  const H_rad = gmstRad + OBS_LON - raRad;
  const cH = Math.cos(H_rad), sH = Math.sin(H_rad);
  const sinAlt = sinLat * sdec + cosLat * cdec * cH;
  if (sinAlt <= 0) return null;
  const alt = Math.asin(sinAlt);
  const cosA = Math.cos(alt);
  const sinAz = -sH * cdec / cosA;
  const cosAz = (sdec - sinAlt * sinLat) / Math.max(cosA*cosLat, 1e-6);
  const azv = Math.atan2(sinAz, cosAz);
  const rr = R * Math.tan((Math.PI/2 - alt)/2);
  return [CX - rr * Math.sin(azv), CY - rr * Math.cos(azv)];
}

// Project the date-frame pole (always at "true north", screen position fixed)
const poleScreen = eqToScreen(0, Math.PI/2);
console.log(`Date pole on screen: (${poleScreen[0].toFixed(1)}, ${poleScreen[1].toFixed(1)})`);

// Vega J2000
const vegaRa = 279.234735 * D2R, vegaDec = 38.783689 * D2R;
const vcd = Math.cos(vegaDec);
const vxJ = vcd*Math.cos(vegaRa), vyJ = vcd*Math.sin(vegaRa), vzJ = Math.sin(vegaDec);

// The Vega trail label sits at the J2000 trail point closest to Vega.
// That's at J2000 RA=278.26°, Dec=43.56° (per previous computation).
const labRa = 278.26 * D2R, labDec = 43.56 * D2R;
const lcd = Math.cos(labDec);
const lxJ = lcd*Math.cos(labRa), lyJ = lcd*Math.sin(labRa), lzJ = Math.sin(labDec);

console.log('\nyear | Vega screen dist from pole | Vega-label screen dist from pole | trail circle radius on screen (approx)');
for (let yr of [13000, 13800, 14500, 15000, 15500, 15901, 16500, 17500, 19000]) {
  const M = M_periodic(J2000_JD + (yr-2000)*365.25);

  // Vega in date frame
  const vxD = M[0]*vxJ + M[1]*vyJ + M[2]*vzJ;
  const vyD = M[3]*vxJ + M[4]*vyJ + M[5]*vzJ;
  const vzD = M[6]*vxJ + M[7]*vyJ + M[8]*vzJ;
  const vra = Math.atan2(vyD, vxD), vdc = Math.asin(vzD);
  const vScr = eqToScreen(vra, vdc);

  // Label in date frame
  const lxD = M[0]*lxJ + M[1]*lyJ + M[2]*lzJ;
  const lyD = M[3]*lxJ + M[4]*lyJ + M[5]*lzJ;
  const lzD = M[6]*lxJ + M[7]*lyJ + M[8]*lzJ;
  const lra = Math.atan2(lyD, lxD), ldc = Math.asin(lzD);
  const lScr = eqToScreen(lra, ldc);

  // Sample the trail to estimate the trail circle's avg screen radius from
  // the ecliptic pole. The ecliptic pole in date eq frame = M·(0,-sin ε, cos ε)
  // But ecliptic pole is invariant under M (M rotates around it). So it's
  // the same vector in J2000 and date: (0, -sin ε, cos ε).
  // (No need to apply M.)
  const epRa = Math.atan2(-Math.sin(23.4393*D2R), 0);
  const epDec = Math.asin(Math.cos(23.4393*D2R));
  const epScr = eqToScreen(epRa, epDec);

  const vDist = vScr ? Math.hypot(vScr[0]-poleScreen[0], vScr[1]-poleScreen[1]) : null;
  const lDist = lScr ? Math.hypot(lScr[0]-poleScreen[0], lScr[1]-poleScreen[1]) : null;

  // Trail circle "radius" from ecliptic pole on screen — sample a few trail
  // points and average.
  let trailRadii = [];
  for (let phi = 0; phi < 360; phi += 30) {
    // Trail point in J2000 at ecliptic lon phi, ecliptic lat = 90°-ε = 66.56°
    const elat = (90 - 23.4393) * D2R;
    const elon = phi * D2R;
    // Convert ecliptic (lat, lon) → equatorial (ra, dec)
    const cl = Math.cos(elat), sl = Math.sin(elat);
    const cph = Math.cos(elon), sph = Math.sin(elon);
    // ecl coords: (cl*cph, cl*sph, sl)
    const xE = cl*cph, yE = cl*sph, zE = sl;
    // Ecl → Eq: rotate around x by +ε
    const eps = 23.4393*D2R;
    const xq = xE;
    const yq = yE*Math.cos(eps) - zE*Math.sin(eps);
    const zq = yE*Math.sin(eps) + zE*Math.cos(eps);
    // Now apply M
    const xDp = M[0]*xq + M[1]*yq + M[2]*zq;
    const yDp = M[3]*xq + M[4]*yq + M[5]*zq;
    const zDp = M[6]*xq + M[7]*yq + M[8]*zq;
    const traRa = Math.atan2(yDp, xDp), traDc = Math.asin(zDp);
    const traScr = eqToScreen(traRa, traDc);
    if (traScr && epScr) {
      trailRadii.push(Math.hypot(traScr[0]-epScr[0], traScr[1]-epScr[1]));
    }
  }
  const meanTrail = trailRadii.length ? trailRadii.reduce((a,b)=>a+b,0)/trailRadii.length : NaN;

  // Vega distance from ECLIPTIC pole on screen
  const vegaFromEclPole = vScr && epScr ? Math.hypot(vScr[0]-epScr[0], vScr[1]-epScr[1]) : null;
  const insideTrail = (vegaFromEclPole !== null && meanTrail) ? vegaFromEclPole < meanTrail : 'n/a';

  console.log(`${yr} | ${vDist?vDist.toFixed(0):'below'} px from pole | ${lDist?lDist.toFixed(0):'below'} px | trail radius ~${meanTrail.toFixed(0)}px from ecl pole; Vega ${vegaFromEclPole?vegaFromEclPole.toFixed(0):'-'}px from ecl pole; inside trail: ${insideTrail}`);
}
