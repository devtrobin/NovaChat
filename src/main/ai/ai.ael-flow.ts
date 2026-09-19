import { ChatMessage } from "../../shared/chat.types";
import { AELExecutionSettings } from "../../shared/settings.types";
import { awaitAELCommand, startAELCommand } from "../ael/ael.service";
import { createAELResultMessage } from "./ai.message-factory";
import { emitAELProgress, emitAELStart } from "./ai.ael-flow.progress";
import { appendLifecycleLog } from "./ai.orchestrator.runtime";
import { Emit } from "./ai.orchestrator.types";
import { registerTurnCommand, throwIfTurnStopped } from "./ai.turn-registry";

type ExecuteAELCommandArgs = {
  command: string;
  conversationId: string;
  emit: Emit;
  initialMessage: ChatMessage;
  messageId: string;
  onProgressStateChange?: (status: "running" | "waiting-input") => void;
  options: AELExecutionSettings;
  resultRecipient: "assistant" | "user";
  resultSender: "ael";
  turnId: string;
};

export async function executeAELCommand({
  command,
  conversationId,
  emit,
  initialMessage,
  messageId,
  onProgressStateChange,
  options,
  resultRecipient,
  resultSender,
  turnId,
}: ExecuteAELCommandArgs): Promise<ChatMessage> {
  throwIfTurnStopped(turnId);
  const runningCommand = startAELCommand(
    command,
    options,
    emitAELProgress(emit, conversationId, messageId, initialMessage, onProgressStateChange),
  );
  registerTurnCommand(turnId, runningCommand.commandId);

  emitAELStart(emit, conversationId, messageId, initialMessage, runningCommand);

  const commandResult = await awaitAELCommand(runningCommand.commandId);
  const aelMessage = createAELResultMessage(
    command,
    messageId,
    commandResult,
    initialMessage,
    resultSender,
    resultRecipient,
  );
  appendLifecycleLog(
    aelMessage,
    commandResult.code === 130 ? "ael-killed" : "ael-finished",
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
    message: aelMessage,
    messageId,
    type: "replace-message",
  });

  return aelMessage;
}
