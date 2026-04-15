import { IpcMain } from "electron";
import { deleteAgentPermission, loadAgentWorkspace, saveAgentContext, saveAgentPermission } from "../agents/agent-storage.service";
import { getAgentsPathFromSettings } from "../settings/settings.service";
import { AgentContextFile, AgentId, AgentPermissionDecision, AgentPermissionsFile } from "../../shared/agent.types";

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
}
