# HashimFaisal — Nuvio Control Center

## Project
- Website: https://hashimfaisal.github.io/
- Repository: https://github.com/HashimFaisal/HashimFaisal.github.io
- Hosting: GitHub Pages
- Default branch: main

## Design system
- Midnight Prism, dark-only.
- Background: #080D19; surfaces: #101A2D / #16243A / #182744; cyan: #63D9E9; violet: #AA9BFF; text: #F2F6FF; supporting text: #B2BFD4.
- Accent states: success #42C879 / #AFEAC7; danger #FF8292 / #FFB9C2; cyan highlight #98EDF5.
- CSS, active SVG, HTML, and JavaScript colors must pass strict allowlists; no retired palette list is retained in source.
- Preserve original third-party raster brand marks and the NASA Black Marble video colors; do not recolor source artwork or apply video filters.
- Preserve the established design and avoid introducing gold/bronze tones or a light theme.

## Website structure
- index.html: page markup and resource cards
- style.css: base styles and layout
- premium-ui.css: premium/dashboard presentation and responsive overrides
- app.js: language, resource filtering/copy actions, status and changelog rendering
- premium-ui.js: dashboard navigation and view transitions
- data/status.json: generated health/release report
- data/changelog.json: historical changelog
- data/updates.json: short-lived live updates
- scripts/check_links.py: health-check script
- scripts/validate_site.py: static integrity checks
- .github/workflows/health-validation.yml: PR validation
- .github/workflows/pages.yml: Pages deployment

## Nuvio source
- Release source: luqmanfadlli/NuvioMobile-Enhanced
- Releases: https://github.com/luqmanfadlli/NuvioMobile-Enhanced/releases
- Do not switch release sources without approval.

## Subtitles
- Current subtitle resources: OpenSubtitles v3, TheSubtitleDB, and SubtitleVideo.
- Keep subtitle language coverage Arabic and English only; do not add other languages without explicit approval.
- SubtitleVideo is accepted as compatible; preserve it unless the user reports a problem.

## Project workflow
- Work on a separate branch and open a pull request.
- Never merge, publish, or deploy without explicit user approval.
- Keep changes scoped; do not bulk-stage files.
- Preserve working features and avoid removing resources without evidence and approval.
- Review CI results before presenting changes as validated.
- Backups and unrelated files should not be added by default.
