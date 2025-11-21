// src/mastra/tools/faucetTool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";

export const faucetTool = createTool({
  id: "faucetTool",
  description: "Suggest the /faucet command for the user to receive 1 KAIA test token.",
  inputSchema: z.object({
    username: z.string().optional().describe("Telegram username, if available"),
  }),
  outputSchema: z.object({
    message: z.string().describe("Suggested /faucet command"),
  }),
  execute: async ({ context }) => {
    const username = context.username;
    const suggested = `/faucet`;
    const message = username
      ? `To receive 1 KAIA, tap and send: \`${suggested}\``
      : `To receive 1 KAIA, type or tap: \`${suggested}\``;

    return {
      message,
    };
  },
});
