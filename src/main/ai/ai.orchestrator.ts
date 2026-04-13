import { ApiRequestRecord, ChatMessage } from "../../renderer/types/chat.types";
import { ChatTurnEvent, RunTurnRequest, RunTurnResult } from "../../shared/ai.types";
import { AppSettings } from "../../shared/settings.types";
import { awaitDeviceCommand, DevicePolicyError, startDeviceCommand } from "../device/device.service";
import { generateOpenAIReply, NovaResponseParseError, OpenAIRequestError } from "./openai.service";

type Emit = (event: ChatTurnEvent) => void;

export async function runTurn(
  request: RunTurnRequest,
  settings: AppSettings,
  emit: Emit,
): Promise<RunTurnResult> {
  const userMessage = createUserMessage(request.userInput);
  if (isDirectCommand(request.userInput)) {
    return runDirectCommandTurn(request, userMessage, emit);
  }

  if (!settings.openai.apiKey || !settings.openai.model) {
    const systemMessage = createSystemMessage(
      "Configuration OpenAI manquante.",
      "Ouvrir les parametres",
    );
    emit({ conversationId: request.conversationId, messages: [userMessage, systemMessage], type: "append-messages" });
    globalThis.setTimeout(() => {
      emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
    }, 4500);
    return { ok: false };
  }

  let systemMessage = createSystemMessage("Tache en cours: generation de la reponse...");
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
        "L'assistant a demande une execution device.",
        {
          command: providerResponse.content,
          from: "assistant",
          to: "device",
        },
      );
      activeMessageId = runningMessage.id;
      emit({ conversationId: request.conversationId, messages: [runningMessage], type: "append-messages" });

      const deviceMessage = await executeDeviceCommand({
        command: providerResponse.content,
        conversationId: request.conversationId,
        emit,
        initialMessage: runningMessage,
        messageId: activeMessageId,
        resultRecipient: "assistant",
        resultSender: "device",
        runningRecipient: "device",
        runningSender: "assistant",
        sourceLabel: "assistant",
        systemMessageId: systemMessage.id,
      });
      deviceMessage.apiRequests = [...(runningMessage.apiRequests ?? [])];
      appendLifecycleLog(
        deviceMessage,
        "assistant-device-cycle-complete",
        "Cycle assistant -> device termine.",
      );

      turnMessages.push(deviceMessage);
      activeMessageId = null;

      emit({
        conversationId: request.conversationId,
        messageId: systemMessage.id,
        type: "remove-message",
      });
      systemMessage = createSystemMessage("Tache en cours: generation de la reponse...");
      emit({
        conversationId: request.conversationId,
        messages: [systemMessage],
        type: "append-messages",
      });

      if (deviceMessage.lifecycleLog?.some((entry) => entry.event === "device-killed")) {
        turnMessages.push(createInternalSystemMessage(
          "L'utilisateur a mis un terme a la commande device. Tu peux repondre directement sans nouvelle commande.",
        ));
      }
    }
  } catch (error) {
    let errorApiRecords: ApiRequestRecord[] = [];
    let errorDisplayMessage = "Erreur durant la generation de la reponse.";
    if (error instanceof OpenAIRequestError) {
      userMessage.apiRequests = [...(userMessage.apiRequests ?? []), ...error.apiRecords];
      appendLifecycleLog(userMessage, "api-response-error", "Erreur recue depuis l'assistant.");
      errorApiRecords = error.apiRecords;
      errorDisplayMessage = error.displayMessage;
      emit({
        conversationId: request.conversationId,
        message: { ...userMessage },
        messageId: userMessage.id,
        type: "replace-message",
      });
    } else if (error instanceof NovaResponseParseError) {
      userMessage.apiRequests = [...(userMessage.apiRequests ?? []), ...error.apiRecords];
      appendLifecycleLog(userMessage, "api-response-error", "Reponse assistant invalide pour Nova.");
      errorApiRecords = error.apiRecords;
      errorDisplayMessage = error.displayMessage;
      emit({
        conversationId: request.conversationId,
        message: { ...userMessage },
        messageId: userMessage.id,
        type: "replace-message",
      });
    } else if (error instanceof DevicePolicyError) {
      errorDisplayMessage = `Commande refusee par la policy device: ${error.message}`;
    } else if (error instanceof Error) {
      errorDisplayMessage = classifyRuntimeError(error);
    }

    const errorMessage = createAssistantErrorMessage(errorDisplayMessage);
    errorMessage.apiRequests = [...errorApiRecords];
    appendLifecycleLog(errorMessage, "api-response-attached", "Trace API associee au message d'erreur assistant.");
    emit({ conversationId: request.conversationId, messages: [errorMessage], type: "append-messages" });
    emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
    return { ok: false };
  }

  emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
  return { ok: false };
}

async function runDirectCommandTurn(
  request: RunTurnRequest,
  userMessage: ChatMessage,
  emit: Emit,
): Promise<RunTurnResult> {
  const command = extractDirectCommand(request.userInput);
  if (shouldSetTitle(request)) {
    emit({
      conversationId: request.conversationId,
      title: request.userInput.trim().slice(0, 36) || "Nouvelle conversation",
      type: "set-title",
    });
  }
  const systemMessage = createSystemMessage("Tache en cours: execution de la commande...");
  emit({
    conversationId: request.conversationId,
    messages: [userMessage, systemMessage],
    type: "append-messages",
  });

  const runningMessage = createRunningDeviceMessage(command, "", "user", "device");
  appendLifecycleLog(runningMessage, "user-requested-device", "L'utilisateur a demande une execution device.", {
    command,
    from: "user",
    to: "device",
  });
  emit({ conversationId: request.conversationId, messages: [runningMessage], type: "append-messages" });

  try {
    await executeDeviceCommand({
      command,
      conversationId: request.conversationId,
      emit,
      initialMessage: runningMessage,
      messageId: runningMessage.id,
      resultRecipient: "user",
      resultSender: "device",
      runningRecipient: "device",
      runningSender: "user",
      sourceLabel: "user",
      systemMessageId: systemMessage.id,
    });
    emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
    return { ok: true };
  } catch (error) {
    const errorMessage = createDeviceImmediateErrorMessage(command, runningMessage.id, error);
    emit({
      conversationId: request.conversationId,
      message: errorMessage,
      messageId: runningMessage.id,
      type: "replace-message",
    });
    emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
    return { ok: false };
  }
}

async function executeDeviceCommand({
  command,
  conversationId,
  emit,
  initialMessage,
  messageId,
  resultRecipient,
  resultSender,
}: {
  command: string;
  conversationId: string;
  emit: Emit;
  initialMessage: ChatMessage;
  messageId: string;
  resultRecipient: "assistant" | "user";
  resultSender: "device";
  runningRecipient: "device";
  runningSender: "assistant" | "user";
  sourceLabel: "assistant" | "user";
  systemMessageId: string;
}): Promise<ChatMessage> {
  const runningCommand = startDeviceCommand(command, (progress) => {
    if (progress.awaitingInput && !initialMessage.lifecycleLog?.some((entry) => entry.event === "device-waiting-input")) {
      appendLifecycleLog(
        initialMessage,
        "device-waiting-input",
        "La commande attend une saisie utilisateur.",
        {
          inputPlaceholder: progress.inputPlaceholder,
          inputSecret: progress.inputSecret,
        },
      );
    }
    emit({
      conversationId,
      message: {
        ...initialMessage,
        commandId: progress.commandId,
        inputPlaceholder: progress.inputPlaceholder,
        inputRequested: progress.awaitingInput,
        inputSecret: progress.inputSecret,
        result: progress.output,
        status: progress.awaitingInput ? "waiting-input" : "running",
      },
      messageId,
      type: "replace-message",
    });
  });

  initialMessage.commandId = runningCommand.commandId;
  appendLifecycleLog(initialMessage, "device-started", "Execution de la commande device.", {
    commandId: runningCommand.commandId,
    cwd: runningCommand.cwd,
    normalizedCommand: runningCommand.normalizedCommand,
    shell: runningCommand.shell,
  });
  emit({
    conversationId,
    message: {
      ...initialMessage,
      commandId: runningCommand.commandId,
    },
    messageId,
    type: "replace-message",
  });

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

function createAssistantErrorMessage(content: string): ChatMessage {
  return createAssistantMessage(content);
}

function createRunningDeviceMessage(
  command: string,
  commandId: string,
  from: "assistant" | "user" = "assistant",
  to: "device" = "device",
): ChatMessage {
  return {
    apiRequests: [],
    commandId,
    content: command,
    createdAt: new Date().toISOString(),
    from,
    id: crypto.randomUUID(),
    isExpandable: true,
    lifecycleLog: [createLifecycleEntry("created", "Message device cree.")],
    result: "",
    status: "running",
    to,
  };
}

function createDeviceResultMessage(
  command: string,
  id: string,
  result: {
    code: number;
    commandId: string;
    cwd: string;
    durationMs: number;
    errorType?: "killed" | "not-found" | "policy" | "shell" | "timeout";
    normalizedCommand: string;
    ok: boolean;
    output: string;
    shell: string;
    signal?: string | null;
  },
  previousMessage?: ChatMessage,
  from: "device" = "device",
  to: "assistant" | "user" = "assistant",
): ChatMessage {
  return {
    apiRequests: [],
    commandId: result.commandId,
    content: command,
    createdAt: new Date().toISOString(),
    from,
    id,
    isExpandable: true,
    lifecycleLog: [
      ...(previousMessage?.lifecycleLog ?? []),
      createLifecycleEntry("created", "Resultat device cree."),
    ],
    result: result.output,
    status: result.ok ? "success" : "error",
    to,
  };
}

function createDeviceImmediateErrorMessage(command: string, id: string, error: unknown): ChatMessage {
  const displayMessage = error instanceof DevicePolicyError
    ? `Commande refusee par la policy device: ${error.message}`
    : error instanceof Error
      ? classifyRuntimeError(error)
      : "Erreur shell: impossible d'executer la commande.";

  return {
    apiRequests: [],
    content: command,
    createdAt: new Date().toISOString(),
    from: "device",
    id,
    isExpandable: true,
    lifecycleLog: [
      createLifecycleEntry("created", "Resultat device cree."),
      createLifecycleEntry("device-finished", "La commande n'a pas pu demarrer.", {
        errorType: error instanceof DevicePolicyError ? "policy" : "shell",
      }),
    ],
    result: displayMessage,
    status: "error",
    to: "user",
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

function createLifecycleEntry(event: string, details?: string, metadata?: Record<string, unknown>) {
  return {
    at: new Date().toISOString(),
    details,
    event,
    metadata,
  };
}

function appendLifecycleLog(
  message: ChatMessage,
  event: string,
  details?: string,
  metadata?: Record<string, unknown>,
): void {
  message.lifecycleLog = [...(message.lifecycleLog ?? []), createLifecycleEntry(event, details, metadata)];
}

function classifyRuntimeError(error: Error): string {
  const message = error.message.trim();
  if (/spawn|enoent|shell/i.test(message)) {
    return `Erreur shell: ${message}`;
  }
  if (/policy/i.test(message)) {
    return `Commande refusee par la policy device: ${message}`;
  }
  return `Erreur Nova: ${message || "erreur inconnue."}`;
}

function isDirectCommand(input: string): boolean {
  return /^\/cmd(?:\s+.+)?$/i.test(input.trim());
}

function extractDirectCommand(input: string): string {
  return input.trim().replace(/^\/cmd\s*/i, "").trim();
}
