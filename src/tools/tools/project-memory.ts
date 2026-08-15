import { z } from "zod";
import type { Tool } from "../types.js";

const projectMemoryInput = z.object({
    query: z.string().min(3),
});

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
        return {
            query: parsed.query,
            memories: [],
        };
    },
};