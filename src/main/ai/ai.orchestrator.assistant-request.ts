import { ChatMessage } from "../../shared/chat.types";
import { AppSettings } from "../../shared/settings.types";
import { getEnabledAgents } from "./ai.orchestrator.planner-handoff";
import { generateOpenAIReply } from "./openai.service";
import {
  registerAbortController,
  unregisterAbortController,
} from "./ai.turn-registry";

export async function requestAssistantReply(
  settings: AppSettings,
  turnId: string,
  turnMessages: ChatMessage[],
) {
  const controller = new AbortController();
  registerAbortController(turnId, controller);
  try {
    return await generateOpenAIReply(
      settings.openai,
      turnMessages,
      getEnabledAgents(settings),
      controller.signal,
    );
  } finally {
    unregisterAbortController(turnId, controller);
  }
}
