const CINEMETA = "https://v3-cinemeta.strem.io";
const TVMAZE = "https://api.tvmaze.com";
const MANIFEST = {
  id: "org.hashimfaisal.nuvio.cinematic-enrichment",
  version: "0.2.0",
  name: "Nuvio Cinematic Enrichment",
  description: "Public metadata enrichment for movies and series, including cast character roles and production details where available.",
  resources: [{ name: "meta", types: ["movie", "series"], idPrefixes: ["tt"] }],
  types: ["movie", "series"],
  idPrefixes: ["tt"],
  catalogs: []
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
      ...extra
    }
  });
}

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Metadata source returned " + response.status);
  }
  return response.json();
}

function addLink(links, category, name, url) {
  if (!name || !url) return;
  const key = category + "|" + name + "|" + url;
  if (links.some(link => link._key === key)) return;
  links.push({ name: String(name).slice(0, 120), category, url, _key: key });
}

function mergeTvMaze(meta, show, cast, crew) {
  const links = Array.isArray(meta.links) ? meta.links.slice() : [];
  for (const entry of (cast || []).slice(0, 30)) {
    const actor = entry.person || {};
    const character = entry.character || {};
    const role = [actor.name, character.name ? "as " + character.name : ""].filter(Boolean).join(" — ");
    if (role && actor.url) addLink(links, "actor", role, actor.url);
  }
  for (const entry of (crew || []).slice(0, 20)) {
    const person = entry.person || {};
    const job = entry.type || "Crew";
    if (person.name && person.url) addLink(links, job, person.name, person.url);
  }
  if (show.network && show.network.name) {
    addLink(links, "network", show.network.name, show.network.officialSite || show.url);
  }
  if (show.webChannel && show.webChannel.name) {
    addLink(links, "network", show.webChannel.name, show.webChannel.officialSite || show.url);
  }
  if (show.rating && typeof show.rating.average === "number") {
    addLink(links, "rating", "TVmaze rating: " + show.rating.average + "/10", show.url);
  }
  meta.links = links.map(({ _key, ...link }) => link);
  return meta;
}

async function enrichSeries(imdbId, meta) {
  const show = await getJson(TVMAZE + "/lookup/shows?imdb=" + encodeURIComponent(imdbId));
  if (!show || !show.id) return meta;
  const [cast, crew] = await Promise.all([
    getJson(TVMAZE + "/shows/" + show.id + "/cast"),
    getJson(TVMAZE + "/shows/" + show.id + "/crew")
  ]);
  return mergeTvMaze(meta, show, cast || [], crew || []);
}

async function getMeta(kind, imdbId) {
  const base = await getJson(CINEMETA + "/meta/" + kind + "/" + imdbId + ".json");
  if (!base || !base.meta) return {};
  if (kind === "series") return enrichSeries(imdbId, base.meta);
  return base.meta;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

    const url = new URL(request.url);
    if (url.pathname === "/health") return json({ ok: true, service: MANIFEST.name, version: MANIFEST.version });
    if (url.pathname === "/manifest.json") return json(MANIFEST, 200, { "Cache-Control": "public, max-age=86400" });

    const match = url.pathname.match(/^\/(?:meta|metadata)\/(movie|series)\/(tt\d+)\.json$/i);
    if (!match) return json({ error: "Not found" }, 404);

    const kind = match[1].toLowerCase();
    const imdbId = match[2].toLowerCase();
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    try {
      const meta = await getMeta(kind, imdbId);
      const response = json({ meta });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch {
      return json({ error: "Public metadata sources are temporarily unavailable" }, 503, { "Cache-Control": "no-store" });
    }
  }
};
