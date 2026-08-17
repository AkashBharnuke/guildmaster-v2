import { ContextRetrievalWorker, MemoryWorker } from "../memory/worker.js";
import type { LLMProvider, ChatMessage } from "../providers/types.js";
import { Tool } from "../tools/types.js";
import { Agent } from "./agent.js";
import type { z } from "zod";
import { AgentEvent } from "./events.js";

export interface AgentConfig {
    name: string;
    instructions: string;
    model: LLMProvider;
    tools?: Tool[];
    handoffs?: Agent[];
    outputSchema?: z.ZodType;
    memoryWorker?: MemoryWorker;
    contextWorker?: ContextRetrievalWorker;
    toolApproval?: (tool: Tool, args: unknown) => Promise<boolean>;
    onEvent?: (event: AgentEvent) => void;
}

export interface Session {
    id: string;
    messages: ChatMessage[];
}

