import { Agent } from "./agent/agent.js";
import { mainAgentPrompt } from "./prompts/main-agent.js";
import { llm } from "./providers/groq.js";
import { Neo4jMemory } from "./memory/neo4j.js";
import { getSession } from "./agent/session.js";

import { githubRepo } from "./tools/tools/github-repo.js";
import { projectMemory } from "./tools/tools/project-memory.js";
import { searchWeb } from "./tools/tools/search-web.js";
import { extractMemories } from "./memory/extraction.js";
import { researchAgentPrompt } from "./prompts/research-agent.js";
import { z } from "zod";


const memory = new Neo4jMemory();

const outputSchema = z.object({
    answer: z.string(),
    confidence: z.number(),
});

const researchAgent = new Agent({
    name: "ResearchAgent",
    instructions: researchAgentPrompt,
    model: llm,
    tools: [
        searchWeb,
        githubRepo,
    ],
});

const agent = new Agent({
    name: "GuildMaster",
    instructions: mainAgentPrompt,
    model: llm,
    tools: [
        searchWeb,
        githubRepo,
        projectMemory,
    ],
    handoffs: [researchAgent],
    outputSchema: outputSchema,
});

const session = getSession("demo");

const result = await agent.run<z.infer<typeof outputSchema>>(
    "Research the current state of Neo4j for AI agent memory and give me a concise technical summary.",
    session
);

console.log(result);


// const memories = await extractMemories(
//     `
//     GuildMaster is written in TypeScript.
//     It uses Neo4j for graph-based memory.
//     `,
//     llm
// );

// const memory = new Neo4jMemory();

// for (const item of memories) {
//     await memory.save(item);
// }

// await memory.close();

// console.log("Memories stored:", memories);