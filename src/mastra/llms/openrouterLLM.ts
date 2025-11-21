import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const openrouterLLM = createOpenAICompatible({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1", // OpenAI-compatible
  name: "openrouter",
});
