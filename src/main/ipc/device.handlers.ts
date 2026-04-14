import { IpcMain } from "electron";
import {
  awaitDeviceCommand,
  killDeviceCommand,
  startDeviceCommand,
} from "../device/device.service";

export function registerDeviceHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("nova:device:start-command", async (_event, command: string) => {
    return startDeviceCommand(command);
  });

  ipcMain.handle("nova:device:await-command", async (_event, commandId: string) => {
    return awaitDeviceCommand(commandId);
  });

  ipcMain.handle("nova:device:kill-command", async (_event, commandId: string) => {
    await killDeviceCommand(commandId);
  });
}
