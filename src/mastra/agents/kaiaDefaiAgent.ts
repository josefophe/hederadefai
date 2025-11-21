import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
// import { openai } from "@ai-sdk/openai";
// import { geminiLLM  } from "../llms/geminiLLM";
import { openrouterLLM } from "../llms/openrouterLLM";
import { faucetTool } from "../tools/faucetTool";
import { claimUSDTTool } from "../tools/claimUSDTTool";
import { balanceTool } from "../tools/checkBalanceTool";
import { airtimeTool } from "../tools/airtimeTool";
import { claimTool } from "../tools/claimTool";
import { walletTool } from "../tools/walletTool";
import { transferUSDTTool } from "../tools/transferUSDTTool";
import { transferKAIATool } from "../tools/transferKAIATool";
import { airdropTool } from "../tools/airdropTool";
import { swapTool } from "../tools/swapTool";
import { executeTaskTool } from "../tools/executeTaskTool";

import { model } from "../config";

// import { transferErc20Tool } from "../tools/transferErc20Tool";
// import { dailyWorkflow } from "../workflows/dailyWorkflow";


const memory = new Memory({
  storage: new LibSQLStore({
    url: "file:./mastra1.db", // Or your database URL
  }),
  options: {
    // Keep last 20 messages in context
    lastMessages: 20,
  },
});

export const kaiaDeFAIAgent = new Agent({
  name: "kaiaDeFAIAgent", 
  instructions: `
You are KaiaDeFAI_bot, a DeFi assistant for the Kaia blockchain on Telegram.

🎯 Respond with **clear Telegram commands only** like: /faucet, /claim, /balance — so users can tap and use them.

📌 Do not auto-run tools. Instead, **suggest the appropriate command** and wait for the user to send it.

📋 Commands you support:
- /faucet — send test KAIA tokens
- /claim — claim 1000 kUSDT test tokens
- /balance — check wallet balance
- /mywallet — show user's wallet address
- /airtime phoneNumber amount currency — buy airtime with USDT (e.g. /airtime 08012345678 1500 NGN)
- /transferusdt address amount — send USDT by wallet address
- /transferusdt @username amount — send USDT by Telegram username
- /transferkaia address amount — send native KAIA
- /transferkaia @username amount — send KAIA by Telegram username

🧠 Never explain all tools at once. Only respond with a single command suggestion like:

👉 Try this: /faucet

❓If user asks “what can you do?”, reply:
I can help with test tokens, balance, claiming USDT, transfers, and airtime. Just use a command like /faucet or /balance.
`,

  // model: openrouterLLM("mistralai/mistral-7b-instruct"),
  model,
  tools: {
    faucetTool,
    airdropTool,
    airtimeTool,
    balanceTool,
    claimTool,
    walletTool,
    transferUSDTTool,
    transferKAIATool,
    swapTool,
    executeTaskTool,
    analyzeTool: {
      parameters: {}, // required: define expected input parameters; empty if none
      description: "A dummy tool to simulate task execution",
      execute: async (args: any) => {
        return {
          success: true,
          message: "✅ Dummy analyzeTool executed successfully",
          inputArgs: args,
        };
      },
    },


  },
  memory,
});



    //claimUSDTTool,
    //checkBalanceTool,
// model: openai("gpt-3.5-turbo"),
// model: openai("gpt-4o"),