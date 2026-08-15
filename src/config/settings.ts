import "dotenv/config";

class Settings {
    readonly llmProvider = process.env.LLM_PROVIDER ?? "";
    readonly llmApiKey = process.env.LLM_API_KEY ?? "";
    readonly llmModel = process.env.LLM_MODEL ?? "";
    readonly llmEndpoint = process.env.LLM_PROVIDER_ENDPOINT ?? "";

    readonly llmTemperature = Number(process.env.LLM_TEMPERATURE ?? 0.7);
    readonly llmMaxTokens = Number(process.env.LLM_MAX_TOKENS ?? 1024);
    readonly llmTopP = Number(process.env.LLM_TOP_P ?? 1);

    readonly agentMaxIterations = Number(process.env.AGENT_MAX_ITERATIONS ?? 10);    
}


export const settings = new Settings();