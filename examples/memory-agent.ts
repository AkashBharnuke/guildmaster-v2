import { Agent } from "../src/agent/agent.js";
import { mainAgentPrompt } from "../src/prompts/main-agent.js";
import { llm } from "../src/providers/groq.js";
import { Neo4jMemory } from "../src/memory/neo4j.js";
import { getSession } from "../src/agent/session.js";
import {
  ContextRetrievalWorker,
  MemoryWorker,
} from "../src/memory/worker.js";

import { searchWeb } from "../src/tools/tools/search-web.js";
import { projectMemory } from "../src/tools/tools/project-memory.js";

const memory = new Neo4jMemory();

const memoryWorker = new MemoryWorker(
  llm,
  memory
);

const contextWorker = new ContextRetrievalWorker(
  memory
);

const agent = new Agent({
  name: "MemoryAgent",
  instructions: mainAgentPrompt,
  model: llm,

  tools: [
    searchWeb,
    projectMemory,
  ],

  memoryWorker,
  contextWorker,

  onEvent: (event) => {
    console.log("[EVENT]", event);
  },
});

const session = getSession("memory-demo");

const result = await agent.run(
  "What do you remember about Neo4j and AI agent memory?",
  session
);

console.log("\nFINAL RESULT:\n");
console.log(result);