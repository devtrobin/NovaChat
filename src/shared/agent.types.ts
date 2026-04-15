import { PersistedChatState } from "../renderer/types/chat.types";

export type AgentId = "device-agent" | "diagnostic-agent";
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
      status: "error" | "success";
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
  status: "denied" | "error" | "interrupted" | "success";
  triggerMessageId: string;
  userAssistantConversationId: string;
};

export type AgentWorkspaceData = {
  context: AgentContextFile;
  conversations: PersistedChatState;
  history: AgentHistoryEntry[];
  id: AgentId;
  permissions: AgentPermissionsFile;
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
