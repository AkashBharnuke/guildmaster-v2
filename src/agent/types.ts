import type { LLMProvider, ChatMessage } from "../providers/types.js";
import { Tool } from "../tools/types.js";

export interface AgentConfig {
    name: string;
    instructions: string;
    model: LLMProvider;
    tools?: Tool[]
}