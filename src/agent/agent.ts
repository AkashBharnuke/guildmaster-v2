import type { LLMProvider, ChatMessage } from "../providers/types.js";
import { AgentConfig, Session } from "./types.js";
import type { Tool } from "../tools/types.js";
import { toLLMTool } from "../tools/helper.js";
import { settings } from "../config/settings.js";
import { z } from "zod";

export class Agent {
  private readonly name: string;
  private readonly instructions: string;
  private readonly model: LLMProvider;
  private readonly tools: Tool[];
  private readonly handoffs: Agent[];
  private readonly outputSchema?: z.ZodType;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.instructions = config.instructions;
    this.model = config.model;
    this.tools = config.tools ?? [];
    this.handoffs = config.handoffs ?? [];
    if (config.outputSchema) {
      this.outputSchema = config.outputSchema;
    }
  }

  async run<T = string>(input: string, session: Session): Promise<T> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: this.instructions,
      },
      ...session.messages,
      {
        role: "user",
        content: input,
      },
    ];

    const responseFormat = this.outputSchema
    ? {
        type: "json_schema" as const,
        json_schema: {
            name: "agent_output",
            schema: z.toJSONSchema(this.outputSchema) as Record<string, unknown>,
            strict: true,
        },
    }
    : undefined;

    const toolDefinitions = this.tools.map(toLLMTool);
    const handoffTools = this.handoffs.map((agent) => ({
      type: "function" as const,
      function: {
        name: `handoff_to_${agent.name}`,
        description: `Delegate the task to ${agent.name}.`,
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Why this task should be delegated.",
            },
          },
          required: ["reason"],
        },
      },
    }));

    const llmTools = [...toolDefinitions, ...handoffTools];

    for (
      let iteration = 0;
      iteration < settings.agentMaxIterations;
      iteration++
    ) {
      const response = await this.model.chat(messages, llmTools);

      // No tool call → final answer
      if (!response.toolCalls?.length) {
        const finalResponse = response.content ?? "";

        if (this.outputSchema) {
          const structuredResponse = await this.model.chat(
              messages,
              [],
              responseFormat
          );
          const parsed = JSON.parse(structuredResponse.content ?? "{}");
          const validated = this.outputSchema.parse(parsed);

          return validated as T;
        }
        session.messages.push(
          {
            role: "user",
            content: input,
          },
          {
            role: "assistant",
            content: finalResponse,
          }
        );

        return finalResponse as T;
      }

      // Preserve assistant tool-call message
      messages.push({
        role: "assistant",
        content: response.content ?? "",
        tool_calls: response.toolCalls,
      });

      // Execute requested Tool Calls
      for (const toolCall of response.toolCalls) {
        // Check for handoff
        const handoffAgent = this.handoffs.find(
          (agent) => `handoff_to_${agent.name}` === toolCall.name
        );

        if (handoffAgent) {
          let args: { reason?: string };

          try {
            args = JSON.parse(toolCall.arguments);
          } catch {
            args = {};
          }

          const handoffResult = await handoffAgent.run(
            `${args.reason ?? ""}\n\nOriginal task: ${input}`,
            {
              id: `handoff-${Date.now()}`,
              messages: [],
            }
          );

          messages.push({
            role: "tool",
            content: JSON.stringify({
              agent: handoffAgent.name,
              result: handoffResult,
            }),
            tool_call_id: toolCall.id,
          });

          continue;
        }

        // Normal Tool Call
        const tool = this.tools.find((tool) => tool.name === toolCall.name);

        if (!tool) throw new Error(`Tool not found: ${toolCall.name}`);

        let result: unknown;

        try {
          const args = JSON.parse(toolCall.arguments);
          result = await tool.execute(args);

          // console.log("TOOL RESULT:", result);
        } catch (error) {
          result = {
            error:
              error instanceof Error ? error.message : "Tool execution failed",
          };
        }

        messages.push({
          role: "tool",
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        });

        console.log(
          "MESSAGES BEFORE NEXT LLM CALL:",
          JSON.stringify(messages, null, 2)
        );
      }
    }

    throw new Error("Agent reached maximum iterations");
  }
}
