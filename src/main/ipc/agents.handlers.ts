import { IpcMain } from "electron";
import { deleteAgentPermission, loadAgentWorkspace, saveAgentContext, saveAgentPermission } from "../agents/agent-storage.service";
import { getActiveAgentTasks, stopTurnByAgentTask } from "../ai/ai.turn-registry";
import { getAgentsPathFromSettings } from "../settings/settings.service";
import { ActiveAgentTask, AgentContextFile, AgentId, AgentPermissionDecision, AgentPermissionsFile } from "../../shared/agent.types";

export function registerAgentsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("nova:agents:load-workspace", async (_event, agentId: AgentId) => {
    return loadAgentWorkspace(await getAgentsPathFromSettings(), agentId);
  });

  ipcMain.handle("nova:agents:save-context", async (_event, payload: { agentId: AgentId; context: AgentContextFile }) => {
    return saveAgentContext(await getAgentsPathFromSettings(), payload.agentId, payload.context);
  });

  ipcMain.handle("nova:agents:save-permission", async (
    _event,
    payload: { agentId: AgentId; command: string; decision: AgentPermissionDecision; remember: boolean },
  ): Promise<AgentPermissionsFile> => {
    return saveAgentPermission(
      await getAgentsPathFromSettings(),
      payload.agentId,
      payload.command,
      payload.decision,
      payload.remember,
    );
  });

  ipcMain.handle("nova:agents:delete-permission", async (
    _event,
    payload: { agentId: AgentId; command: string },
  ): Promise<AgentPermissionsFile> => {
    return deleteAgentPermission(await getAgentsPathFromSettings(), payload.agentId, payload.command);
  });

  ipcMain.handle("nova:agents:get-active-tasks", async (_event, agentId: AgentId): Promise<ActiveAgentTask[]> => {
    return getActiveAgentTasks(agentId);
  });

  ipcMain.handle("nova:agents:stop-task", async (_event, taskId: string): Promise<boolean> => {
    return stopTurnByAgentTask(taskId);
  });
}
