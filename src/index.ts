import { Agent } from "./agent/agent.js";
import { mainAgentPrompt } from "./prompts/main-agent.js";
import { llm } from "./providers/groq.js";
import { githubRepo } from "./tools/tools/github-repo.js";
import { projectMemory } from "./tools/tools/project-memory.js";
import { searchWeb } from "./tools/tools/search-web.js";

const agent = new Agent({
    name: "GuildMaster",
    instructions: mainAgentPrompt,
    model: llm,
    tools: [
        searchWeb,
        githubRepo,
        projectMemory,
    ],
});

const result = await agent.run(
    "Search for information about the GuildMaster project."
);

console.log(result);