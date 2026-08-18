// Serve assets from the current static path, while still using Vite's base
// when the app is built or served through Vite.
const ASSET_BASE = location.pathname.endsWith("/") ? location.pathname.slice(0, -1) : location.pathname.replace(/\/[^/]*$/, "");
const viteEnv = import.meta.env || {};
const BASE_URL = viteEnv.BASE_URL || `${ASSET_BASE || ""}/`;
const assetPath = (path) => {
  if (path.startsWith("/")) return `${BASE_URL.replace(/\/$/, "")}${path}`;
  return `${ASSET_BASE}${path}`;
};
const DATA_BASE = viteEnv.BASE_URL ? `${BASE_URL}data` : `${ASSET_BASE}/public/data`;
const ROUTE_PREFIX = "#";
const APP_TITLE_DZ = "འབྲུག་གི་ས་གནས་ཀྱི་མིང་།";
const state = {
  places: [],
  hierarchy: [],
  config: null,
  report: null,
  route: { name: "home", params: {} },
  query: new URLSearchParams(location.search).get("q") || "",
  filters: { placeType: "", dzongkhag: "", gewog: "", chiwog: "", corrected: "", dzongkha: "", romanized: "", validated: "" },
  theme: localStorage.getItem("theme") || "system",
  lang: localStorage.getItem("lang") || "en",
  favorites: new Set(JSON.parse(localStorage.getItem("favorites") || "[]")),
  recent: JSON.parse(localStorage.getItem("recentSearches") || "[]"),
};

let searchFrame = 0;
const splashDelay = new Promise((resolve) => setTimeout(resolve, 1000));

const t = {
  en: {
    search: "Search a place name, Dzongkhag, Gewog, Chiwog or code...",
    noResults: "No matching place name found.",
    try: "Try another spelling, Dzongkha name, Dzongkhag, Gewog or Village.",
    browse: "Browse",
    searchNav: "Search",
    about: "About",
    favorites: "Favorites",
    filters: "Filters",
    standardized: "Standardized spelling",
    previous: "Previous spelling",
    copy: "Copy",
    share: "Share",
  },
  dz: {
    search: "ས་གནས་ཀྱི་མིང་འདི་ རྫོང་ཁག་ རྒེད་འོག་ ཡང་ན་ཨང་རྟགས་ཐོག་ལས་འཚོལ།",
    noResults: "ས་གནས་འདི་གི་མིང་འཚོལ་མ་ཐོབ།",
    try: "",
    browse: "འཚོལ།",
    searchNav: "འཚོལ།",
    about: "ང་བཅས་ཀྱི་སྐོར་ལས།",
    favorites: "དགའ་ཤོས།",
    filters: "བརྡ་བཙག།",
    standardized: "གཏན་འཁེལ་ཡིག་སྡེབ།",
    previous: "སྔོན་མའི་ཡིག་སྡེབ།",
    copy: "འདྲ་བཤུས།",
    share: "བརྒྱུད་སྤེལ།",
  },
};

function tr(key) {
  return (t[state.lang] || t.en)[key] || t.en[key] || key;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[_/\\-]+/g, " ")
    .replace(/[^\p{L}\p{N}\u0f00-\u0fff]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const icons = {
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>',
  mapPin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.5a5.5 5.5 0 0 0-.1-7.8Z"></path></svg>',
  filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10m-6 6h2"></path></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="1.5"></rect><path d="M15 9V6.5A1.5 1.5 0 0 0 13.5 5h-8A1.5 1.5 0 0 0 4 6.5v8A1.5 1.5 0 0 0 5.5 16H9"></path></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2"></circle><circle cx="6" cy="12" r="2"></circle><circle cx="18" cy="19" r="2"></circle><path d="m8 11 8-5M8 13l8 5"></path></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.7 15.4A8.5 8.5 0 0 1 8.6 3.3 8.5 8.5 0 1 0 20.7 15.4Z"></path></svg>',
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"></path></svg>',
  grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg>',
};

function icon(name) {
  return `<span class="ui-icon">${icons[name] || ""}</span>`;
}

function highlightText(value) {
  const text = String(value || "");
  const query = state.query.trim();
  if (!query) return escapeHtml(text);
  const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (index < 0) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, index))}<mark>${escapeHtml(text.slice(index, index + query.length))}</mark>${escapeHtml(text.slice(index + query.length))}`;
}

function slug(value) {
  return normalize(value).replace(/\s+/g, "-") || "place";
}

function dzText(value, className = "") {
  return `<span class="dz-text${className ? ` ${className}` : ""}">${escapeHtml(value)}</span>`;
}

function hasDzScript(value) {
  return /[\u0f00-\u0fff]/.test(String(value || ""));
}

function routeHref(path) {
  if (path.startsWith(ROUTE_PREFIX)) return path;
  return `${ROUTE_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
}

function currentRoutePath() {
  if (location.hash && location.hash.length > 1) return decodeURIComponent(location.hash.slice(1));
  return `${location.pathname}${location.search}`;
}

function editDistance(a, b, limit = 3) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let last = prev[0];
    prev[0] = i;
    let min = prev[0];
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j];
      prev[j] = a[i - 1] === b[j - 1] ? last : Math.min(last, prev[j - 1], prev[j]) + 1;
      last = tmp;
      min = Math.min(min, prev[j]);
    }
    if (min > limit) return limit + 1;
  }
  return prev[b.length];
}

function currentPageTitle(detail) {
  const dzTitle = state.config?.appNameDz || APP_TITLE_DZ;
  if (detail?.standardizedName) return `${detail.standardizedName} | ${dzTitle}`;
  if (state.route.name === "browse") return `Browse | ${dzTitle}`;
  if (state.route.name === "about") return `About | ${dzTitle}`;
  if (state.route.name === "favorites") return `Favorites | ${dzTitle}`;
  return `${dzTitle} | Bhutan Standard Place Names`;
}

function preparePlace(place) {
  const searchAliasesNormalized = (place.searchAliasesNormalized && place.searchAliasesNormalized.length)
    ? [...new Set(place.searchAliasesNormalized.filter(Boolean))]
    : [...new Set((place.searchAliases || []).map((alias) => normalize(alias)).filter(Boolean))];
  return {
    ...place,
    standardizedNameNorm: normalize(place.standardizedName),
    existingNameNorm: normalize(place.existingName),
    dzongkhaNameNorm: normalize(place.dzongkhaName),
    romanizedNameNorm: normalize(place.romanizedName),
    dzongkhagNorm: normalize(place.dzongkhag),
    gewogNorm: normalize(place.gewog),
    chiwogNorm: normalize(place.chiwog),
    validationStatusNorm: normalize(place.validationStatus),
    searchAliasesNormalized,
    searchTextNormalized: place.searchTextNormalized || normalize(place.searchText || searchAliasesNormalized.join(" ")),
  };
}

function scorePlace(place, rawQuery) {
  const q = normalize(rawQuery);
  if (!q) return 1;
  const aliases = place.searchAliasesNormalized || [];
  let best = 0;
  if (place.standardizedNameNorm === q) return 1000;
  if (place.dzongkhaNameNorm === q) return 960;
  if (place.romanizedNameNorm === q) return 930;
  if (place.existingNameNorm === q) return 900;
  if ([place.villageCode, place.gewogCode, place.chiwogCode].includes(q)) return 880;
  for (const n of aliases) {
    if (n === q) {
      best = Math.max(best, 850);
    } else if (n.startsWith(q)) {
      best = Math.max(best, 720 - n.length / 100);
    } else if (n.includes(q)) {
      best = Math.max(best, 580 - n.indexOf(q) / 10);
    } else if (q.length > 2 && n.length > 2) {
      const words = n.split(" ");
      const near = Math.min(...words.map((word) => editDistance(q, word, q.length > 6 ? 3 : 2)));
      if (near <= (q.length > 6 ? 3 : 2)) best = Math.max(best, 420 - near * 40);
    }
  }
  if (place.searchTextNormalized && place.searchTextNormalized.includes(q)) best = Math.max(best, 500);
  return best;
}

function filteredPlaces() {
  const q = state.query;
  return state.places
    .map((place) => ({ place, score: scorePlace(place, q) }))
    .filter(({ place, score }) => {
      if (q && score <= 0) return false;
      if (state.filters.placeType && place.placeType !== state.filters.placeType) return false;
      if (state.filters.dzongkhag && place.dzongkhag !== state.filters.dzongkhag) return false;
      if (state.filters.gewog && place.gewog !== state.filters.gewog) return false;
      if (state.filters.chiwog && place.chiwog !== state.filters.chiwog) return false;
      if (state.filters.corrected === "yes" && normalize(place.existingName) === normalize(place.standardizedName)) return false;
      if (state.filters.dzongkha === "yes" && !place.dzongkhaName) return false;
      if (state.filters.romanized === "yes" && !place.romanizedName) return false;
      if (state.filters.validated === "yes" && place.validationStatusNorm !== "yes") return false;
      return true;
    })
    .sort((a, b) => b.score - a.score || a.place.standardizedName.localeCompare(b.place.standardizedName))
    .map(({ place }) => place);
}

function updateRoute() {
  const rawPath = currentRoutePath();
  const [pathOnly, queryString = ""] = rawPath.split("?");
  const path = pathOnly === "/" ? "/search" : pathOnly;
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "about") state.route = { name: "about", params: {} };
  else if (parts[0] === "browse") state.route = { name: "browse", params: { dzongkhag: decodeURIComponent(parts[1] || ""), gewog: decodeURIComponent(parts[2] || "") } };
  else if (parts[0] === "place") state.route = { name: "place", params: { id: decodeURIComponent(parts[1] || "") } };
  else if (parts[0] === "favorites") state.route = { name: "favorites", params: {} };
  else state.route = { name: "home", params: {} };
  state.query = new URLSearchParams(queryString || location.search).get("q") || state.query || "";
}

function navigate(path) {
  history.pushState(null, "", routeHref(path));
  updateRoute();
  render();
}

function setQuery(value, push = false) {
  state.query = value;
  if (value.trim()) {
    const recent = [value.trim(), ...state.recent.filter((x) => x !== value.trim())].slice(0, 8);
    state.recent = recent;
    localStorage.setItem("recentSearches", JSON.stringify(recent));
  }
  const target = routeHref(`/search${value ? `?q=${encodeURIComponent(value)}` : ""}`);
  if (push) history.pushState(null, "", target);
  else history.replaceState(null, "", target);
  state.route = { name: "home", params: {} };
  scheduleSearchView();
}

function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

function toggleFavorite(id) {
  state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
  localStorage.setItem("favorites", JSON.stringify([...state.favorites]));
  if (state.route.name === "home") updateSearchView();
  else render();
}

function selectOptions(values, selected) {
  return [`<option value="">All</option>`, ...[...new Set(values.filter(Boolean))].sort().map((v) => `<option ${v === selected ? "selected" : ""}>${escapeHtml(v)}</option>`)].join("");
}

function htmlForText(text) {
  return state.lang === "dz" ? `<span class="dz-text">${escapeHtml(text)}</span>` : escapeHtml(text);
}

function recentButtonClass(value) {
  return hasDzScript(value) ? "dz-script" : "";
}

function pageNav(homeLabel = "Home") {
  return `<div class="page-nav"><button type="button" data-action="back">Back</button><a href="${routeHref("/search")}" data-link>${escapeHtml(homeLabel)}</a></div>`;
}

function hasActiveFilters() {
  return Object.values(state.filters).some(Boolean);
}

function statsValue(key) {
  const homeTotals = { gewogs: 205, chiwogs: 1044 };
  if (key in homeTotals) return homeTotals[key];
  const stats = state.config?.stats || {};
  return stats[key] ?? "—";
}

function homeOverview() {
  const spotlights = [
    ["Records", statsValue("usablePlaceNameRecords")],
    ["Dzongkhags", statsValue("dzongkhags")],
    ["Gewogs", statsValue("gewogs")],
    ["Chiwogs", statsValue("chiwogs")],
    ["Villages", statsValue("villages")],
  ];
  return `
    <section class="home-overview">
      <div class="overview-bar">
        ${spotlights.map(([label, value]) => `<div class="overview-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
      </div>
      <div class="overview-strip">
        <div>
          <span class="overview-label">Start here</span>
          <p>${escapeHtml(state.config?.subtitle || "Standard English and Dzongkha Place Names of Bhutan")}</p>
        </div>
      </div>
    </section>
  `;
}

function renderShell(content) {
  const cfg = state.config || { appName: "Bhutan Standard Place Names", subtitle: "" };
  return `
    <header class="topbar">
      <a class="brand" href="${routeHref("/search")}" data-link><img src="${assetPath("/logo.png")}" alt="" /><span class="brand-copy"><span class="brand-dz">${escapeHtml(cfg.appNameDz || APP_TITLE_DZ)}</span><span class="brand-en">${escapeHtml(cfg.appName)}</span></span></a>
      <nav class="nav">
        <a href="${routeHref("/browse")}" data-link>${icon("grid")}<span>${htmlForText(tr("browse"))}</span></a>
        <a href="${routeHref("/favorites")}" data-link>${icon("heart")}<span>${htmlForText(tr("favorites"))}</span></a>
        <a href="${routeHref("/about")}" data-link><span>${htmlForText(tr("about"))}</span></a>
      </nav>
      <div class="toggles">
        <button data-action="lang" class="lang-btn" aria-label="Change language">${icon("globe")}<span>${state.lang === "en" ? "EN" : "རྫོང་ཁ"}</span></button>
        <button data-action="theme" class="icon-btn" aria-label="Theme">${icon(state.theme === "dark" ? "moon" : "sun")}</button>
      </div>
    </header>
    <main>${content}</main>
    <nav class="bottom-nav">
      <a href="${routeHref("/search")}" data-link>${icon("search")}<span>${htmlForText(tr("searchNav"))}</span></a>
      <a href="${routeHref("/browse")}" data-link>${icon("grid")}<span>${htmlForText(tr("browse"))}</span></a>
      <a href="${routeHref("/favorites")}" data-link>${icon("heart")}<span>${htmlForText(tr("favorites"))}</span></a>
    </nav>
  `;
}

function searchPanel() {
  const cfg = state.config || { appName: "Bhutan Standard Place Names", appNameDz: APP_TITLE_DZ };
  const dzongkhags = state.hierarchy.map((d) => d.name);
  const placeTypes = [...new Set(state.places.map((p) => p.placeType).filter(Boolean))].sort();
  const gewogs = state.places.filter((p) => !state.filters.dzongkhag || p.dzongkhag === state.filters.dzongkhag).map((p) => p.gewog);
  const chiwogs = state.places.filter((p) => (!state.filters.dzongkhag || p.dzongkhag === state.filters.dzongkhag) && (!state.filters.gewog || p.gewog === state.filters.gewog)).map((p) => p.chiwog);
  return `
    <section class="search-hero">
      <div class="hero-stack">
        <h1 class="hero-dz">${escapeHtml(cfg.appNameDz || APP_TITLE_DZ)}</h1>
        <p class="hero-en">${escapeHtml(cfg.appName || "Bhutan Standard Place Names")}</p>
        <p class="eyebrow">Reference directory</p>
        <p class="hero-description">Find verified, standardized names across Bhutan’s Dzongkhags, Gewogs, Chiwogs and villages.</p>
      </div>
      <label class="search-box">
        ${icon("search")}
        <input id="searchInput" class="${hasDzScript(state.query) || state.lang === "dz" ? "dz-script" : ""}" value="${escapeHtml(state.query)}" placeholder="${tr("search")}" autocomplete="off" />
        <button type="button" class="search-clear" data-action="clear-search" aria-label="Clear search" ${state.query ? "" : "hidden"}>${icon("x")}</button>
        <kbd>/</kbd>
      </label>
      <div class="recent-wrap" ${state.recent.length ? "" : "hidden"}>
        <div class="recent-label"><span>Recent searches</span><button type="button" data-action="clear-recent" class="clear-recent">Clear</button></div>
        <div id="recentSearches" class="recent">${state.recent.map((q) => `<button class="${recentButtonClass(q)}" data-search="${escapeHtml(q)}">${icon("search")}${escapeHtml(q)}</button>`).join("")}</div>
      </div>
    </section>
    <section class="workbench">
      <aside class="filters">
        <details class="filter-panel" open>
        <summary>${icon("filter")}<span>${htmlForText(tr("filters"))}</span><span class="filter-count">${Object.values(state.filters).filter(Boolean).length || ""}</span></summary>
        <div class="filter-body">
        <div class="filter-heading"><span>Refine results</span><button data-action="clear-filters" type="button">Clear all</button></div>
        <label>${htmlForText("Place type")}<select data-filter="placeType"><option value="">All</option>${placeTypes.map((v) => `<option value="${escapeHtml(v)}" ${v === state.filters.placeType ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select></label>
        <label>${htmlForText("Dzongkhag")}<select data-filter="dzongkhag">${selectOptions(dzongkhags, state.filters.dzongkhag)}</select></label>
        <label>${htmlForText("Gewog")}<select data-filter="gewog">${selectOptions(gewogs, state.filters.gewog)}</select></label>
        <label>${htmlForText("Chiwog")}<select data-filter="chiwog">${selectOptions(chiwogs, state.filters.chiwog)}</select></label>
        <label>Corrected<select data-filter="corrected"><option value="">All</option><option value="yes" ${state.filters.corrected === "yes" ? "selected" : ""}>Has correction</option></select></label>
        <label>Dzongkha<select data-filter="dzongkha"><option value="">All</option><option value="yes" ${state.filters.dzongkha === "yes" ? "selected" : ""}>Has Dzongkha</option></select></label>
        <label>Romanized<select data-filter="romanized"><option value="">All</option><option value="yes" ${state.filters.romanized === "yes" ? "selected" : ""}>Has Romanized</option></select></label>
        <label>Validated<select data-filter="validated"><option value="">All</option><option value="yes" ${state.filters.validated === "yes" ? "selected" : ""}>Validated</option></select></label>
        </div></details>
      </aside>
      <div><div id="activeFilters" class="active-filters">${renderActiveFilters()}</div><div id="resultsMount" aria-live="polite">${renderResults(filteredPlaces().slice(0, state.query ? 40 : 24), { home: true })}</div></div>
    </section>
  `;
}

function renderActiveFilters() {
  const labels = { placeType: "Type", dzongkhag: "Dzongkhag", gewog: "Gewog", chiwog: "Chiwog", corrected: "Corrections", dzongkha: "Dzongkha", romanized: "Romanized", validated: "Verified" };
  return Object.entries(state.filters).filter(([, value]) => value).map(([key, value]) => `<button type="button" data-remove-filter="${key}">${escapeHtml(labels[key])}: ${escapeHtml(value === "yes" ? "Yes" : value)} ${icon("x")}</button>`).join("");
}

function renderResults(results, { home = false } = {}) {
  if (!results.length) {
    const tryText = tr("try");
    return `<section class="results empty"><h2>${htmlForText(tr("noResults"))}</h2>${tryText ? `<p>${htmlForText(tryText)}</p>` : ""}</section>`;
  }
  if (home && !state.query.trim() && !hasActiveFilters()) {
    return homeOverview();
  }
  const correction = correctionHint(results);
  return `<section class="results">
    <div class="section-head"><div><h2>${state.query ? `${results.length} matching places` : "Explore standardized place names"}</h2><span>${state.query ? "Instant results from the reference directory" : "Search by place, code, Dzongkha or previous spelling"}</span></div><span class="record-count">${state.config?.stats?.usablePlaceNameRecords || state.places.length} records</span></div>
    ${correction}
    <div class="result-grid">${results.map(placeCard).join("")}</div>
  </section>`;
}

function correctionHint(results) {
  const q = normalize(state.query);
  if (!q) return "";
  const match = results.find((p) => p.existingNameNorm === q && p.standardizedNameNorm && p.standardizedNameNorm !== p.existingNameNorm);
  if (!match) return "";
  return `<aside class="correction-hint">
    <span>Did you mean the standardized spelling?</span>
    <a href="${routeHref(`/place/${encodeURIComponent(match.id)}`)}" data-link><b>${escapeHtml(match.standardizedName)}</b><small>Previous spelling: ${escapeHtml(match.existingName)}</small></a>
  </aside>`;
}

function placeCard(p) {
  const corrected = normalize(p.existingName) && normalize(p.existingName) !== normalize(p.standardizedName);
  return `
    <article class="place-card">
      <div class="card-top">
        <span class="badge">${escapeHtml(p.placeType)}</span>
        <button class="star ${state.favorites.has(p.id) ? "on" : ""}" data-favorite="${p.id}" aria-label="Favorite">${icon("heart")}</button>
      </div>
      <a href="${routeHref(`/place/${encodeURIComponent(p.id)}`)}" data-link class="place-title">${highlightText(p.standardizedName || "Unnamed place")}</a>
      <p class="dz dz-line">${escapeHtml(p.dzongkhaName || "Dzongkha not supplied")}</p>
      <p class="roman">${escapeHtml(p.romanizedName || "Romanization not supplied")}</p>
      <p class="path">${icon("mapPin")}${[p.dzongkhag, p.gewog, p.chiwog].filter(Boolean).map(escapeHtml).join(" <span>›</span> ")}</p>
      ${corrected ? `<div class="comparison"><span>${htmlForText(tr("previous"))}: <b>${escapeHtml(p.existingName)}</b></span><span>${htmlForText(tr("standardized"))}: <b>${escapeHtml(p.standardizedName)}</b></span></div>` : ""}
      <div class="codes">${[p.gewogCode && `Gewog ${p.gewogCode}`, p.chiwogCode && `Chiwog ${p.chiwogCode}`, p.villageCode && `Village ${p.villageCode}`].filter(Boolean).map(escapeHtml).join(" · ")}</div>
    </article>
  `;
}

function browsePage() {
  if (state.route.params.dzongkhag) {
    const dz = state.hierarchy.find((d) => slug(d.name) === state.route.params.dzongkhag || d.name === state.route.params.dzongkhag);
    if (!dz) return `<section class="page">${pageNav()}<h1>Dzongkhag not found</h1></section>`;
    if (state.route.params.gewog) {
      const gewog = dz.gewogs.find((g) => slug(g.name) === state.route.params.gewog || g.name === state.route.params.gewog);
      if (!gewog) return `<section class="page">${pageNav()}<h1>Gewog not found</h1></section>`;
      return `<section class="page">${pageNav()}<p class="breadcrumb">Browse → ${escapeHtml(dz.name)} → ${escapeHtml(gewog.name)}</p><h1>${escapeHtml(gewog.name)}</h1><p class="dz dz-line">${escapeHtml(gewog.dzongkhaName || "")}</p><div class="dz-grid">${gewog.villages.map((v) => `<a class="dz-card" href="${routeHref(`/place/${encodeURIComponent(v.id)}`)}" data-link><b>${escapeHtml(v.name || v.existingName || "Unnamed village")}</b><span class="dz dz-line">${escapeHtml(v.dzongkhaName || "")}</span><span>${escapeHtml(v.code ? `Village code ${v.code}` : "Village")}</span></a>`).join("")}</div></section>`;
    }
    return `<section class="page">${pageNav()}<p class="breadcrumb">Browse → ${escapeHtml(dz.name)}</p><h1>${escapeHtml(dz.name)}</h1><p class="dz dz-line">${escapeHtml(dz.dzongkhaName || "")}</p><div class="dz-grid">${dz.gewogs.map((g) => `<a class="dz-card" href="${routeHref(`/browse/${slug(dz.name)}/${slug(g.name)}`)}" data-link><b>${escapeHtml(g.name)}</b><span class="dz dz-line">${escapeHtml(g.dzongkhaName || "")}</span><span>${g.chiwogCount} Chiwogs · ${g.villageCount} Villages</span></a>`).join("")}</div></section>`;
  }
  return `<section class="page">${pageNav()}<h1>Browse Dzongkhags</h1><div class="dz-grid">${state.hierarchy.map((d) => `<a class="dz-card" href="${routeHref(`/browse/${slug(d.name)}`)}" data-link><b>${escapeHtml(d.name)}</b><span class="dz dz-line">${escapeHtml(d.dzongkhaName || "")}</span><span>${d.gewogCount} Gewogs · ${d.chiwogCount} Chiwogs · ${d.villageCount} Villages</span></a>`).join("")}</div></section>`;
}

function placePage() {
  const p = state.places.find((x) => x.id === state.route.params.id);
  if (!p) return `<section class="page">${pageNav()}<h1>Place not found</h1></section>`;
  const allInfo = [
    `Standard: ${p.standardizedName}`,
    `Dzongkha: ${p.dzongkhaName}`,
    `Romanized: ${p.romanizedName}`,
    `Dzongkhag: ${p.dzongkhag}`,
    `Dzongkhag Dz: ${p.dzongkhagDz}`,
    `Gewog: ${p.gewog}`,
    `Gewog Dz: ${p.gewogDz}`,
    `Chiwog: ${p.chiwog}`,
    `Chiwog Dz: ${p.chiwogDz}`,
    `Existing: ${p.existingName}`,
    `Village code: ${p.villageCode}`,
  ].filter((x) => !x.endsWith(": ")).join("\n");
  document.title = `${p.standardizedName || "Place"} | ${APP_TITLE_DZ}`;
  return `<section class="detail page">
    ${pageNav()}
    <p class="breadcrumb">Bhutan → ${escapeHtml(p.dzongkhag)} → ${escapeHtml(p.gewog)} → ${escapeHtml(p.chiwog)} → ${escapeHtml(p.standardizedName)}</p>
    <div class="detail-head"><div><span class="badge">${escapeHtml(p.placeType)}</span><h1>${escapeHtml(p.standardizedName || "Unnamed place")}</h1><p class="dz dz-line">${escapeHtml(p.dzongkhaName || "")}</p><p class="dz dz-line subtle">${escapeHtml([p.dzongkhagDz, p.gewogDz, p.chiwogDz].filter(Boolean).join("  ·  "))}</p><p>${escapeHtml(p.romanizedName || "")}</p></div><button class="star ${state.favorites.has(p.id) ? "on" : ""}" data-favorite="${p.id}" aria-label="Favorite">${icon("heart")}</button></div>
    ${normalize(p.existingName) !== normalize(p.standardizedName) ? `<div class="spell-box"><div><span>${htmlForText(tr("previous"))}</span><strong>${escapeHtml(p.existingName)}</strong></div><div class="arrow">↓</div><div><span>${htmlForText(tr("standardized"))}</span><strong>${escapeHtml(p.standardizedName)}</strong></div></div>` : ""}
    <div class="info-grid">
      <div><span>Dzongkhag</span><b>${escapeHtml(p.dzongkhag || "Not supplied")}</b><small class="dz dz-line">${escapeHtml(p.dzongkhagDz || "")}</small></div>
      <div><span>Gewog</span><b>${escapeHtml(p.gewog || "Not supplied")}</b><small class="dz dz-line">${escapeHtml(p.gewogDz || "")}</small></div>
      <div><span>Chiwog</span><b>${escapeHtml(p.chiwog || "Not supplied")}</b><small class="dz dz-line">${escapeHtml(p.chiwogDz || "")}</small></div>
      <div><span>Village code</span><b>${escapeHtml(p.villageCode || "Not supplied")}</b></div>
      <div><span>Gewog code</span><b>${escapeHtml(p.gewogCode || "Not supplied")}</b></div>
      <div><span>Chiwog code</span><b>${escapeHtml(p.chiwogCode || "Not supplied")}</b></div>
      <div><span>Validated</span><b>${escapeHtml(p.validationStatus || "Not supplied")}</b></div>
      <div><span>Remarks</span><b>${escapeHtml(p.remarks || "Not supplied")}</b></div>
    </div>
    <div class="actions"><button data-copy="${escapeHtml(p.standardizedName)}">${icon("copy")}<span>${htmlForText(tr("copy"))} English</span></button><button data-copy="${escapeHtml(p.dzongkhaName)}">${icon("copy")}<span>${htmlForText(tr("copy"))} Dzongkha</span></button><button data-copy="${escapeHtml(p.romanizedName)}">${icon("copy")}<span>${htmlForText(tr("copy"))} Romanized</span></button><button data-copy="${escapeHtml(allInfo)}">${icon("copy")}<span>${htmlForText(tr("copy"))} all</span></button><button data-share="${escapeHtml(p.id)}">${icon("share")}<span>${htmlForText(tr("share"))}</span></button></div>
  </section>`;
}

function aboutPage() {
  const english = {
    title: "Background and Rationale",
    paragraphs: [
      "The United Nations Conferences on the Standardization of Geographical Names (UNCSGN) and the United Nations Group of Experts on Geographical Names (UNGEGN) were established in accordance with resolution 715A (XXVII) dated 23 April 1959 of the Economic and Social Council (ECOSOC) with the goal to achieve clear communication through United Nations maps and documents, and thereby avoid ambiguity and confusion in spelling or name application.",
      "The UNCSGN conference, represented by 193 member countries, is held every five (5) years beginning in 1967 to standardize international geographical names as well as to publish and disseminate the geographical names. The UNGEGN, on the other hand, meets twice between two UNCSGN conferences.",
      "In pursuance of the UNGEGN Asia South East (ASE) Division meeting, an Expert Group Meeting was held on 15 December 2021, wherein, it was decided to form a Technical Working Group (TWG) and develop guidelines for the standardisation of geographical names with an aim to have a proper means of defining the written forms of names consistent and standard.",
      "Currently, geographical name database are hosted, managed and administered by different agencies. With agencies maintaining different versions of geographical names resulting in ambiguity and discrepancies, there is a need to have a proper guideline of geographical names or toponyms.",
      "Therefore, this guideline aims to fulfil the recommendations of UN resolutions to standardize and address the ambiguity of geographical names in the country. This would facilitate promulgating decisions with respect to the principles and policies on standardization of geographic nomenclature and orthography.",
    ],
    objectiveTitle: "Objectives",
    objectiveIntro: "The objectives of the guideline are to: -",
    objectives: [
      "a) standardize and geo-locate the geographical names of the country; and",
      "b) promote the usage of standardized geographical names both in the national and international context.",
    ],
  };
  const dzongkha = {
    title: "རྒྱབ་ཁུངས།",
    paragraphs: [
      "འཛམ་གླིང་སྤྱི་ཚོགས་ཀྱི་སྲབ་ཁྲ་དང་ཡིག་ཆའི་ཐོག་ལས་མགུ་འཐོམ་པའི་གོ་དོན་རྙོག་དྲགས་ཚུ་སྤང་སྟེ་ཡིག་སྡེབ་བསྒྲིག་ནི་ ཡང་ན་ མིང་གནས་ལག་ལེན་འཐབ་ནི་དང་ བརྡ་སྤྲོད་གསལ་ཏོག་ཏོ་སྦེ་སྤྲོད་ནི་ལུ་དམིགས་ ཏེ་འཛམ་གླིང་སྤྱི་ཚོགས་ས་ཆའི་མིང་གནས་ཚད་ལྡན་བཟོ་ནི་གུ་འཛམགླིང་སྤྱི་ཚོགས་ཀྱི་གྲོས་ཚོགས་UNCSGN(ཡུ་ཨེན་སི་ཨེསི་ཇི་ཨེན) དང་ འཛམགླིང་སྤྱི་ཚོགས་ཀྱི་ས་ཆའི་མིང་གནས་མཁས་ཚོགས་UNGEGN (ཡུ་ཨེན་ཇི་ཨི་ཇི་ཨེན་) དེ་ དཔལ་འབྱོར་དང་སྤྱི་སྡེའི་ཚོགས་སྡེ་ (ECOSOC) (ཨི་སི་ཨོ་ཨེསི་ཨོ་སི་) སྤྱི་ལོ་༡༩༥༩ སྤྱི་ཟླ་ ༤ པའི་ཚེས་༢༣ གྱི་གྲོས་ཆོད་ ༧༡༥A (XXVII) པ་དང་འཁྲིལ་གཞི་བཙུགས་ འབད་ནུག།",
      "རྒྱལ་སྤྱིའི་ས་ཆའི་མིང་གནས་ཚད་ལྡན་བཟོ་ནི་དང་ པར་སྐྲུན་འབད་དེ་དར་ཁྱབ་གཏང་ནིའི་དོན་ལུ་ འཛམ་ གླིང་སྤྱི་ཚོགས་མིང་གནས་ཚད་ལྡན་བཟོ་ནི་གུར་ འཛམ་གླིང་སྤྱི་ཚོགས་ཀྱི་གྲོས་ཚོགས་UNCSGN (ཡུ་ ཨེན་སི་ཨེསི་ཇི་ཨེན)་ནང་ སྤྱི་ལོ་ ༡༩༦༧ ལས་འགོ་བཟུང་ ལོ་ ༥ འི་ནང་ཚར་རེ་འགོ་འདྲེན་འཐབ་མི་ནང་ རྒྱལ་ཁབ་ ༡༩༣ གྱིས་བཅའ་མར་གཏོགས་དོ་ཡོདཔ་ཨིན་རུང་ ཡུ་ཨེན་ཇི་ཨི་ཇི་ཨེན་འདི་ ཡུ་ཨེན་སི་ཨེསི་ ཇི་ཨེན་གྱི་བར་ན་ ཚར་གཉིས་གྲོས་འཛོམས་ཚོགསཔ་ཨིན་པས།",
      "(UNGEGN) ཡུ་ཨེན་ཇི་ཨི་ཇི་ཨེན་ ཤར་ལྷོ་ཨེ་ཤི་ཡ་གི་སྡེ་ཚན་ཞལ་འཛོམས་དང་འཁྲིལ་ སྤྱི་ལོ་ ༢༠༢༡ ཟླ་ ༡༢ པའི་ཚེས་༡༥ ལུ་ མཁས་ཚོགས་ཀྱི་ཞལ་འཛོམས་ཅིག་འགོ་འདྲེན་འཐབ་ཡོད་མི་ནང་ ཁྱད་རིག་གི་ལས་བྱེད་ཚོགས་ཆུང་ཅིག་གཞི་བཙུགས་འབད་དེ་ཡིག་ཐོག་ལུ་བཀོདཔའི་ས་ཆའི་མིང་གནསཚུ་ཤོ་མཚུངས་དང་ཚད་ལྡན་གྱི་དོན་ལུ་དམིགས་ཏེ་ལམ་སྟོན་བཟོ་ནི་སྦེ་གྲོས་ཐག་བཅད་ཡོད།",
      "ད་ལྟོ་ ས་ཆའི་མིང་གི་གནས་སྡུད་གཞི་མཛོད་ཚུ་ ལས་སྡེ་སོ་སོ་གིས་འགོ་འདྲེན་ཐོག་ འཛིན་སྐྱོང་ དང་བདག་སྐྱོང་འཐབ་སྟེ་འདུག། དེ་སྦེ་ལས་སྡེ་ཚུ་གིས་ མིང་གནས་ཐོན་རིམ་མ་འདྲཝ་སྦེ་རྒྱུན་སྐྱོང་ འཐབ་ནི་དེ་གིས་གོ་དོན་རྙོག་དྲགས་དང་ཁྱད་པར་བཞུགས་ཡོདཔ་ལས་བརྟེན་མིང་གནས་དང་ས་དབྱིབས་ལས་འབྱུང་བའི་མིང་ཚུ་གི་ལམ་སྟོན་ཅིག་དགོཔ་འདུག།",
      "དེ་འབད་ནི་དེ་གིས་ ལམ་སྟོན་འདི་ལས་བརྟེན་ རྒྱལ་ཁབ་ནང་གི་ མིང་གནས་ཚད་ལྡན་ བཟོ་ཞིནམ་ལས་གོ་དོན་རྙོག་དྲགས་ཡོད་མི་ཚུ་སེལ་ཏེ་འཛིམ་གླིང་སྤྱི་ཚོགས་ཀྱི་གྲོས་ཆོད་རྒྱབ་སྣོན་ཚུ་འགྲུབ་ནི་ལུ་དམིགས་གཏད་བསྐྱེདཔ་ཨིན། འདི་གིས་འབད་ས་ཆའི་མིང་གནས་དང་སྡེབ་སྦྱོར་ཚད་ལྡན་ བཟོ་ནིའི་གཞི་རྩ་དང་སྲིད་བྱུས་ཚུ་དང་འབྲེལ་བའི་གྲོས་ཆོད་ཚུ་དར་ཁྱབ་གཏང་ནི་ལུ་ལྷན་ཐབས་འབད་འོང་།",
    ],
    objectiveTitle: "དམིགས་དོན།",
    objectiveIntro: "ལམ་སྟོན་འདི་གི་དམིགས་དོན་ཡང་།",
    objectives: [
      "ཀ༽ རྒྱལ་ཁྱབ་ཀྱི་ས་ཆའི་མིང་གནས་ཚུ་ཚད་ལྡན་བཟོ་ནི་དང་སབ་ཁྲ་ནང་བཀོད་ནི།",
      "ཁ༽ ཚད་ལྡན་ཅན་གྱི་ས་ཆའི་མིང་གནས་ཚུ་རྒྱལ་ཡོངས་དང་རྒྱལ་སྤྱི་གཉིས་ཆ་ར་ནང་ལག་ལེན་འཐབ་ནི་ལུ་དར་ཁྱབ་གཏང་ནི།",
    ],
  };
  const content = state.lang === "dz" ? dzongkha : english;
  const dzClass = state.lang === "dz" ? " dz about-dz" : "";
  return `<section class="page about-page${dzClass}">${pageNav()}<h1>${escapeHtml(content.title)}</h1>${content.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}<h2>${escapeHtml(content.objectiveTitle)}</h2><p>${escapeHtml(content.objectiveIntro)}</p><div class="objective-list">${content.objectives.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div></section>`;
}

function favoritesPage() {
  const places = state.places.filter((p) => state.favorites.has(p.id));
  return `<section class="page">${pageNav()}<h1>Favorites</h1>${renderResults(places, { home: false })}</section>`;
}

function render() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.lang = state.lang === "dz" ? "dz" : "en";
  document.title = currentPageTitle(state.route.name === "place" ? state.places.find((x) => x.id === state.route.params.id) : null);
  const body = state.route.name === "browse" ? browsePage() : state.route.name === "place" ? placePage() : state.route.name === "about" ? aboutPage() : state.route.name === "favorites" ? favoritesPage() : searchPanel();
  document.querySelector("#app").innerHTML = renderShell(body);
  bindEvents();
}

function updateSearchView() {
  const input = document.querySelector("#searchInput");
  if (input) {
    if (input.value !== state.query) input.value = state.query;
    input.classList.toggle("dz-script", hasDzScript(state.query) || state.lang === "dz");
  }
  document.querySelector('[data-action="clear-search"]')?.toggleAttribute("hidden", !state.query);
  const recent = document.querySelector("#recentSearches");
  if (recent) recent.innerHTML = state.recent.map((q) => `<button class="${recentButtonClass(q)}" data-search="${escapeHtml(q)}">${icon("search")}${escapeHtml(q)}</button>`).join("");
  document.querySelector(".recent-wrap")?.toggleAttribute("hidden", !state.recent.length);
  const activeFilters = document.querySelector("#activeFilters");
  if (activeFilters) activeFilters.innerHTML = renderActiveFilters();
  const resultsMount = document.querySelector("#resultsMount");
  if (resultsMount) resultsMount.innerHTML = renderResults(filteredPlaces().slice(0, state.query ? 40 : 24), { home: true });
  document.title = currentPageTitle();
  bindSearchEvents();
}

function scheduleSearchView() {
  if (searchFrame) cancelAnimationFrame(searchFrame);
  searchFrame = requestAnimationFrame(() => {
    searchFrame = 0;
    updateSearchView();
  });
}

function setFilter(name, value) {
  state.filters[name] = value;
  if (name === "dzongkhag") {
    state.filters.gewog = "";
    state.filters.chiwog = "";
  }
  if (name === "gewog") state.filters.chiwog = "";
}

function bindEvents() {
  document.querySelectorAll("[data-link]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    navigate(a.getAttribute("href"));
  }));
  bindSearchEvents();
  document.querySelectorAll("[data-filter]").forEach((el) => el.addEventListener("change", (e) => {
    setFilter(e.target.dataset.filter, e.target.value);
    render();
  }));
  document.querySelectorAll("[data-share]").forEach((b) => b.addEventListener("click", async () => {
    const url = `${location.origin}${location.pathname}#${`/place/${b.dataset.share}`}`;
    if (navigator.share) await navigator.share({ title: document.title, url });
    else copyText(url);
  }));
  document.querySelector('[data-action="lang"]')?.addEventListener("click", () => {
    state.lang = state.lang === "en" ? "dz" : "en";
    localStorage.setItem("lang", state.lang);
    render();
  });
  document.querySelector('[data-action="theme"]')?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", state.theme);
    render();
  });
  document.querySelector('[data-action="clear-recent"]')?.addEventListener("click", () => {
    state.recent = [];
    localStorage.removeItem("recentSearches");
    if (state.route.name === "home") updateSearchView();
    else render();
  });
  document.querySelector('[data-action="clear-search"]')?.addEventListener("click", () => setQuery(""));
  document.querySelector('[data-action="back"]')?.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else navigate("/search");
  });
  document.querySelector('[data-action="clear-filters"]')?.addEventListener("click", () => {
    Object.keys(state.filters).forEach((key) => { state.filters[key] = ""; });
    render();
  });
  document.querySelectorAll("[data-remove-filter]").forEach((button) => button.addEventListener("click", () => {
    setFilter(button.dataset.removeFilter, "");
    render();
  }));
}

function bindSearchEvents() {
  const input = document.querySelector("#searchInput");
  if (input) {
    input.oninput = (e) => {
      const nextValue = e.target.value;
      input.classList.toggle("dz-script", hasDzScript(nextValue) || state.lang === "dz");
      setQuery(nextValue);
    };
    // When Enter is pressed, push the query and surface results (useful on mobile)
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = input.value || "";
        setQuery(val, true);
        const filterPanel = document.querySelector('.filter-panel');
        if (filterPanel && filterPanel.hasAttribute('open')) filterPanel.removeAttribute('open');
        const results = document.querySelector('#resultsMount');
        if (results) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
  }
  document.querySelectorAll("[data-search]").forEach((b) => b.addEventListener("click", () => setQuery(b.dataset.search)));
  document.querySelectorAll("[data-favorite]").forEach((b) => b.addEventListener("click", () => toggleFavorite(b.dataset.favorite)));
  document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => {
    copyText(b.dataset.copy);
    b.classList.add("copied");
    b.innerHTML = `${icon("check")}<span>Copied</span>`;
    setTimeout(() => render(), 1200);
  }));
}

window.addEventListener("popstate", () => {
  updateRoute();
  render();
});

window.addEventListener("hashchange", () => {
  updateRoute();
  render();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    e.preventDefault();
    document.querySelector("#searchInput")?.focus();
  }
  if (e.key === "Escape") setQuery("");
});

async function init() {
  try {
    const [[places, hierarchy, config, report]] = await Promise.all([
      Promise.all([
        fetch(`${DATA_BASE}/places.json`).then((r) => r.json()),
        fetch(`${DATA_BASE}/hierarchy.json`).then((r) => r.json()),
        fetch(`${DATA_BASE}/config.json`).then((r) => r.json()),
        fetch(`${DATA_BASE}/data-validation-report.json`).then((r) => r.json()),
      ]),
      splashDelay,
    ]);
    Object.assign(state, { places: places.map(preparePlace), hierarchy, config, report });
    updateRoute();
    render();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register(assetPath("/sw.js"));
  } catch (error) {
    document.querySelector("#app").innerHTML = `<main class="page"><h1>We couldn't load the place-name database.</h1><p>Please try again.</p></main>`;
  }
}

init();
