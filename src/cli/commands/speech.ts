/**
 * Speech CLI Command
 *
 * Manage speech-to-text settings and test voice recognition
 */

import { Command } from "commander";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { sttService } from "../../speech/stt-service.js";
import { voiceCommandRouter } from "../../speech/voice-command-router.js";
import { wakeWordDetector } from "../../speech/wake-word-detector.js";

const log = createSubsystemLogger("cli:speech");

export function createSpeechCommand(): Command {
  const cmd = new Command("speech").description(
    "Manage speech-to-text settings and voice commands",
  );

  cmd
    .command("status")
    .description("Show speech service status")
    .action(async () => {
      try {
        console.log("\n🎙️  Speech-to-Text Status:\n");

        const sttStatus = sttService.getStatus();
        console.log("   Provider:", sttStatus.provider);
        console.log("   Model:", sttStatus.model);
        console.log(
          "   API Key:",
          sttStatus.apiKeyConfigured ? "✅ configured" : "❌ not configured",
        );
        console.log("   Cache Size:", sttStatus.cacheSize);
        console.log();

        const wakeConfig = wakeWordDetector.getConfig();
        console.log("   Wake Words:", wakeConfig.words.join(", "));
        console.log("   Aliases:", wakeConfig.aliases?.join(", ") || "none");
        console.log("   Sensitivity:", wakeConfig.sensitivity);
        console.log("   Cooldown:", wakeConfig.cooldownMs, "ms");
        console.log();

        const commands = voiceCommandRouter.listCommands();
        console.log("   Registered Commands:", commands.length);
        for (const command of commands) {
          console.log(`     - ${command.name}: ${command.description}`);
        }

        console.log();
      } catch (error) {
        log.error("Failed to get speech status:", { error: String(error) });
        console.error("Error:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  cmd
    .command("test")
    .description("Test speech recognition (requires microphone)")
    .option("-t, --text <text>", "Test wake word detection with text")
    .action(async (options) => {
      try {
        if (options.text) {
          console.log(`\n🎙️  Testing wake word detection:"\n`);
          console.log(`   Input: "${options.text}"`);

          const result = wakeWordDetector.detect(options.text);

          if (result.matched) {
            console.log("\n   ✅ Wake word detected!");
            console.log(`   Word: ${result.word}`);
            console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            if (result.command) {
              console.log(`   Command: ${result.command}`);
            }
          } else {
            console.log("\n   ❌ No wake word detected");
          }
          console.log();
          return;
        }

        console.log("\n🎙️  Speech Test Mode\n");
        console.log("   This command tests speech recognition in the browser UI.");
        console.log("   The CLI version requires the Web UI to test microphone access.\n");
        console.log("   To test speech recognition:");
        console.log("   1. Open the OpenClaw Web UI");
        console.log("   2. Start a chat session");
        console.log("   3. Click the '🎤 Voice' button in the toolbar");
        console.log("   4. Speak your command (e.g., 'clawd, run tests')\n");
      } catch (error) {
        log.error("Speech test failed:", { error: String(error) });
        console.error("Error:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  cmd
    .command("config")
    .description("Configure speech settings")
    .action(async () => {
      try {
        console.log("\n🎙️  Current Speech Configuration:\n");

        const wakeConfig = wakeWordDetector.getConfig();
        console.log("   Wake Words:", wakeConfig.words.join(", "));
        console.log("   Aliases:", wakeConfig.aliases?.join(", ") || "none");
        console.log("   Sensitivity:", wakeConfig.sensitivity);
        console.log("   Cooldown:", wakeConfig.cooldownMs, "ms");
        console.log();

        console.log("   Edit your config file to change these settings.\n");
      } catch (error) {
        log.error("Failed to load speech config:", { error: String(error) });
        console.error("Error:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  cmd
    .command("commands")
    .description("List available voice commands")
    .action(async () => {
      try {
        console.log("\n🎙️  Available Voice Commands:\n");

        const commands = voiceCommandRouter.listCommands();

        for (const cmd of commands) {
          console.log(`   ${cmd.name}`);
          console.log(`   Description: ${cmd.description}`);
          console.log(`   Patterns:`);
          for (const pattern of cmd.patterns) {
            console.log(`     - ${pattern}`);
          }
          console.log();
        }

        console.log("   Usage: Say 'clawd' or 'openclaw' followed by a command.\n");
        console.log("   Example: 'clawd, run tests' or 'openclaw build project'\n");
      } catch (error) {
        log.error("Failed to list commands:", { error: String(error) });
        console.error("Error:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}
