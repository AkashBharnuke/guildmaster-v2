import type { LLMProvider, ChatMessage } from "../providers/types.js";
import { AgentConfig } from "./types.js";
import type { Tool } from "../tools/types.js";
import { toLLMTool } from "../tools/helper.js";
import { settings } from "../config/settings.js";


export class Agent {
    private readonly name: string;
    private readonly instructions: string;
    private readonly model: LLMProvider;
    private readonly tools: Tool[];

    constructor(config: AgentConfig) {
        this.name = config.name;
        this.instructions = config.instructions;
        this.model = config.model;
        this.tools = config.tools ?? [];
    } 
    
    async run(input: string): Promise<string> {
        const messages: ChatMessage[] = [
            {
                role: "system",
                content: this.instructions,
            },
            {
                role: "user",
                content: input,
            },
        ];

        const llmTools = this.tools.map(toLLMTool);
        
        for (let iteration = 0; iteration < settings.agentMaxIterations; iteration++) {
            const response = await this.model.chat(messages, llmTools);

            // No tool call → final answer
            if (!response.toolCalls?.length) return response.content ?? "";

            // Add assistant's tool-call message
            messages.push({
                role: "assistant",
                content: response.content ?? "",
                tool_calls: response.toolCalls
            });

            // Execute requested Tool Calls
            for (const toolCall of response.toolCalls) {
                const tool = this.tools.find(
                    (tool) => tool.name === toolCall.name
                );

                if(!tool) throw new Error(`Tool not found: ${toolCall.name}`);
                
                let result: unknown;

                try {
                    const args = JSON.parse(toolCall.arguments);
                    result = await tool.execute(args);
                }
                catch(error) {
                    result = {
                        error: error instanceof Error ? error.message : "Tool execution failed"
                    };
                }
                
                messages.push({
                    role: "tool",
                    content: JSON.stringify(result),
                    tool_call_id: toolCall.id
                });

            }


        }

        throw new Error("Agent reached maximum iterations");
 
    }    


}
