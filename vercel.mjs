// Configure API_PROXY_ORIGIN na Vercel com a URL HTTPS do backend
// (sem barra final), por exemplo https://meu-backend.onrender.com.
const raw = process.env.API_PROXY_ORIGIN?.trim().replace(/\/$/, "");
if (!raw || !/^https:\/\/[^\s/]+$/i.test(raw)) {
  throw new Error(
    "Defina API_PROXY_ORIGIN (https://seu-backend) nas variáveis da Vercel. " +
      "O AcheDoações depende de uma API e banco persistente.",
  );
}

export const config = {
  framework: "vite",
  installCommand: "npm ci",
  buildCommand: "npm run build -w frontend",
  outputDirectory: "frontend/dist",
  rewrites: [
    { source: "/api/:path*", destination: `${raw}/api/:path*` },
    { source: "/:path*", destination: "/index.html" },
  ],
};
