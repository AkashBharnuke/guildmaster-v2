import type { LLMProvider } from "../providers/types.js";
import type { Memory } from "./types.js";
import { extractMemories } from "./extraction.js";
import { Neo4jMemory } from "./neo4j.js";

export class MemoryWorker {
    constructor(private readonly llm: LLMProvider, private readonly memory: Neo4jMemory) {}

    async process(conversation: string): Promise<void> {
        const memories: Memory[] = await extractMemories(conversation, this.llm);
    
        for (const memory of memories) {
            await this.memory.save(memory);
        }
    }
}


export class ContextRetrievalWorker {
    constructor(
        private readonly memory: Neo4jMemory,
    ) {}

    async retrieve(query: string): Promise<Memory[]> {
        return this.memory.search(query);
    }
}