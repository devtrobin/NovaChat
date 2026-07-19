import { AppSettings } from "../../shared/settings.types";
import {
  assertSerializedSize,
  readAbsolutePath,
  readBoolean,
  readEnum,
  readHttpUrl,
  readInteger,
  readOptionalString,
  readRecord,
  readString,
} from "./ipc-payload.validation.primitives";

const ACTIVE_AI_PROVIDERS = ["openai"] as const;

export function parseAppSettings(value: unknown): AppSettings {
  assertSerializedSize(value, "settings", 256 * 1024);
  const settings = readRecord(value, "settings");
  const agents = readRecord(settings.agents, "settings.agents");
  const apiTrace = readRecord(settings.apiTrace, "settings.apiTrace");
  const planner = readRecord(agents["agent-planner"], "settings.agents.agent-planner");
  const device = readRecord(agents["device-agent"], "settings.agents.device-agent");
  const deviceExecution = readRecord(settings.deviceExecution, "settings.deviceExecution");
  const localFiles = readRecord(settings.localFiles, "settings.localFiles");
  const openai = readRecord(settings.openai, "settings.openai");

  return {
    activeProvider: readEnum(settings.activeProvider, "settings.activeProvider", ACTIVE_AI_PROVIDERS),
    agents: {
      "agent-planner": { enabled: readBoolean(planner.enabled, "settings.agents.agent-planner.enabled") },
      "device-agent": { enabled: readBoolean(device.enabled, "settings.agents.device-agent.enabled") },
    },
    apiTrace: {
      enabled: readBoolean(apiTrace.enabled, "settings.apiTrace.enabled"),
      maxEntriesPerMessage: readInteger(
        apiTrace.maxEntriesPerMessage,
        "settings.apiTrace.maxEntriesPerMessage",
        1,
        500,
      ),
      redactSensitiveData: readBoolean(
        apiTrace.redactSensitiveData,
        "settings.apiTrace.redactSensitiveData",
      ),
      retentionDays: readInteger(apiTrace.retentionDays, "settings.apiTrace.retentionDays", 1, 3_650),
    },
    deviceExecution: {
      maxOutputCharacters: readInteger(
        deviceExecution.maxOutputCharacters,
        "settings.deviceExecution.maxOutputCharacters",
        10_000,
        1_000_000,
      ),
      timeoutMs: readInteger(deviceExecution.timeoutMs, "settings.deviceExecution.timeoutMs", 1_000, 300_000),
    },
    hideInternalConversations: readBoolean(settings.hideInternalConversations, "settings.hideInternalConversations"),
    localFiles: {
      agentsDirectory: readAbsolutePath(localFiles.agentsDirectory, "settings.localFiles.agentsDirectory"),
      conversationsDirectory: readAbsolutePath(localFiles.conversationsDirectory, "settings.localFiles.conversationsDirectory"),
      settingsPath: readAbsolutePath(localFiles.settingsPath, "settings.localFiles.settingsPath"),
    },
    openai: {
      apiKeyConfigured: readBoolean(openai.apiKeyConfigured, "settings.openai.apiKeyConfigured"),
      apiKeyUpdate: readOptionalString(openai.apiKeyUpdate, "settings.openai.apiKeyUpdate", 16_384),
      baseUrl: readHttpUrl(openai.baseUrl, "settings.openai.baseUrl"),
      model: readString(openai.model, "settings.openai.model", 0, 256),
      provider: readEnum(openai.provider, "settings.openai.provider", ["openai"] as const),
    },
    previewMode: readBoolean(settings.previewMode, "settings.previewMode"),
  };
}
