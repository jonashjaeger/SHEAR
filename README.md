# SHEAR v2.0 — Archaeological wool production modeller

A local-first, installable web app for **scenario-based** modelling of wool demands, fibre selection, textile production and **steady-state flock demographics**. No tracking or account required. The complete source code is included.

## Installation (GitHub Pages / iPhone)

Create a public GitHub repository (e.g. `shear`), upload **all** extracted files to its root, preserving the `icons/` folder, then activate **Settings → Pages → Deploy from branch `main`, root**. On the iPhone, visit the published URL using Safari → Share → Add to Home Screen.

To update an existing SHEAR v1 repository, upload `index.html`, `app.js`, `styles.css`, `sw.js`, and (if the name or manifest has changed) `manifest.webmanifest`. The icon folder is unchanged. SHEAR v2 reads and copies legacy v1 settings and scenarios on the first run, without deleting old browser records; always export a JSON backup before upgrading.

## Calculation

Cohorts are adult ewes, adult rams, wethers, and juveniles, each with a **fraction of standing flock** (sum exactly 100%) and annual **collected raw wool**, measured in kilograms per animal-year. The annual yield can represent more than one harvesting episode; the app does not infer a specific shearing schedule.

```
D = (sails × area_per_sail × finished_cloth_g_per_m2) / 1000  [kg]
raw_per_head_year = Σ (cohort_fraction × collected_raw_kg_per_cohort_head_year)
selected_per_head_year = raw_per_head_year × selected_fibre_fraction
usable_per_head_year = selected_per_head_year × processing_retention
allocated_per_head_year = usable_per_head_year × target_allocation
standing_flock = D / (production_years × allocated_per_head_year)
raw_wool_total = standing_flock × production_years × raw_per_head_year
productive_share = Σ fractions of groups with yield > 0
per_producer_usable_year = usable_per_head_year / productive_share
producer_year_equivalents = D / per_producer_usable_year
```

Standing flock is an average *constant-composition requirement*, NOT an archaeological sheep census. Producer-year equivalents describe a wool mass equivalent independent of target allocation, NOT distinct sheep individuals or historical flock demographic counts. Changing assumptions affects both. The number of years is a resource accrual horizon, not a sheep life expectancy.

**Important reference caution**: Viking Ship Museum states the reconstructed 90 m² wool sail for *Ottar* used wool from around 200 Spelsau sheep with approximately 500 g usable wool/animal. The museum's other reporting on finished dry sail mass is NOT a direct measurement of pure woven wool mass. The model deliberately does not force agreement with this reference.

## Fleece profiles

Three **hypothetical** example profiles show how raw fleece production and fibre selection might alter results:

- Mixed double-coated fleece: initial selection 50%.
- Fine-fibre focus: stricter selection, 35%.
- Long-staple/outer-fibre focus: selection 45%.

These are **not estimates of historical population fleece distributions, nor genetic breed reconstructions**. Editing any related yield or fibre selection input switches to Custom. Your actual choices are written into JSON/CSV alongside the notes you provide.

## Stochastic modelling

The Uncertainty page runs 1,000, 5,000, or 10,000 pseudorandom draws with a user-specified seed using the Mulberry32 PRNG. Every uncertain parameter has a distribution type (`triangular` or `uniform`) and lower/upper relative bounds around the **current central value**. Lower and upper bounds are truncated at physically/semantically allowable ranges (for example, retention fractions cannot exceed 100%). In a triangular distribution, the current central value is the mode; in a uniform distribution, it is *not* privileged.

Uncertain parameters: fabric density, ewe/ram/wether/juvenile collected wool yield, fibre selection, processing retention, wool allocation, juvenile share. With juvenile share variation, the adult cohort percentages are rescaled proportionally so the fractions still sum to 100%. This is a **compositional constraint**, not demographic simulation through birth and death.

Returns 5th, median and 95th percentiles of standing flock; a 32-bin histogram of 2nd–98th-percentile range (outliers counted in boundary bins); descriptive Pearson correlations of input assumptions with estimated flock sizes. The model assumes uncertainty independence among the uncertain parameters except the composition constraint. This may be unrealistic (e.g. fleece yield and fibre selection could correlate). The interval is CONDITIONAL ON SUBJECTIVE INPUT DISTRIBUTIONS: it is not an archaeological confidence or credible interval without empirically estimated priors. It should be reported as a **simulation sensitivity range**.

The simulation CSV contains each generated parameter value, rescaled adult cohort share, iteration number, seed and resulting flock size. Results export CSV includes current settings and output. JSON export includes current model, notes, uncertainty definitions and stored scenarios. All exported files are generated locally.

## Archaeological evidence and suggested background

- [Viking Ship Museum, *Ottar*](https://www.vikingeskibsmuseet.dk/en/professions/the-boat-collection/ottar): 90 m² sail, about 200 Spelsau, ~500 g usable wool per sheep.
- [Skals et al. 2024, *Wool fibre quality in Danish prehistoric textiles: A 3,000 year survey*](https://tidsskrift.dk/atr/article/view/166419): variation in wool quality and textile processing through time.
- [Fashioning the Viking Age — wool from modern primitive sheep](https://natmus.dk/fileadmin/user_upload/Editor/natmus/oldtiden/Fashioning_the_Viking_Age/Skals_et_al_2024_Viking_Age_Wool_Fibres.pdf): underwool / outer-fibre distinction and modern experimental comparanda.

## Scientific limitations

- No age-specific survival, lambing, reproductive ratios, slaughter, culling, feeding, landscape carrying capacity or trade network constraints. Demography is user-entered as *standing share*, not recovered from zooarchaeological mortality data.
- No first-principles fibre microscopy, yarn twist, warp/weft distinctions, weaving width, repairs, loom type, weaving shrinkage or separate treatment mass model. Fibre type affects the assumed selectable percentage, not woven sail performance.
- The model **cannot determine which sheep fleece type, sex ratio, pasture resource or sail mass was historically true**.
- All initial quantitative parameters, especially cohort yields and juvenile shares, are illustrative. Substitute empirically justified data with citations in scenario notes.
- Results are intended for exploring hypotheses and sensitivity, not publication as historical livestock population estimates without suitable empirical validation.

## Validation and compatibility

Model and simulation checked with direct JavaScript unit tests for mass conservation, invalid composition, uniform/triangular sampling, seed reproducibility, identical outcomes under zero-width ranges, and migration from v1. Browser visual testing and iPhone offline-install behaviour remain to be verified on the user's device because local Chromium access was restricted in the development environment.

The app uses `localStorage` for current settings and saved scenarios; uninstalling or clearing site data can remove this content. Export JSON backups regularly. The service worker caches all necessary files for later offline use after an initial successful online load.

### Developer reproducibility check

If Node.js is installed, run `node tests/model-test.cjs` from the unpacked project. This is an automated non-browser test covering equations, randomness, mass conservation, demographic constraints, parameter transitions and v1 migration. It does not substitute for testing rendering or caching on iPhone Safari.
