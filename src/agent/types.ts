import type { LLMProvider, ChatMessage } from "../providers/types.js";
import { Tool } from "../tools/types.js";
import { Agent } from "./agent.js";
import type { z } from "zod";

export interface AgentConfig {
    name: string;
    instructions: string;
    model: LLMProvider;
    tools?: Tool[];
    handoffs?: Agent[];
    outputSchema?: z.ZodType;
}

export interface Session {
    id: string;
    messages: ChatMessage[];
}

