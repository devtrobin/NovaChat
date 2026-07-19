import {
  AGENT_CONTEXT_SCHEMA_VERSION,
  AgentContextFile,
  AgentId,
  AgentPermissionDecision,
} from "../../shared/agent.types";
import {
  SubmitCommandInputRequest,
  SubmitPermissionDecisionRequest,
} from "../../shared/ai.types";
import {
  readBoolean,
  readEnum,
  readRecord,
  readSafeId,
  readString,
} from "./ipc-payload.validation.primitives";

const AGENT_IDS = ["agent-planner", "device-agent"] as const;
const PERMISSION_DECISIONS = ["allow", "allow-always", "deny", "deny-always"] as const;
const STORED_PERMISSION_DECISIONS = ["allow", "deny"] as const;

export function parseAgentId(value: unknown, field = "agentId"): AgentId {
  return readEnum(value, field, AGENT_IDS);
}

export function parseTaskId(value: unknown): string {
  return readSafeId(value, "taskId");
}

export function parseCommandId(value: unknown): string {
  return readSafeId(value, "commandId");
}

export function parseConversationId(value: unknown): string {
  return readSafeId(value, "conversationId");
}

export function parseRecoveryId(value: unknown): string {
  return readSafeId(value, "recoveryId");
}

export function parseAgentContextPayload(value: unknown): {
  agentId: AgentId;
  context: AgentContextFile;
} {
  const payload = readRecord(value, "agentContext");
  const context = readRecord(payload.context, "agentContext.context");
  return {
    agentId: parseAgentId(payload.agentId, "agentContext.agentId"),
    context: {
      description: readString(context.description, "agentContext.context.description", 0, 4_000),
      instructions: readString(context.instructions, "agentContext.context.instructions", 0, 100_000),
      name: readString(context.name, "agentContext.context.name", 1, 200),
      schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
    },
  };
}

export function parseAgentPermissionPayload(value: unknown): {
  agentId: AgentId;
  command: string;
  decision: AgentPermissionDecision;
  remember: boolean;
} {
  const payload = readRecord(value, "agentPermission");
  return {
    agentId: parseAgentId(payload.agentId, "agentPermission.agentId"),
    command: readString(payload.command, "agentPermission.command", 1, 32_768),
    decision: readEnum(payload.decision, "agentPermission.decision", STORED_PERMISSION_DECISIONS),
    remember: readBoolean(payload.remember, "agentPermission.remember"),
  };
}

export function parseDeleteAgentPermissionPayload(value: unknown): {
  agentId: AgentId;
  command: string;
} {
  const payload = readRecord(value, "deleteAgentPermission");
  return {
    agentId: parseAgentId(payload.agentId, "deleteAgentPermission.agentId"),
    command: readString(payload.command, "deleteAgentPermission.command", 1, 32_768),
  };
}

export function parseSubmitCommandInputRequest(value: unknown): SubmitCommandInputRequest {
  const payload = readRecord(value, "commandInput");
  return {
    commandId: readSafeId(payload.commandId, "commandInput.commandId"),
    value: readString(payload.value, "commandInput.value", 0, 65_536),
  };
}

export function parseSubmitPermissionDecisionRequest(
  value: unknown,
): SubmitPermissionDecisionRequest {
  const payload = readRecord(value, "permissionDecision");
  return {
    decision: readEnum(payload.decision, "permissionDecision.decision", PERMISSION_DECISIONS),
    requestId: readSafeId(payload.requestId, "permissionDecision.requestId"),
  };
}
