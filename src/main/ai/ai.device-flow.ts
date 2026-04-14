import { ChatMessage } from "../../renderer/types/chat.types";
import { awaitDeviceCommand, startDeviceCommand } from "../device/device.service";
import { createDeviceResultMessage } from "./ai.message-factory";
import { emitDeviceProgress, emitDeviceStart } from "./ai.device-flow.progress";
import { appendLifecycleLog } from "./ai.orchestrator.runtime";
import { Emit } from "./ai.orchestrator.types";

type ExecuteDeviceCommandArgs = {
  command: string;
  conversationId: string;
  emit: Emit;
  initialMessage: ChatMessage;
  messageId: string;
  resultRecipient: "assistant" | "user";
  resultSender: "device";
};

export async function executeDeviceCommand({
  command,
  conversationId,
  emit,
  initialMessage,
  messageId,
  resultRecipient,
  resultSender,
}: ExecuteDeviceCommandArgs): Promise<ChatMessage> {
  const runningCommand = startDeviceCommand(
    command,
    emitDeviceProgress(emit, conversationId, messageId, initialMessage),
  );

  emitDeviceStart(emit, conversationId, messageId, initialMessage, runningCommand);

  const commandResult = await awaitDeviceCommand(runningCommand.commandId);
  const deviceMessage = createDeviceResultMessage(
    command,
    messageId,
    commandResult,
    initialMessage,
    resultSender,
    resultRecipient,
  );
  appendLifecycleLog(
    deviceMessage,
    commandResult.code === 130 ? "device-killed" : "device-finished",
    commandResult.code === 130 ? "Commande interrompue par l'utilisateur." : "Commande terminee.",
    {
      code: commandResult.code,
      cwd: commandResult.cwd,
      durationMs: commandResult.durationMs,
      errorType: commandResult.errorType,
      normalizedCommand: commandResult.normalizedCommand,
      shell: commandResult.shell,
      signal: commandResult.signal ?? null,
    },
  );
  emit({
    conversationId,
    message: deviceMessage,
    messageId,
    type: "replace-message",
  });

  return deviceMessage;
}
