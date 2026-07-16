// Service Worker do Gestor de Horas (ORBEEX)
// Estratégia: sempre busca a versão mais nova na rede quando online (pra você nunca
// ficar presa numa versão antiga do app depois de uma atualização), e só usa o
// cache como reserva quando está sem internet. Chamadas ao Supabase NUNCA são
// cacheadas, pra não mostrar dados desatualizados.

const CACHE_NAME = 'gestor-horas-v1';
const APP_SHELL = [
  './index.html',
  './login.html',
  './redefinir-senha.html',
  './config.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Só cuida de requisições GET do próprio domínio (arquivos do app).
  // Tudo que for Supabase, CDN externo (fontes, ícones, libs) ou POST/PUT/DELETE
  // passa direto pela rede, sem interferência do cache.
  const mesmaOrigem = url.origin === self.location.origin;
  if (req.method !== 'GET' || !mesmaOrigem) {
    return; // deixa o navegador tratar normalmente
  }

  event.respondWith(
    fetch(req)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copia)).catch(() => {});
        return resposta;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
