import { z } from "zod";
import type { Tool } from "../types.js";
import { Neo4jMemory } from "../../memory/neo4j.js";

const projectMemoryInput = z.object({
    query: z.string().min(3),
});
const memory = new Neo4jMemory();

export const projectMemory: Tool = {
    name: "project_memory",

    description:
        "Search the project's long-term memory for relevant facts, relationships, technologies, decisions, and previous project context.",

    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description:
                    "The information or context to retrieve from project memory.",
            },
        },
        required: ["query"],
    },

    async execute(input: unknown) {
        const parsed = projectMemoryInput.parse(input);

        // Neo4j implementation comes next.
        const memories = await memory.search(parsed.query);

        return {
            source: "project_memory",
            facts: memories
        }
    },
};