type ProviderTextInput = {
  content: Array<{
    text: string;
    type: "input_text";
  }>;
  role: "developer" | "user";
};

export function createProviderTextInput(
  developerInstructions: string[],
  userPayload: unknown,
): ProviderTextInput[] {
  return [
    {
      content: [{
        text: developerInstructions.filter(Boolean).join(" "),
        type: "input_text",
      }],
      role: "developer",
    },
    {
      content: [{
        text: JSON.stringify(userPayload),
        type: "input_text",
      }],
      role: "user",
    },
  ];
}
