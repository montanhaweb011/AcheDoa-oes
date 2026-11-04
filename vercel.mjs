// Hospeda apenas o frontend na Vercel. A API e o SQLite precisam ficar em
// outro serviço com armazenamento persistente (consulte GUIA-GITHUB-VERCEL.md).
// Na Vercel, defina API_PROXY_ORIGIN com a URL HTTPS do backend, sem /api.
const apiOrigin = (process.env.API_PROXY_ORIGIN || "").trim().replace(/\/+$/, "");
const apiReady = /^https:\/\/[^\s/]+$/i.test(apiOrigin);

export const config = {
  framework: "vite",
  installCommand: "npm ci",
  buildCommand: "npm run build -w frontend",
  outputDirectory: "frontend/dist",
  rewrites: [
    // A configuração precisa ser válida até durante a importação inicial,
    // quando as variáveis de ambiente podem ainda não ter sido cadastradas.
    ...(apiReady
      ? [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }]
      : []),
    // Impede fallback SPA em /api sem backend ativo (HTML 200 quebrava o React).
    { source: "/((?!api(?:/|$)).*)", destination: "/index.html" },
  ],
};
