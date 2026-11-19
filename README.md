<div align="center">

<img src="assets/hero.svg" width="100%" alt="HASHIM FAISAL Nuvio Control Center">

# NUVIO CONTROL CENTER

**An independent hub for Nuvio plugins, catalogs, subtitles, metadata, releases, and service health.**

[Open the live website](https://hashimfaisal.github.io/) · [GitHub repository](https://github.com/HashimFaisal/HashimFaisal.github.io)

<a href="https://github.com/HashimFaisal/HashimFaisal.github.io/actions/workflows/health-validation.yml">
<img src="https://github.com/HashimFaisal/HashimFaisal.github.io/actions/workflows/health-validation.yml/badge.svg?branch=main" alt="Health report validation">
</a>

</div>

---

## About

Nuvio Control Center is an independent project that organizes useful resources for the Nuvio ecosystem. It provides searchable categories, Manifest links, Nuvio app handoff actions, release information, automated endpoint checks, and change history.

The projects and add-ons listed here are independent community resources and are not official Nuvio products unless explicitly stated by their maintainers.

## Resource categories

| Category | Purpose |
|---|---|
| **Nuvio Plugins** | Plugins intended for the Nuvio plugin system. |
| **Catalogs** | Discover movies and series and view catalog metadata. Catalogs do not necessarily provide video playback. |
| **Subtitles** | Subtitle services and add-ons, including OpenSubtitles and SubDL. |
| **Ratings & Metadata** | Metadata, anime catalogs, ratings, age classifications, and poster enhancements. |

### Important installation notes

- Where a Manifest is provided, use the card's copy/open action. Supported Nuvio plugin cards can hand off to the Nuvio app.
- The **Subtitles** section includes **OpenSubtitles v3** and **TheSubtitleDB** with public direct Manifest URLs, plus **SubtitleVideo** as an experimental language-configured add-on. Open SubtitleVideo, select **English** and **Arabic**, generate its personal Manifest URL, then add that generated URL manually in Nuvio; the configuration-page URL is not a Manifest. SubtitleVideo aggregates OpenSubtitles, SubDL, Addic7ed, and other providers, so some results may overlap with existing subtitle add-ons.
- Add-ons that require API keys or accounts are excluded from the direct-install list. SubtitleVideo is a documented exception for testing: it is free and account-free, but generates a separate Manifest for each selected language set.
- Subtitle-addon listing does not guarantee in-app functionality. Nuvio exposes subtitle-addon startup behavior under Settings > Player; test each addon in the target Nuvio version.
- External add-on compatibility and available features depend on the add-on and the installed Nuvio version.
- **AIOMetadata** and **TMDB Discover+** require configuration first; install the generated manifest URL, not the configurator page.
- **Anime Kitsu** provides anime catalogs and metadata; **IMDb Ratings** is a stream-resource addon, not a catalog.
- **Ratings** and **Age Ratings** require their documented API setup before installing the generated manifest.
- **BetterPosters for Nuvio** includes a ready-to-install Cinemeta wrapper. Disable the original Cinemeta catalog to avoid duplicate rows; use its configurator to wrap other catalogs.
- Metadata addons should be ordered near the top of the Nuvio addon list. Endpoint health checks confirm manifest availability, not in-app feature compatibility.

## Health monitoring

The automated health workflow checks configured Manifest endpoints and selected release/download resources. Its report is published in:

- [Latest health report](https://github.com/HashimFaisal/HashimFaisal.github.io/blob/main/data/status.json)
- [Change history](https://github.com/HashimFaisal/HashimFaisal.github.io/blob/main/data/changelog.json)
- [Live updates feed](https://github.com/HashimFaisal/HashimFaisal.github.io/blob/main/data/updates.json)

A successful endpoint check confirms that the tested URL responded as expected at check time. It does **not** prove that an add-on's features work correctly inside Nuvio; in-app compatibility requires a separate functional test.

## Project structure

```text
.
├── index.html
├── app.js
├── premium-ui.js
├── style.css
├── premium-ui.css
├── data/
│   ├── status.json
│   ├── changelog.json
│   └── updates.json
├── scripts/
│   └── check_links.py
└── .github/
    └── workflows/
        └── health-validation.yml
```

## Development and validation

The pull-request validation workflow checks:

- JavaScript syntax for `app.js` and `premium-ui.js`.
- Python syntax for the health-check script.
- Resource category/filter consistency and key installation wiring.
- JSON structure and health/changelog/live-update event data.

To run the syntax checks locally:

```bash
node --check app.js
node --check premium-ui.js
python -m py_compile scripts/check_links.py
```

## Maintainer

**Hashim Faisal** · Independent Nuvio ecosystem projects

[GitHub profile](https://github.com/HashimFaisal)

---

<div align="center">

**Built independently for the Nuvio community.**

</div>
