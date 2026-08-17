import { z } from "zod";

import type { LLMProvider, ChatMessage } from "../providers/types.js";
import type { Tool } from "../tools/types.js";

import { toLLMTool } from "../tools/helper.js";
import { settings } from "../config/settings.js";
import { ContextRetrievalWorker, MemoryWorker } from "../memory/worker.js";

import type { AgentEvent } from "./events.js";
import type { AgentConfig, Session } from "./types.js";

export class Agent {
  private readonly name: string;
  private readonly instructions: string;
  private readonly model: LLMProvider;
  private readonly tools: Tool[];
  private readonly handoffs: Agent[];

  private readonly outputSchema?: z.ZodType;
  private readonly memoryWorker?: MemoryWorker | undefined;
  private readonly contextWorker: ContextRetrievalWorker | undefined;

  private readonly toolApproval:
    | ((tool: Tool, args: unknown) => Promise<boolean>)
    | undefined;

  private readonly onEvent: ((event: AgentEvent) => void) | undefined;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.instructions = config.instructions;
    this.model = config.model;

    this.tools = config.tools ?? [];
    this.handoffs = config.handoffs ?? [];

    if (config.outputSchema) {
      this.outputSchema = config.outputSchema;
    }
    this.memoryWorker = config.memoryWorker;
    this.contextWorker = config.contextWorker;

    this.toolApproval = config.toolApproval;
    this.onEvent = config.onEvent;
  }

  async run<T = string>(input: string, session: Session): Promise<T> {
    // --------------------------------------------------
    // Agent started
    // --------------------------------------------------
    this.onEvent?.({
      type: "agent_started",
      input,
    });

    // --------------------------------------------------
    // Build initial messages
    // --------------------------------------------------
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

    // --------------------------------------------------
    // Retrieve relevant memory
    // --------------------------------------------------
    if (this.contextWorker) {
      const memories = await this.contextWorker.retrieve(input);

      if (memories.length > 0) {
        messages.push({
          role: "system",
          content: `
    Relevant project memory:

    ${JSON.stringify(memories, null, 2)}

    Use these memories when relevant. Do not invent facts beyond them.
    `,
        });
      }
    }

    // --------------------------------------------------
    // Structured output configuration
    // --------------------------------------------------

    const responseFormat = this.outputSchema
      ? {
          type: "json_schema" as const,
          json_schema: {
            name: "agent_output",
            schema: z.toJSONSchema(this.outputSchema) as Record<
              string,
              unknown
            >,
            strict: true,
          },
        }
      : undefined;

    // --------------------------------------------------
    // Build tool definitions
    // --------------------------------------------------
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

    // --------------------------------------------------
    // Agent execution loop
    // --------------------------------------------------
    for (
      let iteration = 0;
      iteration < settings.agentMaxIterations;
      iteration++
    ) {
      const response = await this.model.chat(messages, llmTools);

      // ------------------------------------------------
      // No tool call → final response
      // ------------------------------------------------
      if (!response.toolCalls?.length) {
        const finalResponse = response.content ?? "";

        // ----------------------------------------------
        // Structured output
        // ----------------------------------------------

        if (this.outputSchema) {
          const structuredResponse = await this.model.chat(
            messages,
            [],
            responseFormat
          );
          const parsed = JSON.parse(structuredResponse.content ?? "{}");
          const validated = this.outputSchema.parse(parsed);

          // Save conversation
          session.messages.push(
            { role: "user", content: input },
            { role: "assistant", content: JSON.stringify(validated) }
          );

          // Background memory processing
          this.runMemoryWorker(JSON.stringify(session.messages));

          // Agent completed
          this.onEvent?.({
            type: "agent_completed",
            output: validated,
          });

          return validated as T;
        }

        // ----------------------------------------------
        // Normal text output
        // ----------------------------------------------
        session.messages.push(
          { role: "user", content: input },
          { role: "assistant", content: finalResponse }
        );

        // Background memory processing
        this.runMemoryWorker(JSON.stringify(session.messages));

        // Agent completed
        this.onEvent?.({
          type: "agent_completed",
          output: finalResponse,
        });

        return finalResponse as T;
      }

      // ------------------------------------------------
      // Preserve assistant tool call
      // ------------------------------------------------
      messages.push({
        role: "assistant",
        content: response.content ?? "",
        tool_calls: response.toolCalls,
      });

      // ------------------------------------------------
      // Execute tool calls
      // ------------------------------------------------
      for (const toolCall of response.toolCalls) {
        // ----------------------------------------------
        // Handoff
        // ----------------------------------------------

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

        // ----------------------------------------------
        // Find normal tool
        // ----------------------------------------------

        const tool = this.tools.find((tool) => tool.name === toolCall.name);

        if (!tool) throw new Error(`Tool not found: ${toolCall.name}`);

        const args = JSON.parse(toolCall.arguments);

        // ----------------------------------------------
        // Tool approval
        // ----------------------------------------------
        if (tool.approval === "approval_required") {
          if (!this.toolApproval) {
            messages.push({
              role: "tool",
              content: JSON.stringify({
                error: `Tool approval required: ${tool.name}`,
              }),
              tool_call_id: toolCall.id,
            });

            continue;
          }

          const approved = await this.toolApproval(tool, args);

          if (!approved) {
            messages.push({
              role: "tool",
              content: JSON.stringify({
                error: `Tool execution denied: ${tool.name}`,
                instruction:
                  "Do not retry this tool. Continue using another approach if possible.",
              }),
              tool_call_id: toolCall.id,
            });

            this.onEvent?.({
              type: "tool_denied",
              tool: tool.name,
            });

            continue;
          }
        }

        // ----------------------------------------------
        // Tool called event
        // ----------------------------------------------
        this.onEvent?.({
          type: "tool_called",
          tool: tool.name,
          arguments: JSON.parse(toolCall.arguments),
        });

        let result: unknown;

        // ----------------------------------------------
        // Execute tool
        // ----------------------------------------------

        try {
          // const args = JSON.parse(toolCall.arguments);
          // result = await tool.execute(args);

          result = await this.executeTool(tool, args);

          this.onEvent?.({
            type: "tool_completed",
            tool: tool.name,
            result,
          });

          // console.log("TOOL RESULT:", result);
        } catch (error) {
          result = {
            error:
              error instanceof Error ? error.message : "Tool execution failed",
          };

          this.onEvent?.({
            type: "agent_error",
            error:
              error instanceof Error ? error.message : "Unknown agent error",
          });
        }

        // ----------------------------------------------
        // Return tool result to LLM
        // ----------------------------------------------
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

    // --------------------------------------------------
    // Maximum iterations reached
    // --------------------------------------------------
    const error = "Agent reached maximum iterations";

    this.onEvent?.({
      type: "agent_error",
      error,
    });

    throw new Error(error);
  }

  // ----------------------------------------------------
  // Background memory worker
  // ----------------------------------------------------
  private runMemoryWorker(conversation: string): void {
    if (!this.memoryWorker) return;

    void this.memoryWorker.process(conversation).catch((error) => {
      console.error("Background memory worker failed:", error);
    });
  }

  private async executeTool(tool: Tool, args: unknown): Promise<unknown> {
    const maxAttempts = tool.retry?.attempts ?? 1;
    const delayMs = tool.retry?.delayMs ?? 0;
    const timeoutMs = tool.timeoutMs ?? 10_000;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const startedAt = Date.now();

      try {
        const result = await Promise.race([
          tool.execute(args),

          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(
                new Error(`Tool ${tool.name} timed out after ${timeoutMs}ms`)
              );
            }, timeoutMs);
          }),
        ]);

        this.onEvent?.({
          type: "tool_trace",
          tool: tool.name,
          durationMs: Date.now() - startedAt,
        });

        return result;
      } catch (error) {
        lastError = error;

        this.onEvent?.({
          type: "tool_trace",
          tool: tool.name,
          durationMs: Date.now() - startedAt,
        });

        if (attempt < maxAttempts) {
          this.onEvent?.({
            type: "tool_retry",
            tool: tool.name,
            attempt: attempt + 1,
          });

          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }
    }

    throw lastError;
  }
}
