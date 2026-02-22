/* Service Worker mínimo para permitir "Adicionar ao ecrã inicial" no Chrome */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
