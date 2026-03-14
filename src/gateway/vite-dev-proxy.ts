import type { IncomingMessage, ServerResponse } from "node:http";
import http from "node:http";

const VITE_DEV_PORT = 5173;
const VITE_DEV_HOST = "localhost";

/**
 * Check if Vite dev server is running
 */
export async function isViteDevServerRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://${VITE_DEV_HOST}:${VITE_DEV_PORT}/`, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Proxy request to Vite dev server
 */
export function proxyToViteDevServer(
  req: IncomingMessage,
  res: ServerResponse,
  targetPath: string,
): void {
  const options = {
    hostname: VITE_DEV_HOST,
    port: VITE_DEV_PORT,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${VITE_DEV_HOST}:${VITE_DEV_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error(`[Vite Proxy] Error: ${err.message}`);
    res.statusCode = 502;
    res.end("Bad Gateway - Vite dev server unavailable");
  });

  req.pipe(proxyReq);
}

/**
 * Middleware that proxies to Vite dev server in dev mode
 */
export function createViteDevProxy() {
  let isDevServerRunning = false;
  let lastCheck = 0;

  return async (req: IncomingMessage, res: ServerResponse, next: () => void): Promise<boolean> => {
    // Only check every 5 seconds to avoid overhead
    const now = Date.now();
    if (now - lastCheck > 5000) {
      isDevServerRunning = await isViteDevServerRunning();
      lastCheck = now;
    }

    if (!isDevServerRunning) {
      return false; // Not in dev mode, continue with static files
    }

    const url = req.url || "/";

    // Proxy all UI requests to Vite
    if (
      url.startsWith("/ui/") ||
      url === "/ui" ||
      url.startsWith("/@") ||
      url.startsWith("/src/")
    ) {
      const targetPath = url.startsWith("/ui/") ? url.slice(3) : url;
      proxyToViteDevServer(req, res, targetPath || "/");
      return true; // Request handled
    }

    return false; // Not a UI request, continue
  };
}
