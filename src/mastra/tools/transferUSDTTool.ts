// src/mastra/tools/transferUsdtTool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";

export const transferUSDTTool = createTool({
  id: "transferUSDT",
  description: "Suggests how to transfer USDT using Telegram bot commands.",
  inputSchema: z.object({
    receiverAddress: z.string().optional().describe("Kaia wallet address"),
    username: z.string().optional().describe("Telegram username of recipient"),
    amount: z.number().optional().describe("Amount of USDT to transfer"),
  }),
  outputSchema: z.object({
    message: z.string().describe("Suggested command to transfer USDT"),
  }),
  execute: async ({ context }) => {
    const { receiverAddress, username, amount } = context;

    const amt = amount || 10;
    const addressCmd = receiverAddress
      ? `/transferusdt ${receiverAddress} ${amt}`
      : null;

    const userCmd = username
      ? `/transferusdt @${username} ${amt}`
      : null;

    const message = [userCmd, addressCmd]
      .filter(Boolean)
      .map((cmd) => `💸 Tap or send: \`${cmd}\``)
      .join("\n") || 
      `ℹ️ To send USDT, use either of the following:\n` +
      `\`/transferusdt 0xWalletAddress amount\`\n` +
      `or\n\`/transferusdt @username amount\``;

    return { message };
  },
});
