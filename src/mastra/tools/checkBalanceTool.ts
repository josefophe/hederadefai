// src/mastra/tools/balanceTool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";

export const balanceTool = createTool({
  id: "balanceTool",
  description: "Suggest the /balance command so the user can check their wallet balance.",
  inputSchema: z.object({
    username: z.string().optional().describe("Telegram username, if available"),
  }),
  outputSchema: z.object({
    message: z.string().describe("Suggested /balance command"),
  }),
  execute: async ({ context }) => {
    const username = context.username;
    const suggested = `/balance`;
    const message = username
      ? `To check your wallet balance, tap and send: \`${suggested}\``
      : `Tap or type \`${suggested}\` to view your wallet balance.`;

    return {
      message,
    };
  },
});
