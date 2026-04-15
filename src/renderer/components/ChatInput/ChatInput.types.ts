export type ChatInputProps = {
  isSending: boolean;
  onChange: (value: string) => void;
  onSubmit: (value: string) => Promise<void>;
  value: string;
};
