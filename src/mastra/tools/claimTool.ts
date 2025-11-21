// src/mastra/tools/claimTool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";

export const claimTool = createTool({
  id: "claimTool",
  description: "Suggests the /claim command to claim 1000 kUSDT from the faucet.",
  inputSchema: z.object({
    username: z.string().optional().describe("Telegram username, if available"),
  }),
  outputSchema: z.object({
    message: z.string().describe("Suggested /claim command"),
  }),
  execute: async ({ context }) => {
    const username = context.username;
    const suggested = `/claim`;
    const message = username
      ? `Hey @${username}, tap and send \`${suggested}\` to claim 1000 kUSDT from the faucet.`
      : `Tap or type \`${suggested}\` to claim 1000 kUSDT from the faucet.`;

    return {
      message,
    };
  },
});
