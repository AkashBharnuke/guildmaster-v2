# GuildMaster

A small TypeScript Agent SDK built from scratch for creating tool-using AI agents.

GuildMaster focuses on the core runtime pieces needed to build an agent without relying on frameworks such as LangChain or LangGraph.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-green)](https://nodejs.org/)
[![Neo4j](https://img.shields.io/badge/Memory-Neo4j-blue)](https://neo4j.com/)
[![npm](https://img.shields.io/badge/npm-guildmaster-red)](https://www.npmjs.com/package/guildmaster)

## Features

- **Tools** — Give agents access to APIs, databases, and other external capabilities.
- **Structured Output** — Validate agent responses using Zod schemas.
- **Agent Handoffs** — Delegate tasks to specialized agents.
- **Graph Memory** — Persist extracted knowledge using Neo4j.
- **Context Retrieval** — Retrieve relevant memories before an agent runs.
- **Tool Approval** — Require approval before executing selected tools.
- **Runtime Events** — Observe agent and tool execution.
- **Retries & Timeouts** — Add basic reliability around tool execution.
- **OpenAI-compatible providers** — Use OpenAI-compatible API endpoints such as Groq.

## Installation

```bash
npm install guildmaster
```

## Quick Start

```ts
import {
  Agent,
  OpenAICompatibleProvider,
  getSession,
} from "guildmaster";

const model = new OpenAICompatibleProvider();

const agent = new Agent({
  name: "Assistant",
  instructions: "You are a helpful assistant.",
  model,
});

const result = await agent.run(
  "What is Neo4j?",
  getSession("demo")
);

console.log(result);
```

Configure your model through environment variables:

```env
LLM_API_KEY=your_api_key
LLM_API_ENDPOINT=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b
```

## Tools

Tools allow an agent to interact with external systems.

```ts
import { Agent, createTool } from "guildmaster";

const githubTool = createTool({
  name: "github_repo",
  description: "Get information about a GitHub repository.",

  inputSchema: {
    type: "object",
    properties: {
      owner: { type: "string" },
      repository: { type: "string" },
    },
    required: ["owner", "repository"],
  },

  async execute(input) {
    // Call GitHub API
    return {
      /* tool result */
    };
  },
});

const agent = new Agent({
  name: "ResearchAgent",
  instructions: "You are a developer research assistant.",
  model,
  tools: [githubTool],
});
```

Tools can also define execution policies:

```ts
retry: {
  attempts: 3,
  delayMs: 500,
},

timeoutMs: 5000,
```

The runtime handles retries and timeouts around tool execution.

## Structured Output

Agent responses can be validated using Zod.

```ts
import { z } from "zod";

const outputSchema = z.object({
  answer: z.string(),
  confidence: z.number(),
});

const agent = new Agent({
  name: "ResearchAgent",
  instructions: "Answer research questions.",
  model,
  outputSchema,
});
```

The returned response is validated against the provided schema.

## Agent Handoffs

An agent can delegate work to another agent with a specialized role.

```ts
const researchAgent = new Agent({
  name: "ResearchAgent",
  instructions: "Perform technical research.",
  model,
  tools: [githubTool],
});

const mainAgent = new Agent({
  name: "MainAgent",
  instructions: "Coordinate the task.",
  model,
  handoffs: [researchAgent],
});
```

Handoffs allow a main agent to delegate a task instead of handling every type of work itself.

## Memory

GuildMaster can use Neo4j as a persistent graph-backed memory store.

```ts
import {
  Neo4jMemory,
  MemoryWorker,
  ContextRetrievalWorker,
} from "guildmaster";

const memory = new Neo4jMemory();

const memoryWorker = new MemoryWorker(model, memory);
const contextWorker = new ContextRetrievalWorker(memory);

const agent = new Agent({
  name: "MemoryAgent",
  instructions: "Use project memory when relevant.",
  model,
  memoryWorker,
  contextWorker,
});
```

The memory flow is:

```text
Agent Run
   ↓
Context Retrieval
   ↓
Agent Execution
   ↓
Response
   ↓
Background Memory Extraction
   ↓
Neo4j
```

The memory worker extracts useful subject–relationship–object facts from conversations and persists them in the graph. The context retrieval worker searches the graph for memories relevant to a new request.

## Tool Approval

Tools can require approval before execution.

```ts
const agent = new Agent({
  name: "Assistant",
  instructions: "You are a helpful assistant.",
  model,
  tools: [githubTool],

  toolApproval: async (tool, args) => {
    console.log("Approval requested:", tool.name, args);
    return true;
  },
});
```

A tool can opt into approval with:

```ts
approval: "approval_required"
```

When approval is denied, the tool is not executed and the result is returned to the agent runtime so the model can continue appropriately.

## Runtime Events

The runtime exposes events for observing execution.

```ts
const agent = new Agent({
  name: "Assistant",
  instructions: "You are a helpful assistant.",
  model,

  onEvent: (event) => {
    console.log("[EVENT]", event);
  },
});
```

Events cover agent lifecycle and tool execution, including retries and tracing.

Example:

```text
agent_started
tool_called
tool_trace
tool_completed
tool_retry
agent_completed
```

These events can be used for logging, debugging, streaming interfaces, or custom observability.

## Retries, Timeouts and Execution Tracing

Tools can define their own retry and timeout policies:

```ts
const apiTool = createTool({
  name: "external_api",
  description: "Call an external API.",

  retry: {
    attempts: 3,
    delayMs: 500,
  },

  timeoutMs: 10000,

  inputSchema: {
    type: "object",
    properties: {},
  },

  async execute(input) {
    // External API call
  },
});
```

The runtime records tool execution duration through `tool_trace` events.

The current timeout implementation stops waiting for a timed-out operation; it does not cancel the underlying operation.

## Architecture

GuildMaster keeps the runtime relatively small:

```text
                    Agent
                      │
          ┌───────────┼───────────┐
          │           │           │
        Tools      Handoffs     Memory
          │                       │
          │                     Neo4j
          │
          └──── Runtime Events
                    │
              Retry / Timeout
```

The main runtime responsibilities are:

- Agent execution loop
- Tool calling and execution
- Agent handoffs
- Context retrieval
- Background memory extraction
- Tool approval
- Structured output validation
- Runtime events
- Retry and timeout handling

The project is intentionally built without LangChain or LangGraph so the underlying agent runtime remains explicit and understandable.

## Examples

Real-world examples are maintained separately from the SDK package.

The examples cover:

### GitHub Research Agent

Uses a custom GitHub API tool to retrieve repository metadata and have an agent analyze it.

```text
User
 ↓
GuildMaster Agent
 ↓
GitHub Tool
 ↓
Repository Data
 ↓
Agent Response
```

### Web Research Agent

Uses a web search API as an agent tool for questions that require current information.

```text
User
 ↓
GuildMaster Agent
 ↓
Web Search Tool
 ↓
Search Results
 ↓
Agent Response
```

### Neo4j Memory Agent

Demonstrates persistent graph memory and context retrieval.

```text
User
 ↓
Context Retrieval
 ↓
Neo4j
 ↓
Agent
 ↓
Response
 ↓
Memory Worker
 ↓
Neo4j
```

See the examples repository for complete runnable examples.

## Configuration

Typical environment variables:

```env
LLM_API_KEY=
LLM_API_ENDPOINT=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b

NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=
```

Additional variables may be required by individual tools or integrations.

## Project Status

GuildMaster is currently an experimental/hackathon-stage SDK.

The API may change as the project evolves.

## License

ISC
