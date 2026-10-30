import { ChatMessage } from "../../shared/chat.types";
import { RuntimeAppSettings } from "../../shared/settings.types";
import { getEnabledAgents } from "./ai.orchestrator.acp-handoff";
import { generateOpenAIReply } from "./openai.service";
import {
  registerAbortController,
  unregisterAbortController,
} from "./ai.turn-registry";

export async function requestAssistantReply(
  settings: RuntimeAppSettings,
  turnId: string,
  turnMessages: ChatMessage[],
  finalResponseOnly = false,
) {
  const controller = new AbortController();
  registerAbortController(turnId, controller);
  try {
    return await generateOpenAIReply(
      settings.openai,
      turnMessages,
      finalResponseOnly ? [] : getEnabledAgents(settings),
      controller.signal,
      finalResponseOnly,
    );
  } finally {
    unregisterAbortController(turnId, controller);
  }
}
