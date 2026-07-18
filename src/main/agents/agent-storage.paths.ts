import path from "node:path";

export function getAgentDirectory(rootDirectory: string, agentId: string): string {
  return path.join(rootDirectory, agentId);
}

export function getAgentContextPath(rootDirectory: string, agentId: string): string {
  return path.join(getAgentDirectory(rootDirectory, agentId), "contexte.json");
}

export function getAgentPermissionsPath(rootDirectory: string, agentId: string): string {
  return path.join(getAgentDirectory(rootDirectory, agentId), "permissions.json");
}

export function getAgentHistoryPath(rootDirectory: string, agentId: string): string {
  return path.join(getAgentDirectory(rootDirectory, agentId), "historique.json");
}

export function getAgentConversationsDirectory(rootDirectory: string, agentId: string): string {
  return path.join(getAgentDirectory(rootDirectory, agentId), "conversations");
}

export function getAgentConversationsIndexPath(rootDirectory: string, agentId: string): string {
  return path.join(getAgentConversationsDirectory(rootDirectory, agentId), "conversations.json");
}
