import { ChatMessage } from "../../renderer/types/chat.types";
import { AgentContextFile, AgentId, AgentRequestSource } from "../../shared/agent.types";
import { AgentRuntimeContext } from "../agents/agent-prompt.service";

export function buildInput(messages: ChatMessage[], enabledAgents: AgentId[]) {
  const enabledDeviceAgent = enabledAgents.includes("device-agent");
  const enabledPlannerAgent = enabledAgents.includes("agent-planner");
  const agentInstructions = [
    enabledPlannerAgent
      ? 'For any non-trivial request, first ask agent-planner for the next atomic step by replying exactly like: {"from":"assistant","to":"agent","agentId":"agent-planner","content":"<planning request>"}'
      : "The agent-planner is currently disabled. Plan internally and answer directly unless another enabled agent is required.",
    enabledDeviceAgent
      ? 'If you need the device-agent with an exact shell command, reply exactly like: {"from":"assistant","to":"agent","agentId":"device-agent","content":"<single shell command body>"}'
      : "The device-agent is currently disabled. Do not delegate work to it.",
    enabledDeviceAgent
      ? 'If local execution is needed but you want the device-agent to design the command, reply exactly like: {"from":"assistant","to":"agent","agentId":"device-agent","content":"GOAL: <short execution objective>"}'
      : "Do not emit GOAL requests for device-agent while it is disabled.",
    enabledDeviceAgent
      ? "Use the device-agent only when the request truly needs local execution or machine inspection."
      : "Do not use the device-agent.",
    enabledPlannerAgent
      ? "Use agent-planner as a planning advisor only. It recommends the next atomic step and an agent, but you remain responsible for orchestration."
      : "Do not use agent-planner.",
    enabledPlannerAgent
      ? "After receiving a planner result, decide whether to call device-agent, ask the user for missing information, ask planner for a revised next step, or answer the user."
      : "",
    enabledPlannerAgent
      ? 'Example planner handoff: {"from":"assistant","to":"agent","agentId":"agent-planner","content":"Planifie la prochaine etape atomique pour diagnostiquer cette demande."}'
      : "",
  ].filter(Boolean).join(" ");

  return [
    {
      content: [
        {
          text: [
            "You are Nova.",
            "You are the main assistant. Specialized internal agents exist: agent-planner plans next atomic steps, and device-agent executes device commands.",
            "You receive the full conversation as Nova JSON messages.",
            "Each message uses this schema: { id, from, to, agentId?, content, createdAt, status?, result?, commandId?, actionType?, actionLabel?, isExpandable? }.",
            "Reply only with one minified JSON object compatible with the Nova format subset.",
            'If you answer the user directly, reply exactly like: {"from":"assistant","to":"user","content":"..."}',
            agentInstructions,
            "Prefer GOAL when the user request is high-level, when you need the device-agent to choose the best command, or when you are not fully confident in the exact shell command yet.",
            'When you reply to "agent", Nova delegates the request to the targeted internal agent, waits for the result, and then gives you the result back in the conversation.',
            "If agent-planner has already answered in this turn and Nova already executed the recommended nextStep successfully, do not call agent-planner again. Answer the user directly or ask one precise follow-up question.",
            "Only call agent-planner again after a real blocker, a failed execution, a partial result, or newly discovered missing information.",
            "Never answer as user, device or system.",
            "When you ask an agent to do work, the result will come back later in the conversation as a Nova message from agent or device to assistant.",
            "Use device commands only when they are genuinely needed.",
            "For local read-only inspection, do not ask the user for a textual authorization first. Delegate directly to the device-agent.",
            "Do not ask the user which operating system they use when the device-agent can detect it locally.",
            "Only ask the user for confirmation when the real Nova permission workflow is needed for a blocked command. Do not invent an extra manual permission step in natural language.",
            "Device commands must be robust and simple.",
            "Do not wrap the command in bash -lc, zsh -lc, sh -c, cmd /c, or powershell -Command because Nova already executes the command in a shell.",
            "Avoid heredoc blocks, multi-layer escaping, nested quoting, and giant one-liners when a simpler command is possible.",
            "Prefer short sequential shell commands joined with && when needed.",
            "When you can inspect with one command and answer after the result returns, do that instead of generating a huge diagnostic script.",
            "Never wrap JSON in markdown fences.",
          ].join(" "),
          type: "input_text",
        },
      ],
      role: "developer",
    },
    {
      content: [
        {
          text: JSON.stringify({
            conversation: messages.map(toProviderMessage),
          }),
          type: "input_text",
        },
      ],
      role: "user",
    },
  ];
}

function toProviderMessage(message: ChatMessage) {
  return {
    actionLabel: message.actionLabel,
    actionType: message.actionType,
    agentId: message.agentId,
    commandId: message.commandId,
    content: message.content,
    createdAt: message.createdAt,
    from: message.from,
    id: message.id,
    inputPlaceholder: message.inputPlaceholder,
    inputRequested: message.inputRequested,
    inputSecret: message.inputSecret,
    isExpandable: message.isExpandable,
    result: sanitizeResult(message.result),
    status: message.status,
    to: message.to,
  };
}

function sanitizeResult(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.length <= 4000) return value;
  return `${value.slice(0, 4000)}\n\n[output truncated: ${value.length - 4000} chars omitted]`;
}

export function buildDeviceAgentInput(
  context: AgentContextFile,
  runtimeContext: AgentRuntimeContext,
  goal: string,
  userPrompt: string,
) {
  return [
    {
      content: [
        {
          text: [
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
          ].join(" "),
          type: "input_text",
        },
      ],
      role: "developer",
    },
    {
      content: [
        {
          text: JSON.stringify({
            goal,
            userPrompt,
          }),
          type: "input_text",
        },
      ],
      role: "user",
    },
  ];
}

export function buildGenericAgentInput(
  agentId: AgentId,
  context: AgentContextFile,
  runtimeContext: AgentRuntimeContext,
  request: string,
  userPrompt: string,
  source: AgentRequestSource,
) {
  return [
    {
      content: [
        {
          text: [
            `You are the Nova internal agent ${context.name}.`,
            `Agent description: ${context.description}.`,
            `Agent instructions: ${context.instructions}.`,
            `Runtime platform: ${runtimeContext.platform}.`,
            `Runtime shell: ${runtimeContext.shell}.`,
            `Active provider: ${runtimeContext.activeProvider}.`,
            `Request source: ${source}.`,
            "Adapt all recommendations to the runtime platform.",
            "If the platform is darwin, do not suggest Linux-only commands such as lscpu, free, or journalctl unless you explicitly say they are Linux-specific alternatives.",
            agentId === "agent-planner"
              ? "Return plain text only using labeled sections, not JSON."
              : "Reply in plain text only.",
            agentId === "agent-planner"
              ? [
                "Use exactly these top-level labels, each on its own line:",
                "STATUS: ready|needs-info|blocked",
                "SUMMARY: <one short sentence>",
                "AGENT: device-agent|none",
                "MODE: goal|command|analysis|none",
                "GOAL: <short goal>",
                "REQUEST: <one short executable request or one short goal>",
                "SUCCESS: <success criteria>",
                "MISSING:",
                "- <missing item 1>",
                "- <missing item 2>",
                "COMPLETED:",
                "- <completed item 1>",
                "DEBUG: <short debug summary>",
              ].join(" ")
              : "Do not wrap the answer in JSON or markdown fences.",
            agentId === "agent-planner"
              ? "Recommend only one next atomic action. If more work is needed, Nova will call you again after the result."
              : "",
            agentId === "agent-planner"
              ? "Do not call other agents yourself, do not write the final user answer, and do not execute commands."
              : "",
            agentId === "agent-planner"
              ? "Never return JSON, markdown, code fences, comments, numbering trees, or multiple alternative plans."
              : "",
            agentId === "agent-planner"
              ? "If STATUS is ready, AGENT, MODE, GOAL, REQUEST and SUCCESS are mandatory."
              : "",
            agentId === "agent-planner"
              ? "If STATUS is needs-info or blocked, set AGENT:none and MODE:none."
              : "",
            agentId === "agent-planner"
              ? "Keep REQUEST short and atomic. Prefer one command or one short goal, never a multi-step workflow."
              : "",
            agentId === "agent-planner"
              ? "Put optional context only in DEBUG. Keep SUMMARY and REQUEST concise."
              : "",
            source === "assistant"
              ? "Be concise, actionable, and useful for the main assistant."
              : "Answer directly to the user in a concise and useful way.",
            source === "assistant"
              ? "Do not speak to the end user. Help Nova reason, interpret, or decide the next step."
              : "Speak directly to the user.",
          ].join(" "),
          type: "input_text",
        },
      ],
      role: "developer",
    },
    {
      content: [
        {
          text: JSON.stringify({
            request,
            source,
            userPrompt,
          }),
          type: "input_text",
        },
      ],
      role: "user",
    },
  ];
}
