export type ChatInputProps = {
  isSending: boolean;
  onChange: (value: string) => void;
  onStop: () => Promise<void>;
  onSubmit: (value: string) => Promise<void>;
  value: string;
};
