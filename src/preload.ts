import { contextBridge, ipcRenderer } from "electron";
import { PersistedChatState } from "./renderer/types/chat.types";
import {
  ChatTurnEvent,
  RunTurnRequest,
  RunTurnResult,
  SubmitCommandInputRequest,
  SubmitPermissionDecisionRequest,
} from "./shared/ai.types";
import { AgentContextFile, AgentWorkspaceData } from "./shared/agent.types";
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
  agents: {
    loadWorkspace: (agentId: string): Promise<AgentWorkspaceData> => ipcRenderer.invoke("nova:agents:load-workspace", agentId),
    saveContext: (agentId: string, context: AgentContextFile): Promise<AgentContextFile> =>
      ipcRenderer.invoke("nova:agents:save-context", { agentId, context }),
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
    submitPermissionDecision: (payload: SubmitPermissionDecisionRequest): Promise<boolean> =>
      ipcRenderer.invoke("nova:ai:submit-permission-decision", payload),
    submitCommandInput: (payload: SubmitCommandInputRequest): Promise<boolean> =>
      ipcRenderer.invoke("nova:ai:submit-command-input", payload),
  },
});
