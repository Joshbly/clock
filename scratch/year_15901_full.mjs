// What does the chart ACTUALLY show at year 15901 CE post-fix?
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

// NAV_STARS from index.html
const NAV_STARS = [
  { name: 'Polaris',     hip: 11767,  raDeg: 37.946266,  decDeg: 89.264111,  mag: 1.98 },
  { name: 'Thuban',      hip: 68756,  raDeg: 211.0973,   decDeg: 64.3758,    mag: 3.65 },
  { name: 'Kochab',      hip: 72607,  raDeg: 222.6764,   decDeg: 74.155505,  mag: 2.07 },
  { name: 'Alderamin',   hip: 105199, raDeg: 319.6446,   decDeg: 62.585572,  mag: 2.45 },
  { name: 'Errai',       hip: 116727, raDeg: 354.838,    decDeg: 77.633,     mag: 3.21 },
  { name: 'Vega',        raDeg: 279.234735, decDeg: 38.783689,  mag: 0.03 },
  { name: 'Deneb',       raDeg: 310.358,    decDeg: 45.280,     mag: 1.25 },
  { name: 'Altair',      raDeg: 297.696,    decDeg:  8.868,     mag: 0.77 },
  { name: 'Capella',     raDeg: 79.172,     decDeg: 45.998,     mag: 0.08 },
];

// At year 15901: what's the nearest NAV_STAR?
const M = M_periodic(J2000_JD + 13901*365.25);
console.log('At year 15901 CE, NAV_STARS sorted by distance from celestial pole:');
const sorted = NAV_STARS.map(s => ({...s, d: poleDist(M, s.raDeg, s.decDeg)})).sort((a,b)=>a.d-b.d);
for (const s of sorted.slice(0, 8)) {
  console.log(`  ${s.name.padEnd(12)} ${s.d.toFixed(2)}°  (mag ${s.mag})`);
}

// Confirm scrub direction is correct
console.log('\nDistance of pole from each named star, across slider range:');
const stars = ['Polaris', 'Vega', 'Deneb', 'Thuban', 'Errai'];
const find = n => NAV_STARS.find(s => s.name === n);
console.log('year     | ' + stars.map(s => s.padStart(8)).join(' | '));
for (let yr = 0; yr <= 26000; yr += 2000) {
  const M2 = M_periodic(J2000_JD + (yr-2000)*365.25);
  const row = stars.map(name => poleDist(M2, find(name).raDeg, find(name).decDeg).toFixed(2).padStart(8));
  console.log(`${String(yr).padStart(7)} | ${row.join(' | ')}`);
}

// And: what star, if any, sits CLOSEST to the celestial pole at year 15901?
// (The readout in deep-time mode uses findCurrentPoleStar.)
console.log('\nClosest NAV_STAR at year 15901: ' + sorted[0].name + ' @ ' + sorted[0].d.toFixed(2) + '°');
