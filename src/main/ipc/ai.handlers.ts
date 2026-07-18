import { IpcMain } from "electron";
import { runTurn } from "../ai/ai.orchestrator";
import { resolvePermissionRequest } from "../ai/ai.permission.service";
import { stopTurnByConversation } from "../ai/ai.turn-registry";
import { killDeviceCommand, submitInputToCommand } from "../device/device.service";
import { loadSettingsFromDisk } from "../settings/settings.service";
import {
  parseCommandId,
  parseConversationId,
  parseRunTurnRequest,
  parseSubmitCommandInputRequest,
  parseSubmitPermissionDecisionRequest,
} from "../validation/ipc-payload.validation";

export function registerAiHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("nova:ai:run-turn", async (event, payload: unknown) => {
    const request = parseRunTurnRequest(payload);
    const settings = await loadSettingsFromDisk();
    return runTurn(request, settings, (payload) => {
      event.sender.send("nova:ai:event", payload);
    });
  });

  ipcMain.handle("nova:ai:kill-command", async (_event, payload: unknown) => {
    await killDeviceCommand(parseCommandId(payload));
  });

  ipcMain.handle("nova:ai:submit-command-input", async (_event, payload: unknown) => {
    const request = parseSubmitCommandInputRequest(payload);
    return submitInputToCommand(request.commandId, request.value);
  });

  ipcMain.handle("nova:ai:submit-permission-decision", async (_event, payload: unknown) => {
    const request = parseSubmitPermissionDecisionRequest(payload);
    return resolvePermissionRequest(request.requestId, request.decision);
  });

  ipcMain.handle("nova:ai:stop-turn", async (_event, payload: unknown) => {
    return stopTurnByConversation(parseConversationId(payload));
  });
}
