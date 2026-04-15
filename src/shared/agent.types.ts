import { PersistedChatState } from "../renderer/types/chat.types";

export type AgentPermissionDecision = "allow" | "deny";

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
  at: string;
  command: string;
  result: string;
  status: "denied" | "error" | "success";
  triggerMessageId: string;
  userAssistantConversationId: string;
};

export type AgentWorkspaceData = {
  context: AgentContextFile;
  conversations: PersistedChatState;
  history: AgentHistoryEntry[];
  id: string;
  permissions: AgentPermissionsFile;
};
