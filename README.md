# Diffusion-weighted MRI hands-on (ESTRO Advanced Imaging 2026)

Browser exercises for the DWI group of hands-on session 2 at the ESTRO Advanced Imaging course 2026
(Patrik Brynolfsson). Static pages, no installation, no server: open `index.html`, or use the GitHub Pages site.

| Page | What it is |
|---|---|
| `index.html` | Start page (the QR code target) |
| `sandbox.html` + `ivim_slice.js` | Block A, ADC & IVIM Sandbox: a real 21-b-value brain scan, a simulated treatment, IVIM maps and noise |

**Offline:** download the repository as a zip, unpack it and open `index.html`. Keep the files together.

## Data and credits

- Brain IVIM data: E. Peterson, *IVIM dataset*, Figshare 2016, **CC0**,
  [doi:10.6084/m9.figshare.3395704](https://doi.org/10.6084/m9.figshare.3395704) (also distributed with DIPY as
  `read_ivim`). One slice (25 of 54), 21 b-values 0–1000 s/mm², 3 directions averaged; the D, f and D* maps are the
  author's own fit.
- IVIM model: Le Bihan D et al., *Radiology* 1988;168:497–505.
- True-change limits: QIBA DWI Profile, Clinically Feasible, 2022, doi:10.1148/QIBA/20221215.
- Lowest b-value above 0 to reduce the perfusion bias: Kooreman ES et al., *Radiother Oncol* 2020;153:106–13.

## How the files are made

The pages are generated from the course workspace (not in this repository): `app/sandbox.html` is the source,
`tools/export_app.py` writes `sandbox.html` here, and `tools/prep_ivim.py` exports the brain slice to
`ivim_slice.js`. Edit the sources there and re-export; do not edit `sandbox.html` here by hand.
