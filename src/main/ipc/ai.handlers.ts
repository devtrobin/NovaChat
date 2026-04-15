import { IpcMain } from "electron";
import { runTurn } from "../ai/ai.orchestrator";
import { resolvePermissionRequest } from "../ai/ai.permission.service";
import { killDeviceCommand, submitInputToCommand } from "../device/device.service";
import { loadSettingsFromDisk } from "../settings/settings.service";
import { RunTurnRequest, SubmitCommandInputRequest, SubmitPermissionDecisionRequest } from "../../shared/ai.types";

export function registerAiHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("nova:ai:run-turn", async (event, request: RunTurnRequest) => {
    const settings = await loadSettingsFromDisk();
    return runTurn(request, settings, (payload) => {
      event.sender.send("nova:ai:event", payload);
    });
  });

  ipcMain.handle("nova:ai:kill-command", async (_event, commandId: string) => {
    await killDeviceCommand(commandId);
  });

  ipcMain.handle("nova:ai:submit-command-input", async (_event, payload: SubmitCommandInputRequest) => {
    return submitInputToCommand(payload.commandId, payload.value);
  });

  ipcMain.handle("nova:ai:submit-permission-decision", async (_event, payload: SubmitPermissionDecisionRequest) => {
    return resolvePermissionRequest(payload.requestId, payload.decision);
  });
}
