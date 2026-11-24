import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Todas las páginas muestran datos privados del usuario conectado, así que se
  // generan siempre al momento (sin caché de componentes).
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
