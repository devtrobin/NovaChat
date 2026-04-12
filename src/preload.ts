import { contextBridge, ipcRenderer } from "electron";
import { PersistedChatState } from "./renderer/types/chat.types";
import { ChatTurnEvent, RunTurnRequest, RunTurnResult } from "./shared/ai.types";
import { AppSettings, SettingsTestResult } from "./shared/settings.types";

type AIEventListener = (event: ChatTurnEvent) => void;

contextBridge.exposeInMainWorld("nova", {
  ping: () => ipcRenderer.invoke("nova:ping"),
  chat: {
    load: () => ipcRenderer.invoke("nova:chat:load"),
    save: (state: PersistedChatState) => ipcRenderer.invoke("nova:chat:save", state),
  },
  settings: {
    load: (): Promise<AppSettings> => ipcRenderer.invoke("nova:settings:load"),
    reset: (): Promise<AppSettings> => ipcRenderer.invoke("nova:settings:reset"),
    save: (settings: AppSettings): Promise<AppSettings> => ipcRenderer.invoke("nova:settings:save", settings),
    test: (settings: AppSettings): Promise<SettingsTestResult> => ipcRenderer.invoke("nova:settings:test", settings),
  },
  ai: {
    killCommand: (commandId: string): Promise<void> => ipcRenderer.invoke("nova:ai:kill-command", commandId),
    onEvent: (listener: AIEventListener) => {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: ChatTurnEvent) => {
        listener(payload);
      };

      ipcRenderer.on("nova:ai:event", wrapped);
      return () => ipcRenderer.removeListener("nova:ai:event", wrapped);
    },
    runTurn: (request: RunTurnRequest): Promise<RunTurnResult> => ipcRenderer.invoke("nova:ai:run-turn", request),
  },
});
