/* Cache only immutable assets and audited, data-free app shell routes. Profile,
   contact, and auth data come from the client store/API and are never cached here. */
const CACHE = "buildermatch-shell-v10";
const SHELLS = new Set([
  "/app",
  "/app/people",
  "/app/scan",
  "/app/discover",
  "/app/projects",
  "/app/collaboration",
  "/app/events",
  "/app/map",
  "/app/follow-ups",
  "/app/nearby",
  "/app/profile",
  "/app/settings",
]);
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const shell = await fetch("/app", { cache: "reload" });
      if (!shell.ok) throw new Error("App shell unavailable");
      const html = await shell.clone().text();
      await cache.put("/app", shell);
      const assets = [
        ...new Set(
          [...html.matchAll(/(?:src|href)="([^"<>]+)"/g)]
            .map((m) => m[1].replaceAll("&amp;", "&"))
            .filter((path) => path.startsWith("/_next/static/")),
        ),
      ];
      await cache.addAll([...assets, "/icon.svg", "/manifest.webmanifest"]);
    })(),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("buildermatch-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_STATIC" || !Array.isArray(event.data.urls))
    return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        event.data.urls.slice(0, 250).map(async (value) => {
          try {
            const url = new URL(value, self.location.origin);
            if (
              url.origin !== self.location.origin ||
              !url.pathname.startsWith("/_next/static/")
            )
              return;
            if (await cache.match(url.href)) return;
            const response = await fetch(url.href, { cache: "force-cache" });
            if (response.ok) await cache.put(url.href, response);
          } catch {
            /* A later asset event can retry an unavailable resource. */
          }
        }),
      );
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (
    req.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/")
  )
    return;
  // Next's RSC responses are not HTML shells and must never be cached as one.
  if (req.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/avatars/") ||
    url.pathname.startsWith("/brands/") ||
    url.pathname.startsWith("/icon")
  ) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              event.waitUntil(
                caches.open(CACHE).then((cache) => cache.put(req, copy)),
              );
            }
            return response;
          }),
      ),
    );
    return;
  }
  if (
    req.mode === "navigate" &&
    (url.pathname === "/app" || url.pathname.startsWith("/app/"))
  ) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (SHELLS.has(url.pathname) && response.ok) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE).then((cache) => cache.put(url.pathname, copy)),
            );
          }
          return response;
        })
        .catch(
          async () =>
            (await caches.match(url.pathname)) ||
            (url.pathname !== "/app"
              ? Response.redirect(self.location.origin + "/app", 302)
              : Response.error()),
        ),
    );
  }
});
