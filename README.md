# SHEAR v1.0 — Wool and textile production modeller

Research-oriented PWA prototype for exploring sheep wool harvest, fabric production and estimated flock requirements. Operates entirely client side; after first load it works offline.

## Hosting and iPhone installation

Upload the unzipped contents, including the `icons/` folder, to the root of a public GitHub repository. In Settings → Pages select Deploy from `main` / `(root)`. Open `https://YOUR-USERNAME.github.io/REPO-NAME/` in Safari, Share → Add to Home Screen.

### Data and calculations

- Finished textile kg = number of sails × m² per sail × fabric g/m² ÷ 1000.
- Usable fibre per sheep harvest = fleece kg × fibre selection × processing retention.
- Sheep-years = required textile kg ÷ usable fibre per sheep harvest.
- Standing flock = sheep-years ÷ (production years × productive flock fraction × wool allocated to sails fraction).
- Weaving hours = total textile m² × hours/m².

All output is approximate. Calibrated starting example uses 90 m², 1000 g/m², 1.20 kg raw wool, 50% fibre retention and 75% process retention, producing 200 sheep-years, *but the individual parameter settings are hypothetical*. The primary empirical reference is Viking Ship Museum's 90m² / approximately 200 sheep sail reconstruction, not measured historical fleece yields. The 90 kg mass stated by the museum is the sail's dry mass, not necessarily exclusively woven wool.

Sensitivity analysis: 3,000 uniform independent draws over ± user-selectable percentage for raw fleece kg, sorting retention, processing retention and fabric g/m². Percentiles are illustrative *scenario envelopes*, not statistical confidence intervals. Implementation uses a reproducible pseudorandom generator.

## Features

- Input-driven estimates (sail area, count, weight, fleece yield, sorting, processing, productive share, wool allocation, time, weaving labour).
- Comparison with experimental 200 sheep / 90m² benchmark.
- Basic uncertainty/sensitivity simulation.
- Save and reload named scenarios in localStorage.
- Scenario JSON export/import and results CSV download.
- Installable PWA, offline mode, no server or tracking.

## Source references

- https://www.vikingeskibsmuseet.dk/en/professions/education/all-about-the-viking-ship/skibets-haandvaerkere/vaeveren
- https://www.vikingeskibsmuseet.dk/en/professions/boatyard/experimental-archaeological-research/maritime-crafts/maritime-technology/wool-sailcloth
- https://vikingar.historiska.se/objects.php?e=no&l=en&showcase=d03663d1-ae73-43e4-87e7-6e1daaff8094

Version 1.0 is for scenario exploration and demonstrations, not peer-reviewed parameter estimation or archaeological population reconstruction.
