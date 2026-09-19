import { AgentSettingsMap, AppSettings } from "../../shared/settings.types";
import { SYSTEM_AGENT_IDS } from "../../shared/system-agent.registry";
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
  const parsedAgents = Object.fromEntries(SYSTEM_AGENT_IDS.map((agentId) => {
    const agent = readRecord(agents[agentId], `settings.agents.${agentId}`);
    return [
      agentId,
      { enabled: readBoolean(agent.enabled, `settings.agents.${agentId}.enabled`) },
    ];
  })) as AgentSettingsMap;
  const aelExecution = readRecord(settings.aelExecution, "settings.aelExecution");
  const localFiles = readRecord(settings.localFiles, "settings.localFiles");
  const openai = readRecord(settings.openai, "settings.openai");

  return {
    activeProvider: readEnum(settings.activeProvider, "settings.activeProvider", ACTIVE_AI_PROVIDERS),
    agents: parsedAgents,
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
    aelExecution: {
      maxOutputCharacters: readInteger(
        aelExecution.maxOutputCharacters,
        "settings.aelExecution.maxOutputCharacters",
        10_000,
        1_000_000,
      ),
      timeoutMs: readInteger(aelExecution.timeoutMs, "settings.aelExecution.timeoutMs", 1_000, 300_000),
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
