# Nuvio Cinematic Enrichment

A public Stremio-protocol metadata add-on intended for Nuvio and compatible clients.

It enriches IMDb-ID movie and series details with:
- Cast members and their character names
- Directors, writers and series creators
- Production companies and TV networks
- TMDB rating and vote count
- Posters, backdrops, synopsis, genres and trailers
- Release date, runtime, original language and country

This project does not provide video streams or copyrighted media.

## Endpoints

After deployment:
- `/manifest.json` — add-on manifest
- `/meta/movie/tt1234567.json` — movie metadata
- `/meta/series/tt0944947.json` — series metadata
- `/health` — service health

The add-on accepts IMDb IDs beginning with `tt`.

## Deploy to Cloudflare Workers

1. Create a Worker named `nuvio-cinematic-enrichment` in Cloudflare.
2. Deploy this directory with Wrangler, or connect the repository using the included GitHub Actions workflow.
3. If deploying manually, in Worker **Settings → Variables and Secrets**, add `TMDB_API_KEY` as a **Secret** (TMDB API v3 key). Never put the key in source code, a public GitHub variable, or the website.
4. For automatic deployment, add these three GitHub Actions repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `TMDB_API_KEY`. The workflow uploads `TMDB_API_KEY` to the Worker as a server-side secret.
5. Open `https://YOUR-WORKER.workers.dev/manifest.json` and verify the manifest, then test a known IMDb ID and `/health`.

For local deployment with Wrangler:

```sh
cd nuvio-cinematic-enrichment
npx wrangler secret put TMDB_API_KEY
npx wrangler deploy
```

## Install in Nuvio

Once the Worker is deployed and the manifest responds successfully, install this URL in Nuvio:

```
https://YOUR-WORKER.workers.dev/manifest.json
```

## Security and attribution

- TMDB credentials are read only from the server-side `TMDB_API_KEY` secret.
- The add-on does not ask each user for a personal key.
- Metadata and images are provided by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
- Do not commit API keys or access tokens.
