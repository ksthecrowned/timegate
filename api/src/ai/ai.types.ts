export type AiPlanFeatures = {
  aiCopilotEnabled?: boolean;
  aiTokensPerMonth?: number | null;
};

export type CopilotSource = {
  label: string;
  href: string;
};

export type CopilotChatMessage = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt?: string;
};

export type CopilotToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type CopilotLlmAction =
  | { action: 'tool'; tool: string; arguments: Record<string, unknown> }
  | { action: 'answer'; text: string; sources?: CopilotSource[] };

export type CloudflareChatResult = {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
};
