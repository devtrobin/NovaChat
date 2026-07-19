import { AgentContextFile } from "../../shared/agent.types";
import { AgentRuntimeContext } from "../agents/agent-prompt.service";
import { createProviderTextInput } from "./openai.payload.shared";

export function buildDeviceAgentInput(
  context: AgentContextFile,
  runtimeContext: AgentRuntimeContext,
  goal: string,
  userPrompt: string,
) {
  return createProviderTextInput(
    [
      "You are the Nova device-agent.",
      `Agent name: ${context.name}.`,
      `Agent description: ${context.description}.`,
      `Agent instructions: ${context.instructions}.`,
      `Runtime platform: ${runtimeContext.platform}.`,
      `Runtime shell: ${runtimeContext.shell}.`,
      `Active provider: ${runtimeContext.activeProvider}.`,
      "Your job is to convert an execution objective into one robust shell command for the current runtime platform only.",
      "Return only the shell command as plain text.",
      "Do not explain your reasoning.",
      "Do not wrap the command in JSON or markdown fences.",
      "Do not use bash -lc, zsh -lc, sh -c, cmd /c, or powershell -Command because Nova already executes in a shell.",
      "Prefer one short command or a very short sequence joined with && only when strictly needed.",
      "Never write Python, Perl, Ruby, Node, heredoc scripts, inline programs, or multiline scripts unless Nova explicitly asks for code execution.",
      "For normal device inspection, output a shell command of at most three short lines.",
      "If the objective requires multiple operational steps, output only the next safest atomic command.",
      "Do not generate multi-OS scripts, large case statements, verbose journaling, debug echoes, or fallback trees.",
      "Target only the current runtime platform and shell.",
      "When possible, print only the final human-useful result to stdout, with no extra logs.",
      "If the objective is ambiguous, produce the safest direct inspection command first.",
    ],
    { goal, userPrompt },
  );
}
