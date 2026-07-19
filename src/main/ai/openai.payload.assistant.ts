import { AgentId } from "../../shared/agent.types";
import { ChatMessage } from "../../shared/chat.types";
import { createProviderTextInput } from "./openai.payload.shared";

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

  return createProviderTextInput(
    [
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
    ],
    { conversation: messages.map(toProviderMessage) },
  );
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
