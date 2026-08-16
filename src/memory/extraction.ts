import { z } from "zod";
import type { LLMProvider } from "../providers/types.js";
import type { Memory } from "./types.js";
import { extractPrompt } from "../prompts/main-agent.js"

const memorySchema = z.array(
  z.object({
    subject: z.string(),
    relationship: z.string(),
    object: z.string(),
  })
);

export async function extractMemories(
  conversation: string,
  llm: LLMProvider
): Promise<Memory[]> {
    const response = await llm.chat([
        {
            role: "system",
            content: extractPrompt
        },
        {
            role: "user",
            content: conversation
        }
    ]);

    const parsed = JSON.parse(response.content ?? "[]");
    return memorySchema.parse(parsed);
}
