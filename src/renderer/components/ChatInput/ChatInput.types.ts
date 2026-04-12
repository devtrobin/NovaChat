export type ChatInputProps = {
  isSending: boolean;
  onSubmit: (value: string) => Promise<void>;
};
