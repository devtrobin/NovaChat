import { ChatMessage } from "../../renderer/types/chat.types";

export function buildInput(messages: ChatMessage[]) {
  return [
    {
      content: [
        {
          text: [
            "You are Nova.",
            "You receive the full conversation as Nova JSON messages.",
            "Each message uses this schema: { id, from, to, content, createdAt, status?, result?, commandId?, actionType?, actionLabel?, isExpandable? }.",
            "Reply only with one minified JSON object compatible with the Nova format subset.",
            'If you answer the user directly, reply exactly like: {"from":"assistant","to":"user","content":"..."}',
            'If you need the local machine to run a shell command, reply exactly like: {"from":"assistant","to":"device","content":"<single shell command body>"}',
            "Never answer as user, device or system.",
            "When you ask the device to run a command, the device result will come back later in the conversation as a Nova message from device to assistant.",
            "Use device commands only when they are genuinely needed.",
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
