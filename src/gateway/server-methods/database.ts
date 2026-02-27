import type { GatewayRequestHandlers } from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import {
  createDatabaseManager,
  getDatabaseManager,
  listDatabaseManagers,
  type DatabaseConfig,
} from "../../services/database/manager.js";

const log = createSubsystemLogger("gateway:database");

export const databaseHandlers: GatewayRequestHandlers = {
  // List all database connections
  "database.list": async ({ respond }) => {
    try {
      const databases = listDatabaseManagers();
      respond(true, { databases });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to list databases";
      log.error("database.list failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Connect to a database
  "database.connect": async ({ params, respond }) => {
    try {
      const { name, config } = params as { name: string; config: DatabaseConfig };

      const manager = createDatabaseManager(name, config);
      const connected = await manager.connect();

      if (connected) {
        respond(true, {
          success: true,
          status: manager.getStatus(),
        });
      } else {
        respond(false, {
          success: false,
          error: "Failed to connect to database",
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Connection failed";
      log.error("database.connect failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Get database status
  "database.status": async ({ params, respond }) => {
    try {
      const { name } = params as { name: string };
      const manager = getDatabaseManager(name);

      if (!manager) {
        respond(false, { error: "Database not found" });
        return;
      }

      respond(true, { status: manager.getStatus() });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to get status";
      log.error("database.status failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Run migrations
  "database.migrate": async ({ params, respond }) => {
    try {
      const { name } = params as { name: string };
      const manager = getDatabaseManager(name);

      if (!manager) {
        respond(false, { error: "Database not found" });
        return;
      }

      const result = await manager.runMigrations();
      respond(result.success, result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Migration failed";
      log.error("database.migrate failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Create backup
  "database.backup": async ({ params, respond }) => {
    try {
      const { name } = params as { name: string };
      const manager = getDatabaseManager(name);

      if (!manager) {
        respond(false, { error: "Database not found" });
        return;
      }

      const result = await manager.createBackup();
      respond(result.success, result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Backup failed";
      log.error("database.backup failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Restore from backup
  "database.restore": async ({ params, respond }) => {
    try {
      const { name, path } = params as { name: string; path: string };
      const manager = getDatabaseManager(name);

      if (!manager) {
        respond(false, { error: "Database not found" });
        return;
      }

      const result = await manager.restoreBackup(path);
      respond(result.success, result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Restore failed";
      log.error("database.restore failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Execute query
  "database.query": async ({ params, respond }) => {
    try {
      const {
        name,
        sql,
        params: queryParams,
      } = params as {
        name: string;
        sql: string;
        params?: unknown[];
      };
      const manager = getDatabaseManager(name);

      if (!manager) {
        respond(false, { error: "Database not found" });
        return;
      }

      const results = await manager.query(sql, queryParams);
      respond(true, { results });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Query failed";
      log.error("database.query failed: " + msg);
      respond(false, { error: msg });
    }
  },

  // Get database statistics
  "database.stats": async ({ params, respond }) => {
    try {
      const { name } = params as { name: string };
      const manager = getDatabaseManager(name);

      if (!manager) {
        respond(false, { error: "Database not found" });
        return;
      }

      // Get table statistics
      const tables = await manager.query<{
        name: string;
        rows: number;
        size: string;
      }>(`
        SELECT 
          table_name as name,
          (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as rows,
          '0 MB' as size
      `);

      respond(true, {
        tables,
        status: manager.getStatus(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to get stats";
      log.error("database.stats failed: " + msg);
      respond(false, { error: msg });
    }
  },
};
