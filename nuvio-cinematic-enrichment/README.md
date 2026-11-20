# Nuvio Cinematic Enrichment

A public Stremio-protocol metadata add-on intended for Nuvio and compatible clients.

## Public, keyless operation

End users do not need to register, provide API keys, or configure secrets.

The service uses public metadata endpoints:
- Cinemeta for the base movie and series metadata.
- TVmaze for additional series cast/character roles, crew, network and rating details where available.

This project does not require a TMDB key and does not provide video streams or copyrighted media. Public upstream services may impose fair-use limits or change availability.

## Endpoints

After deployment:
- `/manifest.json` — add-on manifest
- `/meta/movie/tt1234567.json` — movie metadata
- `/meta/series/tt0944947.json` — series metadata
- `/health` — service health

The add-on accepts IMDb IDs beginning with `tt`.

## Deploy the public service

The Worker is hosted once by the add-on maintainer; users only install its manifest URL.

To enable automatic deployment from this repository, the maintainer configures these Cloudflare deployment credentials as GitHub Actions secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

These are hosting-owner credentials, not end-user setup. No TMDB key or user secret is required.

For local deployment with Wrangler:

```sh
cd nuvio-cinematic-enrichment
npx wrangler deploy
```

## Install in Nuvio

Once the Worker is deployed and its manifest has been verified, install:

```
https://YOUR-WORKER.workers.dev/manifest.json
```

## Sources and attribution

- Base metadata: Cinemeta / Stremio.
- Series enrichment: TVmaze API.
- This is an independent community add-on and is not affiliated with or endorsed by Stremio, Nuvio, or TVmaze.
