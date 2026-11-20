const TMDB_API = "https://api.themoviedb.org/3";
const IMAGE = "https://image.tmdb.org/t/p";

const MANIFEST = {
  id: "org.hashimfaisal.nuvio.cinematic-enrichment",
  version: "0.1.0",
  name: "Nuvio Cinematic Enrichment",
  description: "Expanded movie and series metadata: cast roles, directors, writers, ratings, studios, networks and artwork.",
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
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      ...extra
    }
  });
}

async function tmdb(path, env, params = {}) {
  if (!env.TMDB_API_KEY) throw new Error("TMDB_API_KEY is not configured");
  const url = new URL(TMDB_API + path);
  url.search = new URLSearchParams({
    api_key: env.TMDB_API_KEY,
    language: "en-US",
    ...params
  }).toString();

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("TMDB request failed with status " + response.status);
  }
  return response.json();
}

function addLink(links, category, name, url) {
  if (!name) return;
  const key = category + "|" + name;
  if (links.some(item => item._key === key)) return;
  links.push({ name: String(name).slice(0, 120), category, url: url || "https://www.themoviedb.org" , _key: key });
}

function cleanLinks(links) {
  return links.map(({ _key, ...link }) => link);
}

function mapMeta(item, kind, imdbId) {
  const isMovie = kind === "movie";
  const credits = item.credits || {};
  const cast = (credits.cast || []).slice(0, 20);
  const crew = credits.crew || [];
  const directors = crew.filter(p => p.job === "Director").slice(0, 5);
  const writers = crew.filter(p => /writer|screenplay|story|teleplay/i.test(p.job || "")).slice(0, 8);
  const links = [];

  for (const person of cast) {
    const role = person.character ? " — " + person.character : "";
    addLink(links, "actor", person.name + role, person.id ? "https://www.themoviedb.org/person/" + person.id : null);
  }
  for (const person of directors) addLink(links, "director", person.name, "https://www.themoviedb.org/person/" + person.id);
  for (const person of writers) addLink(links, "writer", person.name + (person.job ? " (" + person.job + ")" : ""), "https://www.themoviedb.org/person/" + person.id);

  const companies = item.production_companies || [];
  for (const company of companies.slice(0, 12)) {
    addLink(links, "production company", company.name, company.id ? "https://www.themoviedb.org/company/" + company.id : null);
  }
  for (const network of (item.networks || []).slice(0, 8)) {
    addLink(links, "network", network.name, network.id ? "https://www.themoviedb.org/network/" + network.id : null);
  }
  for (const creator of (item.created_by || []).slice(0, 8)) {
    addLink(links, "creator", creator.name, "https://www.themoviedb.org/person/" + creator.id);
  }
  for (const genre of (item.genres || []).slice(0, 12)) addLink(links, "genre", genre.name, "https://www.themoviedb.org/genre");
  if (imdbId) addLink(links, "external", "IMDb", "https://www.imdb.com/title/" + imdbId);

  if (typeof item.vote_average === "number" && item.vote_count) {
    addLink(links, "rating", "TMDB rating: " + item.vote_average.toFixed(1) + "/10 · " + item.vote_count.toLocaleString("en-US") + " votes", "https://www.themoviedb.org/" + (isMovie ? "movie/" : "tv/") + item.id);
  }

  const date = isMovie ? item.release_date : item.first_air_date;
  const year = date ? date.slice(0, 4) : "";
  let releaseInfo = year;
  if (!isMovie && item.last_air_date && item.status === "Ended") {
    const endYear = item.last_air_date.slice(0, 4);
    if (year && endYear && year !== endYear) releaseInfo = year + "-" + endYear;
  } else if (!isMovie && year && item.status !== "Ended") {
    releaseInfo = year + "-";
  }

  const poster = item.poster_path ? IMAGE + "/w500" + item.poster_path : undefined;
  const background = item.backdrop_path ? IMAGE + "/w1280" + item.backdrop_path : undefined;
  const meta = {
    id: imdbId,
    type: kind,
    name: item.title || item.name || "Unknown title",
    posterShape: "poster",
    description: [item.tagline, item.overview].filter(Boolean).join("\n\n"),
    releaseInfo,
    released: date ? new Date(date + "T00:00:00.000Z").toISOString() : undefined,
    poster,
    background,
    genres: (item.genres || []).map(g => g.name),
    cast: cast.map(p => p.name),
    director: directors.map(p => p.name),
    links: cleanLinks(links),
    runtime: isMovie
      ? (item.runtime ? item.runtime + "m" : undefined)
      : (item.episode_run_time && item.episode_run_time[0] ? item.episode_run_time[0] + "m per episode" : undefined),
    language: item.original_language,
    country: (item.production_countries || []).map(c => c.name).join(", ") || undefined,
    website: item.homepage || undefined,
    trailers: (item.videos?.results || [])
      .filter(v => v.site === "YouTube" && v.type === "Trailer")
      .slice(0, 3)
      .map(v => ({ source: v.key, type: "Trailer" }))
  };

  for (const key of Object.keys(meta)) {
    if (meta[key] === undefined || meta[key] === "") delete meta[key];
  }
  return meta;
}

async function getMeta(kind, imdbId, env) {
  const found = await tmdb("/find/" + encodeURIComponent(imdbId), env, { external_source: "imdb_id" });
  if (!found) return {};
  const candidates = kind === "movie" ? found.movie_results : found.tv_results;
  const match = candidates && candidates[0];
  if (!match) return {};

  const detailsPath = (kind === "movie" ? "/movie/" : "/tv/") + match.id;
  const details = await tmdb(detailsPath, env, {
    append_to_response: "credits,videos,external_ids"
  });
  if (!details) return {};
  return mapMeta(details, kind, imdbId);
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
      const meta = await getMeta(kind, imdbId, env);
      const response = json({ meta }, 200);
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (error) {
      const message = error && error.message === "TMDB_API_KEY is not configured"
        ? "The metadata service is not configured yet"
        : "Metadata provider is temporarily unavailable";
      return json({ error: message }, 503, { "Cache-Control": "no-store" });
    }
  }
};
