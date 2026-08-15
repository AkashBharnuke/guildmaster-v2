import { Tool } from "./types.js";

export function toLLMTool(tool: Tool) {
    return {
        type: "function" as const,
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
        },
    };
}