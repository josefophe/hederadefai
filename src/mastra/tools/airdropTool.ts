// src/mastra/tools/airdropTool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";

export const airdropTool = createTool({
  id: "airdropTool",
  description: "Placeholder for upcoming testnet airdrop campaigns.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async () => {
    return {
      message: "🚀 Airdrop is coming soon. Stay tuned!",
    };
  },
});
