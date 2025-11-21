import { createTool } from "@mastra/core";
import { z } from "zod";

export const airtimeTool = createTool({
  id: "airtimeRechargeTool",
  description: "Transfers USDT to treasury and recharges Nigerian phone with airtime via Reloadly",
  inputSchema: z.object({
    phoneNumber: z.string().optional(),
    amount: z.string().optional(),
    countryCode: z.string().optional(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ context }) => {
    const { phoneNumber, amount, countryCode } = context;

    let message = "To buy airtime, use:\n\n<code>/airtime &lt;phone&gt; &lt;amount&gt; &lt;countryCode&gt;</code>";

    if (phoneNumber && amount) {
      message = `To top up airtime for <b>${phoneNumber}</b> with ₦${amount}, type:\n\n<code>/airtime ${phoneNumber} ${amount} ${countryCode ?? "NG"}</code>`;
    }

    return { message };
  },
});
