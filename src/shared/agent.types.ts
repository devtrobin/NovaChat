import { PersistedChatState, StorageRecoveryNotice } from "./chat.types";

export const AGENT_CONTEXT_SCHEMA_VERSION = 3;

export type AgentId = "agent-planner" | "device-agent";
export type AgentConversationOrigin = "assistant" | "user";
export type AgentPermissionDecision = "allow" | "deny";
export type AgentTaskMode = "analysis" | "command" | "goal";

export type AgentTaskRequest = {
  agentId: AgentId;
  mode: AgentTaskMode;
  request: string;
  turnId: string;
  triggerMessageId: string;
  userAssistantConversationId: string;
  userPrompt: string;
};

export type AgentTaskResult =
  | {
      agentConversationId: string;
      kind: "completed";
      output: string;
      request: string;
      resolvedCommand: string;
      status: "error" | "partial-success" | "success";
    }
  | {
      agentConversationId: string;
      kind: "permission-denied";
      output: string;
      request: string;
      resolvedCommand: string;
    };

export type AgentContextFile = {
  description: string;
  instructions: string;
  name: string;
  schemaVersion: number;
};

export type AgentPermissionRule = {
  command: string;
  createdAt: string;
  decision: AgentPermissionDecision;
  remember: boolean;
};

export type AgentPermissionsFile = {
  rules: AgentPermissionRule[];
};

export type AgentPermissionLookup = {
  decision: AgentPermissionDecision | null;
  matchedRule: AgentPermissionRule | null;
};

export type AgentHistoryEntry = {
  agentConversationId: string;
  assistantRequest?: string;
  at: string;
  command: string;
  result: string;
  status: "denied" | "error" | "interrupted" | "partial-success" | "success";
  triggerMessageId: string;
  userAssistantConversationId: string;
};

export type AgentWorkspaceData = {
  context: AgentContextFile;
  conversations: PersistedChatState;
  history: AgentHistoryEntry[];
  id: AgentId;
  permissions: AgentPermissionsFile;
  storageRecovery?: StorageRecoveryNotice;
};

export type ActiveAgentTask = {
  agentId: AgentId;
  conversationId: string;
  request: string;
  startedAt: string;
  status: "running" | "waiting-input" | "waiting-permission";
  taskId: string;
  title: string;
};
