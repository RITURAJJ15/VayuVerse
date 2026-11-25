// VayuVerse Service Worker for Web Push & Environmental Alerts
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || "VayuVerse Air Quality Alert";
    const options = {
      body: payload.body || "Ambient environmental conditions have changed.",
      icon: payload.icon || "/images/botanical-hero-clean.jpg",
      badge: payload.badge || "/images/botanical-hero-clean.jpg",
      tag: payload.tag || "vayuverse-air-alert",
      data: payload.data || { url: "/dashboard" },
      silent: true,
      requireInteraction: payload.severity === "Severe",
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.warn("[VayuVerse SW] Push notification error:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
