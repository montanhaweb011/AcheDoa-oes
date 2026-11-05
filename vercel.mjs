// Frontend and API share the same origin; authentication cookies stay first-party.
export const config = {
  framework: "vite",
  installCommand: "npm ci",
  buildCommand: "npm run build:vercel",
  outputDirectory: "frontend/dist",
  functions: { "api/index.ts": { maxDuration: 30 } },
  rewrites: [
    { source: "/api/:path*", destination: "/api" },
    { source: "/((?!api(?:/|$)).*)", destination: "/index.html" },
  ],
};
