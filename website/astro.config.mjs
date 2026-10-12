import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  output: "static",
  server: { host: "127.0.0.1", port: 4322 },
  image: { remotePatterns: [{ protocol: "https", hostname: "nikass.ru", pathname: "/wp-content/uploads/**" }] },
  integrations: [react()],
});
