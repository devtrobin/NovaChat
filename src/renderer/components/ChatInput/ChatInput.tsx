import React from "react";
import { normalizePrompt, resizeTextarea } from "./ChatInput.service";
import { ChatInputProps } from "./ChatInput.types";
import "./ChatInput.css";

export default function ChatInput({ isSending, onSubmit }: ChatInputProps) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    resizeTextarea(textarea);
  }, [value]);

  async function submitPrompt() {
    const prompt = normalizePrompt(value);
    if (!prompt || isSending) return;
    setValue("");
    await onSubmit(prompt);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitPrompt();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void submitPrompt();
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <div className="chat-input__field-wrap">
        <textarea
          className="chat-input__field"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ecris ton message"
          ref={textareaRef}
          rows={1}
          value={value}
        />
        <p className="chat-input__hint">Entrer pour envoyer · Maj + Entrer pour une nouvelle ligne</p>
      </div>
      <button className="chat-input__button" disabled={isSending} type="submit">
        {isSending ? "Envoi..." : "Envoyer"}
      </button>
    </form>
  );
}
