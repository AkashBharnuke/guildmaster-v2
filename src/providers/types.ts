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
    chat(messages: ChatMessage[], tools?: unknown[], responseFormat?: ResponseFormat): Promise<LLMResponse>
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ResponseFormat {
    type: "json_schema";
    json_schema: {
        name: string;
        schema: Record<string, unknown>;
        strict?: boolean;
    };
}