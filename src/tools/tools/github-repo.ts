import { z } from "zod";
import type { Tool } from "../types.js";

const githubRepoInput = z.object({
    owner: z.string().min(1),
    repository: z.string().min(1),
});

export const githubRepo: Tool = {
    name: "github_repo",

    description:
        "Get information about a GitHub repository, including its description, language, stars, forks, and recent activity.",

    inputSchema: {
        type: "object",
        properties: {
            owner: {
                type: "string",
                description: "The GitHub repository owner or organization.",
            },
            repository: {
                type: "string",
                description: "The GitHub repository name.",
            },
        },
        required: ["owner", "repository"],
    },

    async execute(input: unknown) {
        const parsed = githubRepoInput.parse(input);

        // GitHub API implementation comes next.
        return {
            owner: parsed.owner,
            repository: parsed.repository,
            description: "",
            language: "",
            stars: 0,
            forks: 0,
        };
    },
};