import { OpenAI } from "openai";
import { settings } from "../config/settings.js";
import type { ChatMessage, LLMResponse, LLMProvider, ResponseFormat } from "./types.js";

class GroqProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: settings.llmApiKey,
      baseURL: settings.llmEndpoint,
    });
  }

  async chat(messages: ChatMessage[], tools?: unknown[], responseFormat?: ResponseFormat): Promise<LLMResponse> {
    const openAIMessages = messages.map((message) => {
      switch (message.role) {
        case "system":
          return {
            role: "system" as const,
            content: message.content ?? "",
          };

        case "user":
          return {
            role: "user" as const,
            content: message.content ?? "",
          };

        case "tool":
          return {
            role: "tool" as const,
            tool_call_id: message.tool_call_id!,
            content: message.content ?? "",
          };

        case "assistant":
          return {
            role: "assistant" as const,
            content: message.content ?? null,
            ...(message.tool_calls && {
              tool_calls: message.tool_calls.map((call) => ({
                id: call.id,
                type: "function" as const,
                function: {
                  name: call.name,
                  arguments: call.arguments,
                },
              })),
            }),
          };
      }
    });

    const groqResponseFormat:
  | OpenAI.Chat.Completions.ChatCompletionCreateParams["response_format"]
  | undefined = responseFormat
    ? {
        type: "json_schema",
        json_schema: {
          name: responseFormat.json_schema.name,
          schema: responseFormat.json_schema.schema,
          strict: responseFormat.json_schema.strict ?? true,
        },
      }
    : undefined;


    // console.log("RESPONSE FORMAT:", JSON.stringify(groqResponseFormat, null, 2));
    // console.log("TOOLS:", tools?.length);

    const response = await this.client.chat.completions.create({
      model: settings.llmModel,
      temperature: settings.llmTemperature,
      top_p: settings.llmTopP,
      max_completion_tokens: settings.llmMaxTokens,
      messages: openAIMessages,
      ...(tools && tools.length > 0 && {
        tools: tools as OpenAI.Chat.Completions.ChatCompletionTool[],
        tool_choice: "auto" as const,
    }),
      ...(groqResponseFormat && { response_format: groqResponseFormat})
    });

    // console.log("RAW LLM RESPONSE:", JSON.stringify(response, null, 2));

    const message = response.choices[0]?.message;

    const toolCalls = message?.tool_calls?.filter((call) => call.type === "function").map((call) => ({
                id: call.id,
                name: call.function.name,
                arguments: call.function.arguments,
            }));



    const result: LLMResponse = {
        content: message?.content ?? "",
    };

    if (toolCalls && toolCalls.length > 0) {
        result.toolCalls = toolCalls;
    }

    return result;        
    // # Short Hand 
    // return {
    //   content: message?.content ?? "",
    //   ...(toolCalls && toolCalls.length > 0 && { toolCalls: toolCalls })
    // };




  }
}

export const llm = new GroqProvider();
