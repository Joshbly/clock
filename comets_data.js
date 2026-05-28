// ============================================================
// COMETS — osculating orbital elements (heliocentric ecliptic, J2000)
// Source: JPL Horizons + NASA Small-Body Database, Nov 2025 solutions.
//
// Each entry's elements are:
//   q     perihelion distance (AU)
//   e     eccentricity
//   I     inclination (deg, ecliptic of J2000)
//   Om    longitude of ascending node Ω (deg)
//   w     argument of perihelion ω (deg)
//   Tp    time of perihelion passage (JD, TDB)
//   period orbital period (years, for elliptical comets only)
//   epoch JD of the osculating elements (TDB)
//
// Notes on orbit type:
//   e < 0.999  → elliptical (standard Kepler equation)
//   0.999 ≤ e ≤ 1.001 → near-parabolic (Barker's equation)
//   e > 1.001  → hyperbolic (hyperbolic Kepler equation)
//
// Halley's elements drift by a few degrees between perihelia due to
// non-gravitational outgassing forces; using a single epoch's solution
// to predict 75 years away introduces ~10-day timing error in the
// perihelion date, which we accept for visualization.
// ============================================================

const COMETS = [
  {
    name: '1P/Halley',
    short: 'Halley',
    color: '#aaddff',
    q: 0.5748638313743413,
    e: 0.9679359956953212,
    I: 162.1905300439129,
    Om: 59.09894720612437,
    w: 112.2414314637764,
    Tp: 2446469.9736161465,    // 1986 Feb 9.47 (last perihelion)
    period: 75.915,
    epoch: 2439875.5
  },
  {
    name: '2P/Encke',
    short: 'Encke',
    color: '#ddccaa',
    q: 0.3360,
    e: 0.8483,
    I: 11.781,
    Om: 334.567,
    w: 187.298,
    Tp: 2459857.4517,           // 2022 Sep 17.95
    period: 3.30,
    epoch: 2459800.5
  },
  {
    name: '109P/Swift-Tuttle',
    short: 'Swift-Tuttle',
    color: '#ffaaaa',
    q: 0.95952,
    e: 0.96331,
    I: 113.4538,
    Om: 139.3811,
    w: 152.9821,
    Tp: 2448968.50,             // 1992 Dec 12.0
    period: 133.28,
    epoch: 2448920.5
  },
  {
    name: 'C/1995 O1 Hale-Bopp',
    short: 'Hale-Bopp',
    color: '#ddccff',
    q: 0.9141,
    e: 0.99511,
    I: 89.4307,
    Om: 282.4707,
    w: 130.5887,
    Tp: 2450537.0,              // 1997 Apr 1.0
    period: 2533,
    epoch: 2450460.5
  },
  {
    name: '67P/Churyumov-Gerasimenko',
    short: '67P',
    color: '#88ccaa',
    q: 1.2432,
    e: 0.6410,
    I: 7.0431,
    Om: 36.3358,
    w: 22.1330,
    Tp: 2459886.0,              // 2022 Nov 2 (perihelion of Rosetta era)
    period: 6.450,
    epoch: 2459800.5
  },
  {
    name: '46P/Wirtanen',
    short: 'Wirtanen',
    color: '#aaffcc',
    q: 1.0556,
    e: 0.6592,
    I: 11.7493,
    Om: 82.1604,
    w: 356.3411,
    Tp: 2458465.6,              // 2018 Dec 12
    period: 5.435,
    epoch: 2458400.5
  },
  {
    name: '55P/Tempel-Tuttle',
    short: 'Tempel-Tuttle',
    color: '#ff9988',
    q: 0.97648,
    e: 0.90555,
    I: 162.486,
    Om: 235.270,
    w: 172.499,
    Tp: 2450872.5,              // 1998 Feb 28 (perihelion)
    period: 33.23,
    epoch: 2450800.5
  },
  {
    name: '21P/Giacobini-Zinner',
    short: 'Giacobini-Zinner',
    color: '#cccc99',
    q: 1.0127,
    e: 0.7080,
    I: 31.991,
    Om: 195.397,
    w: 172.971,
    Tp: 2458376.5,              // 2018 Sep 10
    period: 6.621,
    epoch: 2458300.5
  },
  {
    name: '29P/Schwassmann-Wachmann',
    short: 'SW1',
    color: '#bbccdd',
    q: 5.7155,
    e: 0.04309,
    I: 9.357,
    Om: 312.273,
    w: 49.971,
    Tp: 2453160.0,              // 2004 Jul 7
    period: 14.90,
    epoch: 2453100.5
  },
  {
    name: '153P/Ikeya-Zhang',
    short: 'Ikeya-Zhang',
    color: '#ffccaa',
    q: 0.5076,
    e: 0.99012,
    I: 28.122,
    Om: 93.367,
    w: 34.685,
    Tp: 2452354.0,              // 2002 Mar 18
    period: 366,
    epoch: 2452300.5
  },
  {
    name: 'C/2023 A3 Tsuchinshan-ATLAS',
    short: 'Tsuchinshan-ATLAS',
    color: '#ffeebb',
    q: 0.39148,
    e: 1.000095,                  // slightly hyperbolic — dynamically new
    I: 139.111,
    Om: 21.5604,
    w: 308.4919,
    Tp: 2460589.066,            // 2024 Sep 27.57
    period: null,               // hyperbolic — no period
    epoch: 2460400.5
  },
  {
    name: '13P/Olbers',
    short: 'Olbers',
    color: '#ddaaff',
    q: 1.17588,
    e: 0.93023,
    I: 44.652,
    Om: 85.1572,
    w: 64.4138,
    Tp: 2460491.5,              // 2024 Jun 30
    period: 69.49,
    epoch: 2460400.5
  }
];
