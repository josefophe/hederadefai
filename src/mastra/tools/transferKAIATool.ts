// src/mastra/tools/transferKaiatool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";

export const transferKAIATool = createTool({
  id: "transferKAIA",
  description: "Suggests how to transfer native KAIA using Telegram bot commands.",
  inputSchema: z.object({
    receiverAddress: z.string().optional().describe("Kaia wallet address"),
    username: z.string().optional().describe("Telegram username of recipient"),
    amount: z.number().optional().describe("Amount of KAIA to transfer"),
  }),
  outputSchema: z.object({
    message: z.string().describe("Suggested Telegram bot command"),
  }),
  execute: async ({ context }) => {
    const { receiverAddress, username, amount } = context;

    const amt = amount || 1;
    const byAddress = receiverAddress
      ? `/transferkaia ${receiverAddress} ${amt}`
      : null;

    const byUsername = username
      ? `/transferkaia @${username} ${amt}`
      : null;

    const message = [byUsername, byAddress]
      .filter(Boolean)
      .map(cmd => `🚀 Tap or send: \`${cmd}\``)
      .join("\n") ||
      `To transfer KAIA, send one of the following commands:\n` +
      `\`/transferkaia 0xWalletAddress amount\`\n` +
      `or\n\`/transferkaia @username amount\``;

    return { message };
  },
});
