// src/mastra/tools/walletTool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";

export const walletTool = createTool({
  id: "walletTool",
  description: "Suggests the /mywallet command so the user can view their wallet address.",
  inputSchema: z.object({
    username: z.string().optional().describe("Telegram username, if available"),
  }),
  outputSchema: z.object({
    message: z.string().describe("Suggested /mywallet command"),
  }),
  execute: async ({ context }) => {
    const username = context.username;
    const suggested = `/mywallet`;
    const message = username
      ? `Hi @${username}, tap and send \`${suggested}\` to view your wallet address.`
      : `Tap or type \`${suggested}\` to view your wallet address.`;

    return {
      message,
    };
  },
});
