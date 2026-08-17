import { Agent, getSession } from "../src/index.js";
import { llm } from "../src/providers/groq.js";
import { searchWeb } from "../src/tools/tools/search-web.js";

const agent = new Agent({
  name: "BasicAgent",
  instructions: "You are a helpful research assistant.",
  model: llm,
  tools: [searchWeb],
});

const result = await agent.run(
  "What is Neo4j?",
  getSession("basic-demo")
);

console.log(result);