import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "FrotaGest",
        short_name: "FrotaGest",
        description: "Manutenção da sua frota, em dia.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f5f7fa",
        theme_color: "#123c36",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        globIgnores: ["**/api-docs/**"],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { proxy: { "/api": "http://localhost:8000" } },
});
