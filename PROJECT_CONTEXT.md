# HashimFaisal — Nuvio Control Center

## Project
- Website: https://hashimfaisal.github.io/
- Repository: https://github.com/HashimFaisal/HashimFaisal.github.io
- Hosting: GitHub Pages
- Default branch: main

## Design system
- Midnight Prism, dark-only.
- Background: #070B16; surfaces: #111D33; cyan: #58D8E8; violet: #A394FF; text: #F2F6FF.
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
