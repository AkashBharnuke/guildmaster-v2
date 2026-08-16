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


// export function toHandoffTool(agent: Agent) {
//     return {
//         type: "function" as const,
//         function: {
//             name: `handoff_to_${agent.name}`,
//             description: `Transfer the current task to ${agent.name}.`,
//             parameters: {
//                 type: "object",
//                 properties: {
//                     reason: {
//                         type: "string",
//                         description: "Why this agent should handle the task.",
//                     },
//                 },
//                 required: ["reason"],
//             },
//         },
//     };
// }