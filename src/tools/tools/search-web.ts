import { z } from "zod";
import type { Tool } from "../types.js";

const searchInput = z.object({
    query: z.string().min(3)
});

export const searchWeb: Tool = {
    name: "search_web",
    description: "Search the web for current technical information, documentation, or research.",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The sesarch query",
            },
        },
        required: ["query"]
    },
    async execute(input: unknown) {
        const parsed = searchInput.parse(input);
        
        // Actual search implementation comes next.
        return {
            query: parsed.query,
            results: [],
        };
    }
}