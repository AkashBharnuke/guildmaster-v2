import { Agent } from "../src/agent/agent.js";
import { mainAgentPrompt } from "../src/prompts/main-agent.js";
import { researchAgentPrompt } from "../src/prompts/research-agent.js";
import { llm } from "../src/providers/openai-compatible.js";
import { getSession } from "../src/agent/session.js";
import { githubRepo } from "../src/tools/tools/github-repo.js";
import { searchWeb } from "../src/tools/tools/search-web.js";
import { z } from "zod";

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
  ],
  handoffs: [researchAgent],
  outputSchema,

  toolApproval: async (tool, args) => {
    console.log("APPROVAL REQUEST:");
    console.log("Tool:", tool.name);
    console.log("Arguments:", args);

    return true;
  },

  onEvent: (event) => {
    console.log("[EVENT]", event);
  },
});

const result = await agent.run(
  "Research the neo4j-labs/agent-memory GitHub repository and give me a concise technical summary.",
  getSession("research-demo")
);

console.log(result);