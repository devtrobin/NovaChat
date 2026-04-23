import { ChatMessage } from "../../renderer/types/chat.types";
import { AgentContextFile, AgentId, AgentRequestSource } from "../../shared/agent.types";
import { AgentRuntimeContext } from "../agents/agent-prompt.service";

export function buildInput(messages: ChatMessage[], enabledAgents: AgentId[]) {
  const enabledDeviceAgent = enabledAgents.includes("device-agent");
  const enabledDiagnosticAgent = enabledAgents.includes("diagnostic-agent");
  const agentInstructions = [
    enabledDeviceAgent
      ? 'If you need the device-agent with an exact shell command, reply exactly like: {"from":"assistant","to":"agent","agentId":"device-agent","content":"<single shell command body>"}'
      : "The device-agent is currently disabled. Do not delegate work to it.",
    enabledDeviceAgent
      ? 'If local execution is needed but you want the device-agent to design the command, reply exactly like: {"from":"assistant","to":"agent","agentId":"device-agent","content":"GOAL: <short execution objective>"}'
      : "Do not emit GOAL requests for device-agent while it is disabled.",
    enabledDiagnosticAgent
      ? 'If you need the diagnostic-agent for analysis, reply exactly like: {"from":"assistant","to":"agent","agentId":"diagnostic-agent","content":"<short diagnostic request>"}'
      : "The diagnostic-agent is currently disabled. Do not delegate work to it.",
    enabledDeviceAgent
      ? "Use the device-agent only when the request truly needs local execution or machine inspection."
      : "Do not use the device-agent.",
    enabledDiagnosticAgent
      ? "Use the diagnostic-agent only when you need internal analysis, triage, interpretation of a result, failure analysis, or a second reasoning pass without machine execution."
      : "Do not use the diagnostic-agent.",
    enabledDiagnosticAgent
      ? "Prefer the diagnostic-agent for requests about diagnosis, debugging strategy, failure analysis, handoff problems, workflow analysis, suspicious behavior, investigation plans, or interpretation of prior results."
      : "If the user asks for diagnosis or investigation, answer directly without diagnostic-agent.",
    enabledDiagnosticAgent
      ? 'Example diagnostic handoff: {"from":"assistant","to":"agent","agentId":"diagnostic-agent","content":"Analyse un echec de handoff entre agents et propose une piste de diagnostic."}'
      : "",
  ].filter(Boolean).join(" ");

  return [
    {
      content: [
        {
          text: [
            "You are Nova.",
            "You are the main assistant. A specialized internal agent named device-agent is responsible for device command execution.",
            "You receive the full conversation as Nova JSON messages.",
            "Each message uses this schema: { id, from, to, agentId?, content, createdAt, status?, result?, commandId?, actionType?, actionLabel?, isExpandable? }.",
            "Reply only with one minified JSON object compatible with the Nova format subset.",
            'If you answer the user directly, reply exactly like: {"from":"assistant","to":"user","content":"..."}',
            agentInstructions,
            "Prefer GOAL when the user request is high-level, when you need the device-agent to choose the best command, or when you are not fully confident in the exact shell command yet.",
            'When you reply to "agent", Nova delegates the request to the targeted internal agent, waits for the result, and then gives you the result back in the conversation.',
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
            "Reply in plain text only.",
            "Do not wrap the answer in JSON or markdown fences.",
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
