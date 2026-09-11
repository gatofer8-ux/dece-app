// Service worker para Sistema DECE:
// 1. Soporte de Notificaciones Push (recordatorios de citas y avisos).
// 2. Modo Offline y PWA: Caché de recursos estáticos y fallback a /offline ante corte de conexión.

const CACHE_NAME = "dece-app-shell-v1";
const OFFLINE_URL = "/offline";

const PRECACHE_ASSETS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Precargar recursos estáticos básicos sin bloquear la instalación si alguno falla
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          fetch(url, { cache: "no-cache" }).then((res) => {
            if (res.ok) return cache.put(url, res);
          }).catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepción de peticiones para modo sin conexión
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignorar peticiones no GET o de extensiones de navegador
  if (req.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // No interceptar peticiones de autenticación, backups o descargas pesadas
  if (url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/api/backup")) {
    return;
  }

  // Para navegación de páginas HTML
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedOffline = await cache.match(OFFLINE_URL);
        if (cachedOffline) return cachedOffline;
        const cachedRoot = await cache.match("/");
        if (cachedRoot) return cachedRoot;
        return new Response("Sin conexión a internet. Accede al Centro Offline cuando esté disponible.", {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      })
    );
    return;
  }

  // Para assets estáticos de Next.js (_next/static, fuentes, imágenes locales)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".css")
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          if (response.ok && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        }).catch(() => cached || new Response("", { status: 408 }));
      })
    );
    return;
  }
});

// Gestión de notificaciones push
self.addEventListener("push", (event) => {
  let data = { title: "Sistema de Gestión DECE", body: "Tienes una notificación nueva.", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
