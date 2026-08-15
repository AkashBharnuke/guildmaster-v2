export interface ChatMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_call_id?: string;
    tool_calls?: ToolCall[];
}

export interface LLMResponse {
  content?: string;
  toolCalls?: ToolCall[];
}

export interface LLMProvider {
    chat(messages: ChatMessage[], tools?: unknown[]): Promise<LLMResponse>
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}
