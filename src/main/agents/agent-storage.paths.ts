import { resolvePathWithinRoot } from "../filesystem/safe-path";

export function getAgentDirectory(rootDirectory: string, agentId: string): string {
  return resolvePathWithinRoot(rootDirectory, agentId);
}

export function getAgentContextPath(rootDirectory: string, agentId: string): string {
  return resolvePathWithinRoot(rootDirectory, agentId, "contexte.json");
}

export function getAgentPermissionsPath(rootDirectory: string, agentId: string): string {
  return resolvePathWithinRoot(rootDirectory, agentId, "permissions.json");
}

export function getAgentHistoryPath(rootDirectory: string, agentId: string): string {
  return resolvePathWithinRoot(rootDirectory, agentId, "historique.json");
}

export function getAgentConversationsDirectory(rootDirectory: string, agentId: string): string {
  return resolvePathWithinRoot(rootDirectory, agentId, "conversations");
}

export function getAgentConversationsIndexPath(rootDirectory: string, agentId: string): string {
  return resolvePathWithinRoot(rootDirectory, agentId, "conversations", "conversations.json");
}
