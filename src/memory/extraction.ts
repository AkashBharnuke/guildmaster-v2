import { z } from "zod";
import type { LLMProvider } from "../providers/types.js";
import type { Memory } from "./types.js";
import { extractPrompt } from "../prompts/main-agent.js"

const extractionSchema = z.object({
    memories: z.array(
        z.object({
            subject: z.string(),
            relationship: z.string(),
            object: z.string(),
        })
    ),
});


const responseFormat = {
    type: "json_schema" as const,
    json_schema: {
        name: "memory_extraction",
        schema: z.toJSONSchema(extractionSchema) as Record<string, unknown>,
        strict: true,
    },
};

export async function extractMemories(
  conversation: string,
  llm: LLMProvider
): Promise<Memory[]> {
    const response = await llm.chat([
        { role: "system", content: extractPrompt }, 
        { role: "user", content: conversation }
    ], [], responseFormat);

    const parsed = JSON.parse(response.content ?? "[]");
    return extractionSchema.parse(parsed).memories;
}
