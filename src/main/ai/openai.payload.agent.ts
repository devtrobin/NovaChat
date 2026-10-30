import { AgentContextFile, AgentId } from "../../shared/agent.types";
import { AgentRuntimeContext } from "../agents/agent-prompt.service";
import { createProviderTextInput } from "./openai.payload.shared";

export function buildGenericAgentInput(
  agentId: AgentId,
  context: AgentContextFile,
  runtimeContext: AgentRuntimeContext,
  request: string,
  userPrompt: string,
) {
  const acpInstructions = agentId === "agent-acp"
    ? [
      "Return plain text only using labeled sections, not JSON.",
      [
        "Use exactly these top-level labels, each on its own line:",
        "STATUS: ready|needs-info|blocked",
        "SUMMARY: <one short sentence>",
        "AGENT: agent-ael|none",
        "MODE: goal|analysis|none",
        "GOAL: <short goal>",
        "REQUEST: <one short executable request or one short goal>",
        "SUCCESS: <success criteria>",
        "MISSING:",
        "- <missing item 1>",
        "- <missing item 2>",
        "COMPLETED:",
        "- <completed item 1>",
        "DEBUG: <short debug summary>",
      ].join(" "),
      "Recommend only one next atomic action. If more work is needed, Nova will call you again after the result.",
      "Do not call other agents yourself, do not write the final user answer, and do not execute commands.",
      "Never write shell syntax. If AEL is needed, set AGENT:agent-ael, MODE:goal, and describe the objective in natural language.",
      "AEL can create a new text or code file through its structured write-file action, with a one-time permission and readback verification. For this step, recommend agent-ael in goal mode with the desired file and content; do not invent a separate file tool or shell workaround. Supported targets are desktop and workspace, a single file name, UTF-8 content up to 128 KiB, no replacement. A simple file creation needs no multi-step plan and does not include executing the code.",
      "The AEL permission policy handles real permissions. Do not return needs-info merely because a command might require permission.",
      "Use needs-info only when information that cannot be discovered locally is genuinely required from the user.",
      "Treat COMPLETED as authoritative. Do not propose an equivalent action that already succeeded or failed without a materially different objective.",
      "Never return JSON, markdown, code fences, comments, numbering trees, or multiple alternative plans.",
      "If STATUS is ready, AGENT, MODE, GOAL, REQUEST and SUCCESS are mandatory.",
      "If STATUS is needs-info or blocked, set AGENT:none and MODE:none.",
      "Keep REQUEST short and atomic. Prefer one command or one short goal, never a multi-step workflow.",
      "Put optional context only in DEBUG. Keep SUMMARY and REQUEST concise.",
    ]
    : [
      "Reply in plain text only.",
      "Do not wrap the answer in JSON or markdown fences.",
    ];

  return createProviderTextInput(
    [
      `You are the Nova internal agent ${context.name}.`,
      `Agent description: ${context.description}.`,
      `Agent instructions: ${context.instructions}.`,
      `Runtime platform: ${runtimeContext.platform}.`,
      `Runtime shell: ${runtimeContext.shell}.`,
      `Runtime shell family: ${runtimeContext.shellFamily}.`,
      `Active provider: ${runtimeContext.activeProvider}.`,
      "Request source: assistant.",
      "Adapt all recommendations to the runtime platform.",
      "If the platform is darwin, do not suggest Linux-only commands such as lscpu, free, or journalctl unless you explicitly say they are Linux-specific alternatives.",
      ...acpInstructions,
      "Be concise, actionable, and useful for the main assistant.",
      "Do not speak to the end user. Help Nova reason, interpret, or decide the next step.",
    ],
    {
      request,
      source: "assistant",
      userPrompt,
    },
  );
}
