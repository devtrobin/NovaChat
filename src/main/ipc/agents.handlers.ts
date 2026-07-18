import { IpcMain } from "electron";
import { deleteAgentPermission, loadAgentWorkspace, saveAgentContext, saveAgentPermission } from "../agents/agent-storage.service";
import { getActiveAgentTasks, stopTurnByAgentTask } from "../ai/ai.turn-registry";
import { getAgentsPathFromSettings } from "../settings/settings.service";
import {
  ActiveAgentTask,
  AgentPermissionsFile,
} from "../../shared/agent.types";
import {
  parseAgentContextPayload,
  parseAgentId,
  parseAgentPermissionPayload,
  parseDeleteAgentPermissionPayload,
  parseTaskId,
} from "../validation/ipc-payload.validation";

export function registerAgentsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("nova:agents:load-workspace", async (_event, payload: unknown) => {
    return loadAgentWorkspace(await getAgentsPathFromSettings(), parseAgentId(payload));
  });

  ipcMain.handle("nova:agents:save-context", async (_event, payload: unknown) => {
    const request = parseAgentContextPayload(payload);
    return saveAgentContext(await getAgentsPathFromSettings(), request.agentId, request.context);
  });

  ipcMain.handle("nova:agents:save-permission", async (
    _event,
    payload: unknown,
  ): Promise<AgentPermissionsFile> => {
    const request = parseAgentPermissionPayload(payload);
    return saveAgentPermission(
      await getAgentsPathFromSettings(),
      request.agentId,
      request.command,
      request.decision,
      request.remember,
    );
  });

  ipcMain.handle("nova:agents:delete-permission", async (
    _event,
    payload: unknown,
  ): Promise<AgentPermissionsFile> => {
    const request = parseDeleteAgentPermissionPayload(payload);
    return deleteAgentPermission(await getAgentsPathFromSettings(), request.agentId, request.command);
  });

  ipcMain.handle("nova:agents:get-active-tasks", async (_event, payload: unknown): Promise<ActiveAgentTask[]> => {
    return getActiveAgentTasks(parseAgentId(payload));
  });

  ipcMain.handle("nova:agents:stop-task", async (_event, payload: unknown): Promise<boolean> => {
    return stopTurnByAgentTask(parseTaskId(payload));
  });

}
