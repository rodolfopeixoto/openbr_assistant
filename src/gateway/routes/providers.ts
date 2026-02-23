/**
 * Provider API Routes
 * RESTful API endpoints for provider management
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { parse as parseUrl } from "node:url";
import {
  listProviderTemplates,
  getProviderTemplate,
  initializeConfiguredProviders,
  getConfiguredProviders,
  getConfiguredProvider,
  createConfiguredProvider,
  updateConfiguredProvider,
  deleteConfiguredProvider,
  testProviderConnection,
} from "../../providers/registry/index.js";
import {
  type CreateProviderRequest,
  type ProviderListFilters,
  ProviderRegistryError,
  ProviderErrorCode,
  type TestConnectionRequest,
  type UpdateProviderRequest,
} from "../../providers/types.js";

// ============================================================================
// Types
// ============================================================================

// ============================================================================
// Route State
// ============================================================================

let routeInitialized = false;

/**
 * Initialize provider routes
 */
export async function initializeProviderRoutes(storagePath: string): Promise<void> {
  if (routeInitialized) {
    return;
  }

  await initializeConfiguredProviders(storagePath);
  routeInitialized = true;
}

// ============================================================================
// Response Helpers
// ============================================================================

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function sendError(
  res: ServerResponse,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  sendJson(res, status, {
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
}

async function parseJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/v1/providers/templates
 * List all provider templates
 */
async function handleListTemplates(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const templates = listProviderTemplates();
  sendJson(res, 200, {
    success: true,
    data: templates,
  });
}

/**
 * GET /api/v1/providers/templates/:id
 * Get a specific provider template
 */
async function handleGetTemplate(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
): Promise<void> {
  const template = getProviderTemplate(id);
  if (!template) {
    sendError(res, 404, ProviderErrorCode.TEMPLATE_NOT_FOUND, `Template not found: ${id}`);
    return;
  }
  sendJson(res, 200, {
    success: true,
    data: template,
  });
}

/**
 * GET /api/v1/providers
 * List all configured providers
 */
async function handleListProviders(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = parseUrl(req.url || "", true);
  const filters: ProviderListFilters = {};

  if (url.query.status) {
    filters.status = String(url.query.status) as ProviderListFilters["status"];
  }
  if (url.query.templateId) {
    filters.templateId = String(url.query.templateId);
  }
  if (url.query.enabledOnly === "true") {
    filters.enabledOnly = true;
  }

  const providers = getConfiguredProviders(filters);
  sendJson(res, 200, {
    success: true,
    data: providers,
  });
}

/**
 * GET /api/v1/providers/:id
 * Get a specific configured provider
 */
async function handleGetProvider(
  _req: IncomingMessage,
  res: ServerResponse,
  id: string,
): Promise<void> {
  try {
    const provider = getConfiguredProvider(id);
    sendJson(res, 200, {
      success: true,
      data: provider,
    });
  } catch (error) {
    if (
      error instanceof ProviderRegistryError &&
      error.code === ProviderErrorCode.PROVIDER_NOT_FOUND
    ) {
      sendError(res, 404, error.code, error.message);
      return;
    }
    throw error;
  }
}

/**
 * POST /api/v1/providers
 * Create a new configured provider
 */
async function handleCreateProvider(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = (await parseJsonBody(req)) as CreateProviderRequest;

    if (!body.templateId || !body.name || !body.config) {
      sendError(
        res,
        400,
        ProviderErrorCode.VALIDATION_ERROR,
        "Missing required fields: templateId, name, config",
      );
      return;
    }

    const provider = await createConfiguredProvider(body);
    sendJson(res, 201, {
      success: true,
      data: provider,
    });
  } catch (error) {
    if (error instanceof ProviderRegistryError) {
      const status = error.code === ProviderErrorCode.TEMPLATE_NOT_FOUND ? 404 : 400;
      sendError(res, status, error.code, error.message, error.details);
      return;
    }
    throw error;
  }
}

/**
 * PUT /api/v1/providers/:id
 * Update a configured provider
 */
async function handleUpdateProvider(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
): Promise<void> {
  try {
    const body = (await parseJsonBody(req)) as UpdateProviderRequest;
    const provider = await updateConfiguredProvider(id, body);
    sendJson(res, 200, {
      success: true,
      data: provider,
    });
  } catch (error) {
    if (error instanceof ProviderRegistryError) {
      const status = error.code === ProviderErrorCode.PROVIDER_NOT_FOUND ? 404 : 400;
      sendError(res, status, error.code, error.message, error.details);
      return;
    }
    throw error;
  }
}

/**
 * DELETE /api/v1/providers/:id
 * Delete a configured provider
 */
async function handleDeleteProvider(
  _req: IncomingMessage,
  res: ServerResponse,
  id: string,
): Promise<void> {
  try {
    await deleteConfiguredProvider(id);
    sendJson(res, 204, {
      success: true,
    });
  } catch (error) {
    if (
      error instanceof ProviderRegistryError &&
      error.code === ProviderErrorCode.PROVIDER_NOT_FOUND
    ) {
      sendError(res, 404, error.code, error.message);
      return;
    }
    throw error;
  }
}

/**
 * POST /api/v1/providers/test
 * Test a provider connection
 */
async function handleTestProvider(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = (await parseJsonBody(req)) as TestConnectionRequest;

    if (!body.templateId || !body.config) {
      sendError(
        res,
        400,
        ProviderErrorCode.VALIDATION_ERROR,
        "Missing required fields: templateId, config",
      );
      return;
    }

    const result = await testProviderConnection(body);
    sendJson(res, result.success ? 200 : 400, {
      success: result.success,
      data: result,
    });
  } catch (error) {
    if (error instanceof ProviderRegistryError) {
      sendError(res, 400, error.code, error.message, error.details);
      return;
    }
    throw error;
  }
}

// ============================================================================
// Main Router
// ============================================================================

/**
 * Handle provider API routes
 * Returns true if the request was handled, false otherwise
 */
export async function handleProviderRoutes(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = parseUrl(req.url || "", true);
  const pathname = url.pathname || "";

  // Initialize routes if needed
  if (!routeInitialized) {
    return false;
  }

  // GET /api/v1/providers/templates
  if (pathname === "/api/v1/providers/templates" && req.method === "GET") {
    await handleListTemplates(req, res);
    return true;
  }

  // GET /api/v1/providers/templates/:id
  const templateMatch = pathname.match(/^\/api\/v1\/providers\/templates\/([^/]+)$/);
  if (templateMatch && req.method === "GET") {
    await handleGetTemplate(req, res, templateMatch[1]);
    return true;
  }

  // GET /api/v1/providers
  if (pathname === "/api/v1/providers" && req.method === "GET") {
    await handleListProviders(req, res);
    return true;
  }

  // POST /api/v1/providers
  if (pathname === "/api/v1/providers" && req.method === "POST") {
    await handleCreateProvider(req, res);
    return true;
  }

  // POST /api/v1/providers/test
  if (pathname === "/api/v1/providers/test" && req.method === "POST") {
    await handleTestProvider(req, res);
    return true;
  }

  // GET /api/v1/providers/:id
  // PUT /api/v1/providers/:id
  // DELETE /api/v1/providers/:id
  const providerMatch = pathname.match(/^\/api\/v1\/providers\/([^/]+)$/);
  if (providerMatch) {
    const id = providerMatch[1];

    if (req.method === "GET") {
      await handleGetProvider(req, res, id);
      return true;
    }

    if (req.method === "PUT") {
      await handleUpdateProvider(req, res, id);
      return true;
    }

    if (req.method === "DELETE") {
      await handleDeleteProvider(req, res, id);
      return true;
    }
  }

  return false;
}

/**
 * Check if a URL path is a provider route
 */
export function isProviderRoute(pathname: string): boolean {
  return pathname.startsWith("/api/v1/providers");
}
