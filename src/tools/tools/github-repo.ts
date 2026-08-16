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
        const { owner, repository } = githubRepoInput.parse(input);

        // GitHub API implementation comes next.
        const response = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
            {
                headers: {
                    Accept: "application/vnd.github+json",
                }
            }
        );

        if(!response.ok) {
            const errorBody = await response.text();
            throw new Error(`GitHub API failed: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();


        return {
            owner: data.owner?.login,
            repository: data.name,
            description: data.description,
            language: data.language,
            stars: data.stargazers_count,
            forks: data.forks_count,
            url: data.html_url
        };
    },
};