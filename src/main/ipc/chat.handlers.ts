import { IpcMain } from "electron";
import { loadChatStateFromDirectory, saveChatStateToDirectories } from "../chat/chat-storage.service";
import {
  getConversationsPathFromSettings,
  getReferenceConversationsDirectory,
  getReferenceConversationsPath,
} from "../settings/settings.service";
import { PersistedChatState } from "../../renderer/types/chat.types";
import { createDefaultChatState } from "../../renderer/services/conversation.service";

export function registerChatHandlers(ipcMain: IpcMain): void {
  let chatSaveQueue = Promise.resolve();

  ipcMain.handle("nova:chat:load", async () => loadChatStateFromDisk());

  ipcMain.handle("nova:chat:save", async (_event, state: PersistedChatState) => {
    chatSaveQueue = chatSaveQueue.then(() => saveChatStateToDisk(state));
    await chatSaveQueue;
  });
}

async function loadChatStateFromDisk(): Promise<PersistedChatState> {
  const configuredDirectory = await getConversationsPathFromSettings();
  const referenceDirectory = getReferenceConversationsDirectory();
  const candidateDirectories = configuredDirectory === referenceDirectory
    ? [configuredDirectory]
    : [configuredDirectory, referenceDirectory];

  for (const directory of candidateDirectories) {
    const state = await loadChatStateFromDirectory(directory);
    if (state) return state;
  }

  return createDefaultChatState();
}

async function saveChatStateToDisk(state: PersistedChatState): Promise<void> {
  await saveChatStateToDirectories(
    state,
    await getConversationsPathFromSettings(),
    getReferenceConversationsDirectory(),
    getReferenceConversationsPath(),
  );
}
