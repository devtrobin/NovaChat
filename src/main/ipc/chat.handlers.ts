import { IpcMain } from "electron";
import {
  loadChatStateFromDirectoryWithRecovery,
  saveChatStateToDirectories,
} from "../chat/chat-storage.service";
import {
  getConversationsPathFromSettings,
  getReferenceConversationsDirectory,
  getReferenceConversationsPath,
  loadSettingsFromDisk,
} from "../settings/settings.service";
import { ChatLoadResult, PersistedChatState } from "../../shared/chat.types";
import { createDefaultChatState } from "../../renderer/services/conversation.service";
import {
  parsePersistedChatState,
  parseRecoveryId,
} from "../validation/ipc-payload.validation";
import {
  acknowledgeStorageRecovery,
  registerStorageRecovery,
} from "../storage/storage-recovery.registry";
import { enqueueSerialTask } from "../storage/serial-task.queue";

export function registerChatHandlers(ipcMain: IpcMain): void {
  let chatSaveQueue = Promise.resolve();

  ipcMain.handle("nova:chat:load", async () => loadChatStateFromDisk());

  ipcMain.handle("nova:chat:acknowledge-recovery", async (_event, payload: unknown) => {
    return acknowledgeStorageRecovery(parseRecoveryId(payload));
  });

  ipcMain.handle("nova:chat:save", async (_event, payload: unknown) => {
    const state = parsePersistedChatState(payload);
    const queuedSave = enqueueSerialTask(
      chatSaveQueue,
      () => saveChatStateToDisk(state),
    );
    chatSaveQueue = queuedSave.tail;
    await queuedSave.result;
  });
}

async function loadChatStateFromDisk(): Promise<ChatLoadResult> {
  const configuredDirectory = await getConversationsPathFromSettings();
  const referenceDirectory = getReferenceConversationsDirectory();
  const candidateDirectories = configuredDirectory === referenceDirectory
    ? [configuredDirectory]
    : [configuredDirectory, referenceDirectory];

  for (const directory of candidateDirectories) {
    const result = await loadChatStateFromDirectoryWithRecovery(directory);
    if (result.issues.length > 0) {
      return {
        recovery: registerStorageRecovery(directory, result.issues),
        state: result.state ?? createDefaultChatState(),
      };
    }
    if (result.state) {
      return {
        recovery: null,
        state: result.state,
      };
    }
  }

  return {
    recovery: null,
    state: createDefaultChatState(),
  };
}

async function saveChatStateToDisk(state: PersistedChatState): Promise<void> {
  const settings = await loadSettingsFromDisk();
  await saveChatStateToDirectories(
    state,
    settings.localFiles.conversationsDirectory,
    getReferenceConversationsDirectory(),
    getReferenceConversationsPath(),
    settings.apiTrace,
  );
}
