import { IpcMain } from "electron";
import { loadAgentWorkspace, saveAgentContext } from "../agents/agent-storage.service";
import { getAgentsPathFromSettings } from "../settings/settings.service";
import { AgentContextFile } from "../../shared/agent.types";

export function registerAgentsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("nova:agents:load-workspace", async (_event, agentId: string) => {
    return loadAgentWorkspace(await getAgentsPathFromSettings(), agentId);
  });

  ipcMain.handle("nova:agents:save-context", async (_event, payload: { agentId: string; context: AgentContextFile }) => {
    return saveAgentContext(await getAgentsPathFromSettings(), payload.agentId, payload.context);
  });
}
