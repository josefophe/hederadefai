import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

// Get API Key from .env
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY");

// Gemini doesn't have an OpenAI-compatible API out of the box,
// so we simulate it using this wrapper
const gemini = new GoogleGenerativeAI(apiKey);

// Create OpenAI-compatible LLM wrapper
export const geminiLLM = createOpenAICompatible({
  apiKey, // Required even if we aren't hitting an OpenAI endpoint
  baseURL: "https://generativelanguage.googleapis.com/v1beta", // Gemini API base
  name: "gemini",
});