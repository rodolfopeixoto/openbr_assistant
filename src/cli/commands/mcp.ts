/**
 * MCP CLI Command
 *
 * Manage MCP (Model Context Protocol) servers and connections
 */

import { Command } from "commander";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { mcpClient } from "../../mcp/index.js";

const log = createSubsystemLogger("cli:mcp");

export function createMcpCommand(): Command {
  const cmd = new Command("mcp").description("Manage MCP servers and connections");

  cmd
    .command("list")
    .description("List all MCP servers")
    .action(async () => {
      try {
        const servers = mcpClient.listServers();

        console.log("\n🔌 MCP Servers:\n");

        if (servers.length === 0) {
          console.log("   No MCP servers configured.\n");
          console.log('   Use "openclaw mcp add" to add a server.\n');
          return;
        }

        for (const server of servers) {
          const status = server.connected
            ? "🟢 connected"
            : server.lastError
              ? "🔴 error"
              : "⚪ disconnected";

          console.log(`   ${server.name} (${server.id})`);
          console.log(`   URL: ${server.url}`);
          console.log(`   Transport: ${server.transport} | Status: ${status}`);

          if (server.tools.length > 0) {
            console.log(`   Tools: ${server.tools.length}`);
          }
          if (server.resources.length > 0) {
            console.log(`   Resources: ${server.resources.length}`);
          }

          console.log();
        }
      } catch (error) {
        log.error("Failed to list MCP servers", error);
        process.exit(1);
      }
    });

  cmd
    .command("add")
    .description("Add an MCP server")
    .requiredOption("-n, --name <name>", "Server name")
    .requiredOption("-u, --url <url>", "Server URL")
    .option("-t, --transport <type>", "Transport type (stdio|http|websocket)", "websocket")
    .option("--token <token>", "Bearer token")
    .option("--api-key <key>", "API key")
    .action(async (options) => {
      try {
        const auth = options.token
          ? { type: "bearer" as const, token: options.token }
          : options.apiKey
            ? { type: "api-key" as const, apiKey: options.apiKey }
            : undefined;

        const server = mcpClient.addServer({
          id: options.name.toLowerCase().replace(/\s+/g, "-"),
          name: options.name,
          url: options.url,
          transport: options.transport,
          enabled: true,
          auth,
        });

        console.log(`✅ MCP server "${server.name}" added successfully`);
        console.log(`   ID: ${server.id}`);
        console.log(`   URL: ${server.url}`);
        console.log(`   Transport: ${server.transport}`);
      } catch (error) {
        log.error("Failed to add MCP server", error);
        console.error(
          `❌ Failed to add server: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });

  cmd
    .command("remove <serverId>")
    .description("Remove an MCP server")
    .action(async (serverId) => {
      try {
        mcpClient.removeServer(serverId);
        console.log(`✅ MCP server ${serverId} removed`);
      } catch (error) {
        log.error(`Failed to remove MCP server ${serverId}`, error);
        console.error(
          `❌ Failed to remove server: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });

  cmd
    .command("connect <serverId>")
    .description("Connect to an MCP server")
    .action(async (serverId) => {
      try {
        console.log(`🔗 Connecting to ${serverId}...`);
        await mcpClient.connect(serverId);
        console.log(`✅ Connected to ${serverId}`);

        const server = mcpClient.getServer(serverId);
        if (server) {
          console.log(`   Tools: ${server.tools.length}`);
          console.log(`   Resources: ${server.resources.length}`);
          console.log(`   Prompts: ${server.prompts.length}`);
        }
      } catch (error) {
        log.error(`Failed to connect to ${serverId}`, error);
        console.error(
          `❌ Connection failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });

  cmd
    .command("disconnect <serverId>")
    .description("Disconnect from an MCP server")
    .action(async (serverId) => {
      try {
        mcpClient.disconnect(serverId);
        console.log(`🔌 Disconnected from ${serverId}`);
      } catch (error) {
        log.error(`Failed to disconnect from ${serverId}`, error);
        console.error(
          `❌ Failed to disconnect: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });

  cmd
    .command("tools <serverId>")
    .description("List tools from an MCP server")
    .action(async (serverId) => {
      try {
        const tools = await mcpClient.listTools(serverId);

        console.log(`\n🛠️  Tools from ${serverId}:\n`);

        if (tools.length === 0) {
          console.log("   No tools available.\n");
          return;
        }

        for (const tool of tools) {
          console.log(`   ${tool.name}`);
          console.log(`   ${tool.description}`);
          console.log();
        }
      } catch (error) {
        log.error(`Failed to list tools from ${serverId}`, error);
        console.error(
          `❌ Failed to list tools: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });

  cmd
    .command("call <serverId> <toolName>")
    .description("Call an MCP tool")
    .option("-a, --args <json>", "Arguments as JSON string", "{}")
    .action(async (serverId, toolName, options) => {
      try {
        const args = JSON.parse(options.args);

        console.log(`🎯 Calling ${toolName} on ${serverId}...`);
        console.log(`   Arguments: ${JSON.stringify(args, null, 2)}\n`);

        const result = await mcpClient.callTool(serverId, toolName, args);

        if (result.success) {
          console.log("✅ Success!\n");
          console.log("Result:");
          console.log(JSON.stringify(result.result, null, 2));
          console.log(`\nExecution time: ${result.executionTime}ms`);
        } else {
          console.log("❌ Failed!\n");
          console.log(`Error: ${result.error}`);
          process.exit(1);
        }
      } catch (error) {
        log.error(`Failed to call tool ${toolName}`, error);
        console.error(
          `❌ Failed to call tool: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });

  cmd
    .command("resources <serverId>")
    .description("List resources from an MCP server")
    .action(async (serverId) => {
      try {
        const resources = await mcpClient.listResources(serverId);

        console.log(`\n📄 Resources from ${serverId}:\n`);

        if (resources.length === 0) {
          console.log("   No resources available.\n");
          return;
        }

        for (const resource of resources) {
          console.log(`   ${resource.name}`);
          console.log(`   URI: ${resource.uri}`);
          if (resource.description) {
            console.log(`   ${resource.description}`);
          }
          console.log();
        }
      } catch (error) {
        log.error(`Failed to list resources from ${serverId}`, error);
        console.error(
          `❌ Failed to list resources: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });

  cmd
    .command("status")
    .description("Show MCP connection status")
    .action(async () => {
      try {
        const servers = mcpClient.listServers();

        console.log("\n📊 MCP Status:\n");

        for (const server of servers) {
          const status = mcpClient.getConnectionStatus(server.id);
          const statusIcon = status.connected ? "🟢" : "⚪";

          console.log(`   ${statusIcon} ${server.name} (${server.id})`);
          console.log(`      Connected: ${status.connected}`);

          if (status.latency) {
            console.log(`      Latency: ${status.latency}ms`);
          }

          if (status.lastError) {
            console.log(`      Last Error: ${status.lastError}`);
          }

          console.log();
        }
      } catch (error) {
        log.error("Failed to get MCP status", error);
        process.exit(1);
      }
    });

  return cmd;
}
