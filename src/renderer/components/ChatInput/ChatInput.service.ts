export function normalizePrompt(value: string): string {
  return value.trim();
}

export function resizeTextarea(textarea: HTMLTextAreaElement): void {
  textarea.style.height = "0px";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 136)}px`;
  textarea.style.overflowY = textarea.scrollHeight > 136 ? "auto" : "hidden";
}
