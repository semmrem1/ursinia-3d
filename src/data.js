// Alle Angaben zur Wohnung B 001, URSINIA, Wagerenstrasse 17, 8610 Uster.
// Quellen: ursinia-uster.ch, Verkaufsdokumentation (Stand Januar 2026, Revision 16.04.2026),
// Grundrisspläne (A3, M 1:125 / 1:80), Preisliste navisu (Stand November 2026),
// Baugesuch BG Nr. 2025-0376 (publiziert 20.05.2026). Angaben ohne Gewähr.

// Der Grundriss wurde aus dem Plan 1:125 abgegriffen (Pixel der Bildschirmkopie -> Meter).
// Massstab an der Massstabsleiste kalibriert und an den Raumflächen geprüft.
// A 001 und B 001 haben denselben Grundriss.
const PX_PER_M = 55.85;
const OX = 31, OZ = 31;
export const mx = (px) => (px - OX) / PX_PER_M;
export const mz = (py) => (py - OZ) / PX_PER_M;
export const r = (x0, x1, z0, z1) => ({ x0: mx(x0), x1: mx(x1), z0: mz(z0), z1: mz(z1) });

export const WALL_H = 2.5; // Annahme, Raumhöhe ist in den Unterlagen nicht angegeben

// Wohnung: Nordteil (Bad, Reduit, Korridor, Zimmer Nord), Mittelteil, Wohnen / Kochen / Essen, Essplatz
export const outline = [r(331, 1040, 40, 268), r(47, 1040, 268, 562), r(247, 840, 552, 830), r(247, 563, 815, 906)];

// Allgemeine Flächen im Wohnungsgrundriss (Hauseingang, Treppenhaus, Lift)
export const core = [
  { name: 'Hauseingang', ...r(345, 525, 46, 262) },
  { name: 'Treppenhaus', ...r(348, 740, 276, 425) },
  { name: 'Lift', ...r(455, 536, 442, 530) },
];

export const rooms = [
  { id: 'wohnen', name: 'Wohnen', area: 23.1, floor: 'parkett', rects: [r(548, 828, 562, 815)],
    note: 'Offen zu Kochen und Essen, Glasfront zur Loggia Ost (15.7 m²)' },
  { id: 'kochen', name: 'Kochen', area: 12.8, floor: 'parkett', rects: [r(255, 548, 552, 700)],
    note: 'Küchenzeile mit Hochschränken und Kochinsel, Budget CHF 25\'000' },
  { id: 'essen', name: 'Essen', area: 15.5, floor: 'parkett', rects: [r(255, 548, 700, 890)],
    note: 'Glasfront über Eck zur grossen Loggia (41.5 m²)' },
  { id: 'zimmerW', name: 'Zimmer West', area: 15.8, floor: 'parkett', rects: [r(58, 247, 281, 526)],
    note: 'Zugang vom Entrée, Einbauschrank, Fenster nach Westen' },
  { id: 'zimmerN', name: 'Zimmer Nord', area: 13.4, floor: 'parkett', rects: [r(838, 1030, 55, 264)],
    note: 'Elternzimmer mit Einbauschrank, Bad nebenan (A 001: 13.0 m²)' },
  { id: 'zimmerO', name: 'Zimmer Ost', area: 16.0, floor: 'parkett', rects: [r(838, 1030, 276, 526)],
    note: 'Zugang vom Korridor, Einbauschrank, Fenster nach Osten' },
  { id: 'entree', name: 'Entrée', area: 8.0, floor: 'parkett', rects: [r(255, 335, 398, 552), r(335, 448, 439, 535)],
    note: 'Wohnungstür vom Treppenhaus, Garderobe (Budget CHF 3\'000)' },
  { id: 'korridor', name: 'Korridor', area: 10.9, floor: 'parkett', rects: [r(755, 828, 268, 562), r(692, 828, 175, 268)],
    note: 'Erschliesst Bad, Reduit und die Zimmer Nord und Ost' },
  { id: 'bad', name: 'Bad', area: 8.6, floor: 'nass', rects: [r(550, 825, 55, 163)],
    note: 'Badewanne, Dusche, Lavabo, WC, zwei Fenster nach Norden' },
  { id: 'dusche', name: 'Dusche', area: 6.3, floor: 'nass', rects: [r(552, 745, 442, 545)],
    note: 'Dusche, Lavabo, WC, Zugang vom Wohnbereich' },
  { id: 'reduit', name: 'Reduit', area: 4.1, floor: 'platten', rects: [r(550, 685, 175, 264)],
    note: 'Abstellraum mit Schrankfront (Budget CHF 3\'000)' },
  { id: 'wmtu', name: 'Reduit WM/TU', area: 2.4, floor: 'platten', rects: [r(255, 330, 281, 388)],
    note: 'Waschturm Schulthess (Budget CHF 2\'000)' },
];

// Durchgänge und Türen (Wandöffnungen über die ganze Höhe)
export const openings = [
  r(243, 262, 440, 495),    // Entrée -> Zimmer West
  r(262, 312, 383, 402),    // Entrée -> Reduit WM/TU
  r(352, 400, 423, 441),    // Wohnungstür vom Treppenhaus
  r(713, 755, 159, 178),    // Korridor -> Bad
  r(680, 698, 180, 226),    // Korridor -> Reduit
  r(822, 842, 182, 232),    // Korridor -> Zimmer Nord
  r(822, 842, 436, 482),    // Korridor -> Zimmer Ost
  r(740, 760, 496, 545),    // Wohnen -> Dusche
];

// Fenster und Glasfronten (raumhoch)
export const windows = [
  r(40, 62, 330, 470),                         // Zimmer West
  r(612, 672, 34, 60), r(752, 815, 34, 60),    // Bad
  r(1025, 1046, 100, 222),                     // Zimmer Nord
  r(1025, 1046, 292, 452),                     // Zimmer Ost
  r(240, 262, 562, 884),                       // Kochen / Essen zur Loggia West
  r(262, 545, 884, 912),                       // Essen zur Loggia Süd
  r(570, 826, 810, 836),                       // Wohnen Süd
  r(822, 846, 572, 806),                       // Wohnen zur Loggia Ost
];
// Glasfronten mit Schiebetüren, durch die man im Begehen-Modus hinausgehen kann
export const passable = [windows[5], windows[6], windows[7], windows[8]];

// Loggien (unter dem Obergeschoss, Feinsteinzeug 60 x 60)
export const loggias = [
  { name: 'Loggia', area: 41.5, rects: [r(31, 247, 548, 1056), r(247, 563, 906, 1056)] },
  { name: 'Loggia Ost', area: 15.7, rects: [r(840, 1052, 548, 833)] },
];

// Aussenmasse des Hauses (Plan): Grundfläche inkl. Loggien
export const houseFoot = [r(331, 1052, 40, 268), r(31, 1052, 268, 833), r(31, 563, 833, 1056)];
export const attikaFoot = [r(331, 1040, 40, 268), r(47, 1040, 268, 548), r(247, 840, 548, 830), r(247, 563, 830, 906)];
export const HOUSE_W = mx(1052), HOUSE_D = mz(1056);
export const HOUSE_A_DX = -26.2; // Haus A westlich, gemäss Umgebungsplan

// Gartenanteile, Umriss aus den Plänen geschätzt (lokale Koordinaten des jeweiligen Hauses)
// B 001: 155 m², schmaler Westgarten wegen Fussweg zwischen den Häusern. A 001: 184 m², breiter Westgarten.
const Z1 = HOUSE_D + 0.6;
const gardenRects = (west, east) => [
  { x0: -west, x1: 0, z0: mz(253), z1: Z1 },
  { x0: 0, x1: mx(563), z0: HOUSE_D, z1: Z1 },
  { x0: mx(563), x1: HOUSE_W, z0: mz(830), z1: Z1 },
  { x0: HOUSE_W, x1: HOUSE_W + east, z0: 0.2, z1: Z1 },
];
export const garden = { area: 155, rects: gardenRects(2.3, 3.9) };

// Die beiden 4.5-Zimmer-Gartenwohnungen im Erdgeschoss (gleicher Grundriss)
export const units = {
  B: { key: 'B', name: 'B 001', haus: 'Haus B', dx: 0, preis: "CHF 2'100'000", preisNum: 2100000, bwf: '141.9 m²', zimmerN: 13.4,
    garden: { area: 155, rects: gardenRects(2.3, 3.9) }, keller: 'Keller 06 · 11.8 m²', aussen: '212.2 m²',
    lage: 'Haus B im Osten, Garten vor allem im Osten und Süden' },
  A: { key: 'A', name: 'A 001', haus: 'Haus A', dx: HOUSE_A_DX, preis: "CHF 2'135'000", preisNum: 2135000, bwf: '141.2 m²', zimmerN: 13.0,
    garden: { area: 184, rects: gardenRects(5.4, 3.0) }, keller: 'Keller 03 · 12.6 m²', aussen: '241.2 m²',
    lage: 'Haus A im Westen, breiter Garten auf der Westseite' },
};

// Möblierung nur zur Veranschaulichung, nach den Plänen (nicht im Kaufpreis)
const f = (x0, x1, z0, z1, h, color, y = 0) => ({ ...r(x0, x1, z0, z1), h, color, y });
export const furniture = [
  // Wohnen: Sofa mit Blick nach Osten, Salontisch, zwei Sessel
  f(556, 606, 650, 772, 0.42, 0x9c9488), f(548, 560, 650, 772, 0.8, 0x8f877b),
  f(556, 606, 640, 650, 0.6, 0x8f877b), f(556, 606, 772, 782, 0.6, 0x8f877b),
  f(648, 702, 670, 726, 0.36, 0x7c6a58),
  f(738, 782, 696, 742, 0.42, 0xb7ab98), f(778, 788, 696, 742, 0.85, 0xa99d8a),
  f(688, 732, 748, 792, 0.42, 0xb7ab98), f(688, 732, 788, 796, 0.85, 0xa99d8a),
  f(570, 760, 548, 562, 0.5, 0x7c6a58, 0),          // Sideboard an der Duschwand
  // Zimmer West: Sideboard, Liege, Sessel
  f(108, 222, 283, 299, 0.75, 0xb39468), f(118, 196, 322, 374, 0.42, 0xc8bfb0), f(72, 112, 436, 478, 0.45, 0xb7ab98),
  // Einbauschränke
  f(58, 247, 494, 524, 2.15, 'gard'), f(868, 1030, 232, 263, 2.15, 'gard'), f(840, 1030, 492, 524, 2.15, 'gard'),
  f(405, 446, 442, 532, 2.15, 'gard'), f(552, 685, 230, 262, 2.15, 'gard'),
];
export const beds = [
  { ...r(880, 988, 58, 166), head: 'n', duvet: 0xdcd6cb },        // Zimmer Nord, Doppelbett
  { ...r(842, 906, 282, 392), head: 'n', duvet: 0xcfd6d2 },       // Zimmer Ost, Einzelbett
];
export const desk = r(948, 1022, 282, 318);                        // Zimmer Ost, Pult
export const diningTable = r(356, 496, 778, 828);                  // Esstisch ca. 2.5 x 0.9 m, sechs Stühle
export const washTower = r(262, 296, 284, 318);
export const kitchen = { row: r(345, 540, 553, 592), island: r(345, 505, 662, 712) };
export const loggiaTable = { cx: mx(132), cz: mz(915), r: 0.6 };

// Farbstimmungen gemäss Farb- und Materialkonzept (Sand, Salbei, warme Grautöne).
// Keine offiziellen Ausbaulinien, sondern Interpretation der Visualisierungen.
export const ausbaulinien = [
  { name: 'Sand', parkett: 0xd6b893, nass: 0xe4dacb, platten: 0xd9cfbf, front: 0xd9cbb4, stone: 0xcfc8bd, speck: 0.45, gard: 0xe2d8c8,
    text: ['Eichenparkett natur geölt', 'Küchenfront Sand, gerundete Dickkanten', 'Granit hell (Preisklasse 2), Glasrückwand', 'Keramik Nasszellen Sandbeige', 'Budget Boden und Wand CHF 140/m² brutto'] },
  { name: 'Salbei', parkett: 0xcfae86, nass: 0xd5d9cf, platten: 0xc9cbbf, front: 0x9fae98, stone: 0x77796f, speck: 0.4, gard: 0xc7cdbd,
    text: ['Eichenparkett natur', 'Küchenfront Salbei', 'Granit mittelgrau (Preisklasse 2)', 'Keramik Nasszellen hellgrau-grün', 'Interpretation der Visualisierungen'] },
  { name: 'Warmgrau', parkett: 0xb89a78, nass: 0xb9b1a8, platten: 0x9f978d, front: 0x8b847c, stone: 0x3e3f3e, speck: 0.35, gard: 0xa59e94,
    text: ['Eichenparkett geräuchert', 'Küchenfront warmes Grau', 'Granit dunkel (Preisklasse 2)', 'Keramik Nasszellen Taupe', 'Interpretation der Visualisierungen'] },
];

export const facts = {
  gruppen: [
    { titel: 'Preis', zeilen: [
      ['Verkaufspreis B 001', "CHF 2'100'000"],
      ['Preis pro m² BWF', "CHF 14'799"],
      ['Parkplatz Tiefgarage', "CHF 50'000 (XL: CHF 80'000)"],
      ['Disponibelraum', "13.0 m² CHF 26'000 · 17.9 m² CHF 36'000"],
      ['Mit Parkplatz', "CHF 2'150'000"],
      ['Variante A 001 (Haus A)', "CHF 2'135'000, Garten 184 m²"],
    ] },
    { titel: 'Flächen', zeilen: [
      ['Bruttowohnfläche (BWF)', '141.9 m²'],
      ['Loggien', '41.5 m² und 15.7 m²'],
      ['Gartenanteil', '155 m²'],
      ['Aussenfläche total', '212.2 m²'],
      ['Keller 06', '11.8 m²'],
      ['BWF', 'inkl. Innenwände, exkl. Aussenwände, Steigzonen, Sanitärvorwände'],
    ] },
    { titel: 'Alle Wohnungen', zeilen: [
      ['A 001 · EG · 4.5 Zi', "141.2 m² · CHF 2'135'000"],
      ['B 001 · EG · 4.5 Zi', "141.9 m² · CHF 2'100'000"],
      ['A 101 / B 101 · OG · 3.5 Zi', "89.5 / 90.2 m² · CHF 1'560'000"],
      ['A 102 / B 102 · OG · 3.5 Zi', "88.0 m² · CHF 1'500'000"],
      ['A 201 / B 201 · Attika · 3.5 Zi', "122.6 / 123.2 m² · CHF 2'280'000"],
    ] },
    { titel: 'Haustechnik', zeilen: [
      ['Heizung', 'Fernwärme Stadt Uster, Niedertemperatur-Bodenheizung'],
      ['Alternative', 'Erdsonden- oder Luft-Wasser-Wärmepumpe, falls kein Anschlussvertrag'],
      ['Regulierung', 'Einzelraumregulierung, Wärmemessung pro Wohnung'],
      ['Lüftung', 'Fenster, Nasszellen mechanisch entlüftet'],
      ['Fenster', 'Holz-Metall, 3-fach verglast, Hebeschiebefenster im Wohnen'],
      ['Sonnenschutz', 'Elektrische Raffstoren, Loggien elektrische Senkrechtmarkisen'],
      ['E-Mobilität', 'Ausbaustufe C1, Lastmanagement, Ladestation als Nachtrag'],
      ['Multimedia', 'Netzwerk und TV im Wohnen, Leerrohre in den Zimmern'],
    ] },
    { titel: 'Ausbau und Budgets', zeilen: [
      ['Küche', "CHF 25'000 (Granit, Glasrückwand, Glaskeramik, Kombibackofen)"],
      ['Sanitärapparate', "CHF 16'000"],
      ['Böden und Wandplatten', 'CHF 140/m² brutto, fertig verlegt'],
      ['Garderobe', "CHF 3'000"],
      ['Schrankfront Reduit', "CHF 3'000"],
      ['Waschturm Schulthess', "CHF 2'000"],
      ['Glastrennwand / Radiator', "CHF 1'800 / 1'600"],
      ['Wände / Decken', 'Abrieb weiss / Weissputz Q3'],
    ] },
    { titel: 'Gebäude', zeilen: [
      ['Projekt', '2 Mehrfamilienhäuser, 8 Eigentumswohnungen'],
      ['Pro Haus', 'EG 4.5 Zi Garten, OG 2 x 3.5 Zi, Attika 3.5 Zi'],
      ['Bauweise', 'Massivbau, verputzt, Schallschutz SIA 181'],
      ['Dach', 'Flachdach extensiv begrünt, PV auf Haus A'],
      ['Tiefgarage', '12 Parkplätze (3 XL), gemeinsam für beide Häuser'],
      ['Nebenräume', 'Keller, Veloraum, Kinderwagenraum, Trocknungsraum'],
      ['Umgebung', 'Wildhecken, Spielwiese, gemeinschaftliche Pergola'],
    ] },
    { titel: 'Zahlungsmodus', zeilen: [
      ['Reservation', "CHF 50'000"],
      ['Bei Beurkundung', "20 % (B 001: CHF 420'000)"],
      ['Restzahlung', 'bei Schlüsselübergabe / Eigentumsübertragung'],
      ['Käuferwünsche', '30 Tage nach Rechnung'],
      ['Notariat / Handänderung', 'je hälftig'],
    ] },
    { titel: 'Termine', zeilen: [
      ['Baugesuch', 'BG Nr. 2025-0376, publiziert 20.05.2026'],
      ['Inhalt', 'Abbruch Bestandesbau, Neubau 2 MFH mit Tiefgarage'],
      ['Baubewilligung', 'nicht publiziert gefunden'],
      ['Baustart / Bezug', 'nicht angegeben (Schätzung 2027 / Ende 2028)'],
    ] },
    { titel: 'Lage', zeilen: [
      ['Adresse', 'Wagerenstrasse 17, 8610 Uster'],
      ['Zürich HB', '22 km · 15 Min. ÖV · 20 Min. Auto'],
      ['Stadelhofen', '20 km · 11 Min. ÖV'],
      ['Flughafen', '21 km · 30 Min. ÖV · 15 Min. Auto'],
      ['Winterthur / Rapperswil', 'je ca. 20 Min.'],
      ['Nahe', 'Bus Wageren, Spital, Primarschule Hasenbühl, Greifensee'],
    ] },
    { titel: 'Beteiligte', zeilen: [
      ['Verkauf', 'Bereuter Totalunternehmung AG, Effretikon'],
      ['Kontakt', 'Tiziana Romano, 044 216 71 51'],
      ['Architektur', 'werkteam architekten ag, Urs Solèr'],
      ['Interior / Marketing', 'nima beyond spaces, Küsnacht'],
    ] },
  ],
};
