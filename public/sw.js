self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (response.redirected) {
            return Response.redirect(response.url, 303);
          }

          return response;
        } catch {
          return Response.redirect("/gallery?error=Upload%20aus%20dem%20Teilen-Men%C3%BC%20fehlgeschlagen.", 303);
        }
      })()
    );
  }
});
