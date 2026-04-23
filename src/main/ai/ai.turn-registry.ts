import { killDeviceCommand } from "../device/device.service";
import { cancelPermissionRequest } from "./ai.permission.service";
import { AgentId } from "../../shared/agent.types";

export class TurnStoppedError extends Error {
  constructor() {
    super("Execution interrompue par l'utilisateur.");
  }
}

export type ActiveAgentTask = {
  agentId: AgentId;
  conversationId: string;
  request: string;
  startedAt: string;
  status: "running" | "waiting-input" | "waiting-permission";
  taskId: string;
  title: string;
};

type ActiveTurn = {
  agentConversationIds: Map<AgentId, string>;
  commandIds: Set<string>;
  controllers: Set<AbortController>;
  conversationId: string;
  pendingPermissionRequestId?: string;
  stopped: boolean;
  taskIds: Set<string>;
  turnId: string;
};

const activeTurns = new Map<string, ActiveTurn>();
const conversationToTurnId = new Map<string, string>();
const activeAgentTasks = new Map<string, ActiveAgentTask>();
const taskToTurnId = new Map<string, string>();

export function startTurn(conversationId: string): string {
  const turnId = crypto.randomUUID();
  activeTurns.set(turnId, {
    agentConversationIds: new Map(),
    commandIds: new Set(),
    controllers: new Set(),
    conversationId,
    stopped: false,
    taskIds: new Set(),
    turnId,
  });
  conversationToTurnId.set(conversationId, turnId);
  return turnId;
}

export function finishTurn(turnId: string): void {
  const turn = activeTurns.get(turnId);
  if (!turn) return;
  for (const taskId of turn.taskIds) {
    activeAgentTasks.delete(taskId);
    taskToTurnId.delete(taskId);
  }
  activeTurns.delete(turnId);
  if (conversationToTurnId.get(turn.conversationId) === turnId) {
    conversationToTurnId.delete(turn.conversationId);
  }
}

export function isTurnStopped(turnId: string): boolean {
  return activeTurns.get(turnId)?.stopped ?? false;
}

export function throwIfTurnStopped(turnId: string): void {
  if (isTurnStopped(turnId)) {
    throw new TurnStoppedError();
  }
}

export function registerAbortController(turnId: string, controller: AbortController): void {
  activeTurns.get(turnId)?.controllers.add(controller);
}

export function unregisterAbortController(turnId: string, controller: AbortController): void {
  activeTurns.get(turnId)?.controllers.delete(controller);
}

export function registerTurnCommand(turnId: string, commandId: string): void {
  activeTurns.get(turnId)?.commandIds.add(commandId);
}

export function setPendingPermissionRequest(turnId: string, requestId: string): void {
  const turn = activeTurns.get(turnId);
  if (!turn) return;
  turn.pendingPermissionRequestId = requestId;
}

export function clearPendingPermissionRequest(turnId: string, requestId: string): void {
  const turn = activeTurns.get(turnId);
  if (!turn || turn.pendingPermissionRequestId !== requestId) return;
  turn.pendingPermissionRequestId = undefined;
}

export function registerActiveAgentTask(turnId: string, task: Omit<ActiveAgentTask, "taskId">): ActiveAgentTask {
  const activeTask: ActiveAgentTask = {
    ...task,
    taskId: crypto.randomUUID(),
  };
  activeAgentTasks.set(activeTask.taskId, activeTask);
  taskToTurnId.set(activeTask.taskId, turnId);
  activeTurns.get(turnId)?.taskIds.add(activeTask.taskId);
  return activeTask;
}

export function getAgentConversationId(turnId: string, agentId: AgentId): string | null {
  return activeTurns.get(turnId)?.agentConversationIds.get(agentId) ?? null;
}

export function setAgentConversationId(turnId: string, agentId: AgentId, conversationId: string): void {
  activeTurns.get(turnId)?.agentConversationIds.set(agentId, conversationId);
}

export function updateActiveAgentTaskStatus(
  taskId: string,
  status: ActiveAgentTask["status"],
): void {
  const task = activeAgentTasks.get(taskId);
  if (!task) return;
  activeAgentTasks.set(taskId, {
    ...task,
    status,
  });
}

export function completeActiveAgentTask(taskId: string): void {
  activeAgentTasks.delete(taskId);
  const turnId = taskToTurnId.get(taskId);
  if (!turnId) return;
  activeTurns.get(turnId)?.taskIds.delete(taskId);
  taskToTurnId.delete(taskId);
}

export function getActiveAgentTasks(agentId?: AgentId): ActiveAgentTask[] {
  return [...activeAgentTasks.values()]
    .filter((task) => !agentId || task.agentId === agentId)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

export async function stopTurnByConversation(conversationId: string): Promise<boolean> {
  const turnId = conversationToTurnId.get(conversationId);
  if (!turnId) return false;
  return stopTurn(turnId);
}

export async function stopTurnByAgentTask(taskId: string): Promise<boolean> {
  const turnId = taskToTurnId.get(taskId);
  if (!turnId) return false;
  return stopTurn(turnId);
}

async function stopTurn(turnId: string): Promise<boolean> {
  const turn = activeTurns.get(turnId);
  if (!turn || turn.stopped) return false;
  turn.stopped = true;
  for (const controller of turn.controllers) {
    controller.abort();
  }
  if (turn.pendingPermissionRequestId) {
    cancelPermissionRequest(turn.pendingPermissionRequestId);
  }
  await Promise.all([...turn.commandIds].map((commandId) => killDeviceCommand(commandId)));
  return true;
}
