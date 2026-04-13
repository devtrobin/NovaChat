import { ApiRequestRecord, ChatMessage } from "../../renderer/types/chat.types";
import { ChatTurnEvent, RunTurnRequest, RunTurnResult } from "../../shared/ai.types";
import { AppSettings } from "../../shared/settings.types";
import { awaitDeviceCommand, startDeviceCommand } from "../device/device.service";
import { generateOpenAIReply, OpenAIRequestError } from "./openai.service";

type Emit = (event: ChatTurnEvent) => void;

export async function runTurn(
  request: RunTurnRequest,
  settings: AppSettings,
  emit: Emit,
): Promise<RunTurnResult> {
  if (!settings.openai.apiKey || !settings.openai.model) {
    const systemMessage = createSystemMessage(
      "Configuration OpenAI manquante.",
      "Ouvrir les parametres",
    );
    emit({ conversationId: request.conversationId, messages: [systemMessage], type: "append-messages" });
    globalThis.setTimeout(() => {
      emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
    }, 4500);
    return { ok: false };
  }

  const userMessage = createUserMessage(request.userInput);
  const systemMessage = createSystemMessage("Tache en cours: generation de la reponse...");
  emit({
    conversationId: request.conversationId,
    messages: [userMessage, systemMessage],
    type: "append-messages",
  });

  if (shouldSetTitle(request)) {
    emit({
      conversationId: request.conversationId,
      title: request.userInput.trim().slice(0, 36) || "Nouvelle conversation",
      type: "set-title",
    });
  }

  const turnMessages: ChatMessage[] = [...request.messages, userMessage];
  let activeMessageId: string | null = null;

  try {
    for (let step = 0; step < 4; step += 1) {
      const { apiRecords, providerResponse } = await generateOpenAIReply(settings.openai, turnMessages);
      appendLifecycleLog(userMessage, "api-request-sent", `Requete ${step + 1} envoyee a l'assistant.`);
      appendLifecycleLog(userMessage, "api-response-received", `Reponse ${step + 1} recue depuis l'assistant.`);
      userMessage.apiRequests = [...(userMessage.apiRequests ?? []), ...apiRecords];
      emit({
        conversationId: request.conversationId,
        message: { ...userMessage },
        messageId: userMessage.id,
        type: "replace-message",
      });

      if (providerResponse.to === "user") {
        const finalMessage = createAssistantMessage(providerResponse.content);
        finalMessage.apiRequests = [...apiRecords];
        appendLifecycleLog(finalMessage, "api-response-attached", "Trace API associee au message assistant.");
        emit({ conversationId: request.conversationId, messages: [finalMessage], type: "append-messages" });
        emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
        return { ok: true };
      }

      const runningMessage = createRunningDeviceMessage(providerResponse.content, "");
      runningMessage.apiRequests = [...apiRecords];
      appendLifecycleLog(runningMessage, "api-response-attached", "Trace API associee a la commande device.");
      appendLifecycleLog(
        runningMessage,
        "assistant-requested-device",
        JSON.stringify({
          content: providerResponse.content,
          from: "assistant",
          to: "device",
        }),
      );
      activeMessageId = runningMessage.id;
      emit({ conversationId: request.conversationId, messages: [runningMessage], type: "append-messages" });

      const runningCommand = startDeviceCommand(providerResponse.content, (progress) => {
        if (progress.awaitingInput && !runningMessage.lifecycleLog?.some((entry) => entry.event === "device-waiting-input")) {
          appendLifecycleLog(runningMessage, "device-waiting-input", "La commande attend une saisie utilisateur.");
        }
        emit({
          conversationId: request.conversationId,
          message: {
            ...runningMessage,
            commandId: progress.commandId,
            inputPlaceholder: progress.inputPlaceholder,
            inputRequested: progress.awaitingInput,
            inputSecret: progress.inputSecret,
            result: progress.output,
            status: progress.awaitingInput ? "waiting-input" : "running",
          },
          messageId: runningMessage.id,
          type: "replace-message",
        });
      });
      runningMessage.commandId = runningCommand.commandId;
      appendLifecycleLog(runningMessage, "device-started", "Execution de la commande device.");
      emit({
        conversationId: request.conversationId,
        message: {
          ...runningMessage,
          commandId: runningCommand.commandId,
        },
        messageId: runningMessage.id,
        type: "replace-message",
      });

      const commandResult = await awaitDeviceCommand(runningCommand.commandId);
      const deviceMessage = createDeviceResultMessage(
        providerResponse.content,
        activeMessageId,
        commandResult,
        runningMessage,
      );
      deviceMessage.apiRequests = [...(runningMessage.apiRequests ?? [])];
      appendLifecycleLog(
        deviceMessage,
        commandResult.code === 130 ? "device-killed" : "device-finished",
        commandResult.code === 130 ? "Commande interrompue par l'utilisateur." : "Commande terminee.",
      );
      emit({
        conversationId: request.conversationId,
        message: deviceMessage,
        messageId: activeMessageId,
        type: "replace-message",
      });

      turnMessages.push(deviceMessage);
      activeMessageId = null;

      if (commandResult.code === 130) {
        turnMessages.push(createInternalSystemMessage(
          "L'utilisateur a mis un terme a la commande device. Tu peux repondre directement sans nouvelle commande.",
        ));
      }
    }
  } catch (error) {
    let errorApiRecords: ApiRequestRecord[] = [];
    if (error instanceof OpenAIRequestError) {
      userMessage.apiRequests = [...(userMessage.apiRequests ?? []), ...error.apiRecords];
      appendLifecycleLog(userMessage, "api-response-error", "Erreur recue depuis l'assistant.");
      errorApiRecords = error.apiRecords;
      emit({
        conversationId: request.conversationId,
        message: { ...userMessage },
        messageId: userMessage.id,
        type: "replace-message",
      });
    }

    const errorMessage = createAssistantErrorMessage();
    errorMessage.apiRequests = [...errorApiRecords];
    appendLifecycleLog(errorMessage, "api-response-attached", "Trace API associee au message d'erreur assistant.");
    emit({ conversationId: request.conversationId, messages: [errorMessage], type: "append-messages" });
    emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
    return { ok: false };
  }

  emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
  return { ok: false };
}

function createAssistantMessage(content: string): ChatMessage {
  return {
    apiRequests: [],
    content,
    createdAt: new Date().toISOString(),
    from: "assistant",
    id: crypto.randomUUID(),
    lifecycleLog: [createLifecycleEntry("created", "Message assistant cree.")],
    status: "idle",
    to: "user",
  };
}

function createAssistantErrorMessage(): ChatMessage {
  return createAssistantMessage("Erreur durant la generation de la reponse.");
}

function createRunningDeviceMessage(command: string, commandId: string): ChatMessage {
  return {
    apiRequests: [],
    commandId,
    content: command,
    createdAt: new Date().toISOString(),
    from: "assistant",
    id: crypto.randomUUID(),
    isExpandable: true,
    lifecycleLog: [createLifecycleEntry("created", "Message device cree.")],
    result: "",
    status: "running",
    to: "device",
  };
}

function createDeviceResultMessage(
  command: string,
  id: string,
  result: { commandId: string; ok: boolean; output: string },
  previousMessage?: ChatMessage,
): ChatMessage {
  return {
    apiRequests: [],
    commandId: result.commandId,
    content: command,
    createdAt: new Date().toISOString(),
    from: "device",
    id,
    isExpandable: true,
    lifecycleLog: [
      ...(previousMessage?.lifecycleLog ?? []),
      createLifecycleEntry("created", "Resultat device cree."),
    ],
    result: result.output,
    status: result.ok ? "success" : "error",
    to: "assistant",
  };
}

function createSystemMessage(content: string, actionLabel?: string): ChatMessage {
  return {
    actionLabel,
    actionType: actionLabel ? "open-settings" : undefined,
    apiRequests: [],
    content,
    createdAt: new Date().toISOString(),
    from: "system",
    id: crypto.randomUUID(),
    lifecycleLog: [createLifecycleEntry("created", "Message systeme cree.")],
    status: "running",
    to: "user",
  };
}

function createInternalSystemMessage(content: string): ChatMessage {
  return {
    apiRequests: [],
    content,
    createdAt: new Date().toISOString(),
    from: "system",
    id: crypto.randomUUID(),
    lifecycleLog: [createLifecycleEntry("created", "Message systeme interne cree.")],
    status: "idle",
    to: "assistant",
  };
}

function createUserMessage(content: string): ChatMessage {
  return {
    apiRequests: [],
    content,
    createdAt: new Date().toISOString(),
    from: "user",
    id: crypto.randomUUID(),
    lifecycleLog: [createLifecycleEntry("created", "Message utilisateur cree.")],
    to: "assistant",
  };
}

function shouldSetTitle(request: RunTurnRequest): boolean {
  return request.messages.filter((message) => message.from !== "system").length === 0;
}

function createLifecycleEntry(event: string, details?: string) {
  return {
    at: new Date().toISOString(),
    details,
    event,
  };
}

function appendLifecycleLog(message: ChatMessage, event: string, details?: string): void {
  message.lifecycleLog = [...(message.lifecycleLog ?? []), createLifecycleEntry(event, details)];
}
