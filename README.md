# URSINIA, Wagerenstrasse 17, Uster: Wohnung B 001 in 3D

Interaktive 3D-Animation der beiden 4.5-Zimmer-Gartenwohnungen A 001 (Haus A) und B 001 (Haus B) im Erdgeschoss des Neubauprojekts URSINIA, Wagerenstrasse 17, 8610 Uster. Umschaltbar im Panel oder direkt mit `?w=A`.
Läuft direkt im Browser, ohne Build-Schritt.

**Live:** https://semmrem1.github.io/ursinia-3d/

## Inhalt

- Kamerafahrt über beide Häuser, Abheben von Obergeschoss und Attika, beide Gartenwohnungen mit allen Räumen, eigenen Gärten (184 und 155 m²) und Massen
- Räume anklickbar, mit Flächen gemäss Grundrissplan und Circa-Massen in Metern
- Begehen-Modus in Augenhöhe (ziehen, antippen, WASD), hinaus auf die Loggien und in den Garten
- Drei Farbstimmungen (Sand, Salbei, Warmgrau) als Interpretation des Farb- und Materialkonzepts
- Sonnenstand für Uster mit Monatswahl und Regler für die Tageszeit
- Eckdaten zu Preis, Flächen, allen Wohnungen, Haustechnik, Budgets, Zahlungsmodus, Terminen und Lage
- Seite "Alle Unterlagen" (`unterlagen.html`): Preisliste, Vergleich A 001 / B 001, Baubeschrieb, Budgets, Baugesuch, Lage, Galerie, alle 11 Pläne

## Hinweise

Inoffizielle Visualisierung, kein Angebot der Verkäuferin. Der Grundriss wurde aus dem Plan 1:125 abgegriffen, Masse sind gerundete Circa-Werte.
Raumhöhe (2.50 m), Obergeschoss, Attika, Möblierung und Umgebung sind schematisch. Ausrichtung gemäss Nordpfeil im Plan.
Flächen und Preise gemäss Verkaufsunterlagen und Preisliste, Stand November 2026, ohne Gewähr. Offizielle Angaben: https://www.ursinia-uster.ch/

## Lokal starten

```
python3 -m http.server 8000
```

Dann http://localhost:8000 öffnen.

## Technik

Statisches HTML mit ES-Modulen und three.js (liegt unter `vendor/`, MIT-Lizenz). Daten in `src/data.js`, Szene in `src/main.js`.
