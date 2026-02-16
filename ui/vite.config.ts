import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, Plugin } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));

// Generate unique build timestamp for cache busting
const BUILD_TIMESTAMP = new Date().toISOString();
const APP_VERSION = process.env.npm_package_version || "dev";

// Plugin para substituir placeholder no HTML
const htmlTimestampPlugin = (): Plugin => ({
  name: 'html-timestamp',
  transformIndexHtml(html) {
    return html.replace('BUILD_TIMESTAMP_PLACEHOLDER', BUILD_TIMESTAMP);
  }
});

function normalizeBase(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "/";
  if (trimmed === "./") return "./";
  if (trimmed.endsWith("/")) return trimmed;
  return `${trimmed}/`;
}

export default defineConfig(({ command }) => {
  const envBase = process.env.OPENCLAW_CONTROL_UI_BASE_PATH?.trim();
  const base = envBase ? normalizeBase(envBase) : "./";
  return {
    base,
    publicDir: path.resolve(here, "public"),
    plugins: [htmlTimestampPlugin()],
    optimizeDeps: {
      include: ["lit/directives/repeat.js"],
    },
    build: {
      outDir: path.resolve(here, "../dist/control-ui"),
      emptyOutDir: true,
      sourcemap: true,
      // Adicionar hash aos assets para cache busting
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name ?? "asset";
            if (/\.css$/i.test(name)) {
              return "assets/[name]-[hash][extname]";
            }
            return "assets/[name]-[hash][extname]";
          },
        },
      },
    },
    define: {
      // Inject build timestamp and version for cache busting
      __BUILD_TIMESTAMP__: JSON.stringify(BUILD_TIMESTAMP),
      __APP_VERSION__: JSON.stringify(APP_VERSION),
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
    },
  };
});
