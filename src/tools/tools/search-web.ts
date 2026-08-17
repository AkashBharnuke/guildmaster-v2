import { z } from "zod";
import type { Tool } from "../types.js";
import { settings } from "../../config/settings.js";

const searchInput = z.object({
  query: z.string().min(3),
});

export const searchWeb: Tool = {
  name: "search_web",
  description:
    "Search the web for current technical information, documentation, or research.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The sesarch query",
      },
    },
    required: ["query"],
  },

  async execute(input: unknown) {
    const { query } = searchInput.parse(input);

    // Actual search implementation comes next.

    const response = await fetch(settings.searchApiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: settings.searchApiKey,
        query,
        max_results: 5,
      }),
    });

    if (!response.ok)
      throw new Error(
        `Search API failed: ${response.status} ${response.statusText}`
      );

    const data = await response.json();

    return {
      query,
      results: data.results ?? [],
    };
  },
};
