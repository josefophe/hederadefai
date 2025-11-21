import TelegramBot from "node-telegram-bot-api";
import { kaiaDeFAIAgent } from "../agents/kaiaDefaiAgent";
import { wrapFetchWithPayment } from "x402-fetch";
import { createHederaNativeSigner } from "../../utils/x402Signer";
import { createHederaEvmSigner } from "../../utils/x402EvmSigner";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// -----------------------------
// In-memory task store
// -----------------------------
interface Task {
  id: string;
  title: string;
  description: string;
  priceHBAR?: number;         // price in HBAR for A2A Marketplace
  sellerId?: string;          // Telegram userId of seller
  assignedTo?: string; // Telegram userId
  status: "open" | "assigned" | "completed";
  toolName?: keyof typeof kaiaDeFAIAgent.tools; // tool to execute
  toolArgs?: any; // optional arguments for the tool
}

const taskStore: Record<string, Task> = {};

// -----------------------------
// Dynamic price multipliers for tasks
// -----------------------------
const dynamicPriceMultiplier: Record<string, number> = {};


export class TelegramIntegration {
  private bot: TelegramBot;
  // public fetch402!: typeof fetch; // initialized asynchronously
  
  public nativeSigner!: any;
  public evmSigner!: any;

  public fetch402Native!: typeof fetch;
  public fetch402Evm!: typeof fetch;

  public ready: Promise<void>; // wait for init completion
  // Inside TelegramIntegration class
  // Public wrapper to simulate Telegram messages for testing
  public async sendCommand(msg: { chat: { id: number }; text: string; from: any }) {
    await this.handleMessage(msg as any);
  }

  private readonly MAX_MESSAGE_LENGTH = 400;
  private readonly MAX_RESULT_LENGTH = 100;

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true });
    this.bot.on("message", this.handleMessage.bind(this));

    // Run async initialization
    this.ready = this.init();
  }

  private async init() {
    try {
      // Build both signers
      this.nativeSigner = await createHederaNativeSigner();
      this.evmSigner = await createHederaEvmSigner();

      // Wrap fetch
      this.fetch402Native = wrapFetchWithPayment(globalThis.fetch, this.nativeSigner) as typeof fetch;
      this.fetch402Evm = wrapFetchWithPayment(globalThis.fetch, this.evmSigner) as typeof fetch;

      console.log("✅ x402 initialized: Hedera Native + Hedera EVM");
    } catch (err) {
      console.error("❌ Error initializing TelegramIntegration:", err);
    }
  }



  public async ensureReady() {
    await this.ready;
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!]/g, "\\$&");
  }

  private escapeMarkdownV2(text: string): string {
    return text.replace(/([\_\*\[\]\(\)\~\`\>\#\+\-\=\|\{\}\.\!])/g, "\\$1");
  }
  

  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + "... [truncated]";
  }

  private formatToolResult(result: any): string {
    try {
      const jsonString = JSON.stringify(result, null, 2);
      return this.escapeMarkdown(this.truncateString(jsonString, this.MAX_RESULT_LENGTH));
    } catch (error) {
      return `[Complex data structure - ${typeof result}]`;
    }
  }

  private suggestCommand(cmd: string): string {
    return `👉 Try this: \`${this.escapeMarkdown(cmd)}\``;
  }

  private async updateOrSplitMessage(
    chatId: number,
    messageId: number | undefined,
    text: string
  ): Promise<number> {
    if (text.length <= this.MAX_MESSAGE_LENGTH && messageId) {
      try {
        await this.bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "MarkdownV2",
        });
        return messageId;
      } catch (error) {
        console.error("Error updating message:", error);
      }
    }

    try {
      const newMessage = await this.bot.sendMessage(chatId, text, {
        parse_mode: "MarkdownV2",
      });
      return newMessage.message_id;
    } catch (error) {
      console.error("Error sending message:", error);
      const truncated =
        text.substring(0, this.MAX_MESSAGE_LENGTH - 100) +
        "\n\n... [Message truncated due to length]";
      const fallbackMsg = await this.bot.sendMessage(chatId, truncated, {
        parse_mode: "MarkdownV2",
      });
      return fallbackMsg.message_id;
    }
  }

  private async handleAgentTask(chatId: number) {
    if (!this.fetch402Native) {
      await this.bot.sendMessage(chatId, "x402 not initialized yet. Try again.");
      return;
    }

    try {
      // ✅ Fixed template literal
      const res = await this.fetch402Native(`https://landai-api.onrender.com/landNFTs/task?userId=${chatId}`, {
        method: "GET",
      });

      const data = await res.json();

      await this.bot.sendMessage(
        chatId,
        `😊 Paid API Access Successful!\n\nResult:\n${JSON.stringify(data, null, 2)}`,
        { parse_mode: "Markdown" }
      );
    } catch (e: any) {
      await this.bot.sendMessage(chatId, `❌ Payment Error:\n${e.message}`);
    }
  }

  public async handleMessage(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const username = msg.from?.username || "unknown";
    const firstName = msg.from?.first_name || "unknown";
    const userId = msg.from?.id.toString() || `anonymous-${chatId}`;

    if (!text) {
      await this.bot.sendMessage(chatId, "Sorry, I can only process text messages.");
      return;
    }

    if (text.startsWith("/")) {
      const command = text.trim().split(" ")[0];

      switch (command) {
        case "/start":
          await this.bot.sendMessage(
            chatId,
            `@hdefai_bot, a DeFi assistant for the Hedera blockchain on Telegram.

💼 You can:
• Get test tokens
• Send and receive hUSDT or HBAR
• Buy airtime
• Check balances
• More features coming soon...

Try a command:
👉 /faucet — Get test HBAR

Need help?
👉 /help

`
          );
          return;


        case "/agent":
          await this.ensureReady(); // ensures fetch402 is ready
          await this.handleAgentTask(chatId);
          return;

        case "/paysignal": {
          await this.ensureReady();

          const args = text.split(" ").slice(1);
          if (args.length === 0) {
            await this.bot.sendMessage(
              chatId,
              this.escapeMarkdownV2("Usage: /paysignal <signal-id>"),
              { parse_mode: "MarkdownV2" }
            );
            return;
          }

          const signalId = args[0];
          const url = `http://localhost:4021/paid-signal/${signalId}`;

          try {
            // Attempt fetch with automatic payment using Hedera signer
            const res = await this.fetch402Native(url, { method: "GET" });

            if (res.status === 402) {
              // Payment required — show challenge JSON
              const challenge = await res.json();
              await this.bot.sendMessage(
                chatId,
                this.escapeMarkdownV2(`💰 Payment Required:\n${JSON.stringify(challenge, null, 2)}`),
                { parse_mode: "MarkdownV2" }
              );

              // Retry automatically using wrapped fetch (auto-payment)
              const paidRes = await this.fetch402Native(url, { method: "GET" });
              const paidData = await paidRes.json();

              await this.bot.sendMessage(
                chatId,
                this.escapeMarkdownV2(
                  `✅ Payment completed automatically! Signal #${signalId}:\n\nTitle: ${paidData.data?.title}\nBody: ${paidData.data?.body}\nPaid: ${paidData.data?.amount} HBAR/hUSDT`
                ),
                { parse_mode: "MarkdownV2" }
              );
            } else {
              // Already paid or free
              const data = await res.json();
              await this.bot.sendMessage(
                chatId,
                this.escapeMarkdownV2(
                  `✅ Signal #${signalId}:\n\nTitle: ${data.data?.title}\nBody: ${data.data?.body}\nPaid: ${data.data?.amount} HBAR/hUSDT`
                ),
                { parse_mode: "MarkdownV2" }
              );
            }
          } catch (err: any) {
            console.error("x402 fetch error:", err);
            await this.bot.sendMessage(
              chatId,
              this.escapeMarkdownV2(`❌ Failed to fetch or pay for signal:\n${err.message}`),
              { parse_mode: "MarkdownV2" }
            );
          }
          return;
        }

        case "/paid-signal": {
          await this.ensureReady();

          const url = `http://localhost:4021/paid-signal`; // no ID needed

          try {
            // Fetch the paid signal
            const res = await this.fetch402Native(url, { method: "GET" });

            let paidData;
            if (res.status === 402) {
              // Payment required — show challenge JSON
              const challenge = await res.json();
              await this.bot.sendMessage(
                chatId,
                this.escapeMarkdownV2(`💰 Payment Required:\n${JSON.stringify(challenge, null, 2)}`),
                { parse_mode: "MarkdownV2" }
              );

              // Retry automatically after paying
              const paidRes = await this.fetch402Native(url, { method: "GET" });
              paidData = await paidRes.json();
            } else {
              paidData = await res.json();
            }

            // Construct transaction link
            const txId = paidData.transaction || "N/A";
            const txLink = txId !== "N/A"
              ? `https://hashscan.io/testnet/transaction/${txId.split('@')[1]}`
              : "N/A";

            await this.bot.sendMessage(
              chatId,
              this.escapeMarkdownV2(
                `✅ Payment successful!\n\n` +
                `💵 Paid with: ${paidData.data?.paid_with}\n` +
                `🪙 Network: ${paidData.data?.network}\n\n` +
                `📈 Signal: ${paidData.data?.signal}\n` +
                `📝 Body: ${paidData.data?.body}\n` +
                `💳 Transaction: [View on HashScan](${txLink})`
              ),
              { parse_mode: "MarkdownV2", disable_web_page_preview: true }
            );

          } catch (err: any) {
            console.error("x402 fetch error:", err);
            await this.bot.sendMessage(
              chatId,
              this.escapeMarkdownV2(`❌ Failed to fetch or pay for signal:\n${err.message}`),
              { parse_mode: "MarkdownV2" }
            );
          }

          return;
        }



        case "/registerAgent": {
          await this.ensureReady();
          const agentId = `agent-${Date.now()}`;
          await this.bot.sendMessage(chatId, `✅ Your agent has been registered on-chain!\nAgent ID: ${agentId}`);
          return;
        }

        


        case "/testx402": {
            console.log("Received message:", text, "from chat:", chatId);

            await this.ensureReady();
            try {
                const res = await this.fetch402Native("http://localhost:4021/hedera-native", { method: "GET" });
                const data = await res.json();
                await this.bot.sendMessage(chatId, `x402 Test Success! Data:\n${JSON.stringify(data)}`);
            } catch (err: any) {
                await this.bot.sendMessage(chatId, `x402 Test Failed:\n${err.message}`);
            }
            return;
        }


        

        
        // --------------------
        // /createTask
        // --------------------
        // ------------------------
        // MarkdownV2 escape helper
        // ------------------------
        function escapeMarkdownV2(text: string) {
          return text.replace(/([\_\*\[\]\(\)\~\`\>\#\+\-\=\|\{\}\.\!])/g, "\\$1");
        }

        // ------------------------
        // /createTask
        // ------------------------
        case "/createTask": {
          await this.ensureReady();

          const match = text.match(/^\/createTask\s+(\S+)\s+"(.+?)"\s+([\d.]+)(?:\s+(\S+))?$/);
          if (!match) {
            await this.bot.sendMessage(
              chatId,
              this.escapeMarkdownV2(
                'Usage: /createTask <task-id> "Task Title" <priceHBAR> [toolName]\nExample: /createTask task1 "Analyze market trend" 0.5 analyzeTool'
              ),
              { parse_mode: "MarkdownV2" }
            );
            return;
          }

          const [, taskId, taskTitle, priceStr, toolNameRaw] = match;
          const priceHBAR = parseFloat(priceStr);
          const toolName = toolNameRaw as keyof typeof kaiaDeFAIAgent.tools;

          if (isNaN(priceHBAR) || priceHBAR <= 0) {
            await this.bot.sendMessage(chatId, this.escapeMarkdownV2("❌ Invalid price. Must be a positive number."), { parse_mode: "MarkdownV2" });
            return;
          }

          if (toolName && !kaiaDeFAIAgent.tools[toolName]) {
            await this.bot.sendMessage(chatId, this.escapeMarkdownV2(`❌ Tool ${toolName} not found in agent.`), { parse_mode: "MarkdownV2" });
            return;
          }

          // Save task
          taskStore[taskId] = {
            id: taskId,
            title: taskTitle,
            description: `Task created by ${username}`,
            priceHBAR,
            sellerId: userId,
            status: "open",
            toolName,
            toolArgs: {},
          };

          dynamicPriceMultiplier[taskId] = 1;

          await this.bot.sendMessage(
            chatId,
            this.escapeMarkdownV2(
              `✅ Task created:\n🆔 ${taskId} — ${taskTitle}\nPrice: ${priceHBAR} HBAR${toolName ? `\nTool: ${toolName}` : ""}`
            ),
            { parse_mode: "MarkdownV2" }
          );
          return;
        }

        case "/payTest": {
          await this.ensureReady(); // ensures fetch402 is initialized

          try {
            // ✅ this.fetch402 is wrapped with Hedera signer now
            const res = await this.fetch402Native("http://localhost:4021/dynamic-price?multiplier=1", {
              method: "GET",
            });

            const data = await res.json();

            await this.bot.sendMessage(
              chatId,
              this.escapeMarkdown(`✅ Payment Test Success\nResponse:\n${JSON.stringify(data, null, 2)}`),
              { parse_mode: "MarkdownV2" }
            );
          } catch (err: any) {
            await this.bot.sendMessage(
              chatId,
              this.escapeMarkdown(`❌ Payment Test Failed\n${err.message}`),
              { parse_mode: "MarkdownV2" }
            );
          }
          return;
        }


        // ------------------------
        // /acceptTask
        // ------------------------
        case "/acceptTask": {
          await this.ensureReady();

          const args = text.split(" ").slice(1);
          if (args.length === 0) {
            await this.bot.sendMessage(chatId, this.escapeMarkdownV2("Usage: /acceptTask <task-id>"), { parse_mode: "MarkdownV2" });
            return;
          }

          const taskId = args[0];
          const task = taskStore[taskId];
          if (!task || task.status !== "open") {
            await this.bot.sendMessage(chatId, this.escapeMarkdownV2(`❌ Task ${taskId} not available or already assigned.`), { parse_mode: "MarkdownV2" });
            return;
          }

          if (!task.priceHBAR || !task.sellerId) {
            await this.bot.sendMessage(chatId, this.escapeMarkdownV2(`❌ Task missing price or seller info.`), { parse_mode: "MarkdownV2" });
            return;
          }

          try {
            const multiplier = dynamicPriceMultiplier[taskId] ?? 1;
            const dynamicPriceHBAR = Math.min((task.priceHBAR ?? 0) * multiplier, 0.1); // max 0.1 HBAR

            // x402 payment fetch
            const priceData = await wrapFetchWithPayment(
              `http://localhost:4021/dynamic-price?multiplier=${multiplier}`,
              this.hedSigner,
              { maxAmount: 10_000_000 }
            );

            task.status = "assigned";
            task.assignedTo = userId;

            const sentMessage = await this.bot.sendMessage(
              chatId,
              this.escapeMarkdownV2(
                `✅ You accepted task ${taskId}.\nDynamic price applied: ${dynamicPriceHBAR} HBAR (x${multiplier})\nPayment sent to seller.`
              ),
              { parse_mode: "MarkdownV2" }
            );

            if (task.toolName && kaiaDeFAIAgent.tools[task.toolName]) {
              const tool = kaiaDeFAIAgent.tools[task.toolName];
              const toolResult = await tool.execute(task.toolArgs || {});

              await this.updateOrSplitMessage(
                chatId,
                sentMessage.message_id,
                this.escapeMarkdownV2(
                  `✅ Task executed with ${task.toolName}\nResult:\n${this.formatToolResult(toolResult)}`
                ),
                { parse_mode: "MarkdownV2" }
              );
            }
          } catch (error: any) {
            console.error("Payment or task execution error:", error);
            await this.bot.sendMessage(chatId, this.escapeMarkdownV2(`❌ Payment or execution failed:\n${error.message}`), { parse_mode: "MarkdownV2" });
          }
          return;
        }

        // ------------------------
        // /marketplace
        // ------------------------
        case "/marketplace": {
          await this.ensureReady();
          const openTasks = Object.values(taskStore).filter((t) => t.status === "open");

          if (openTasks.length === 0) {
            await this.bot.sendMessage(chatId, this.escapeMarkdownV2("No open tasks available at the moment."), { parse_mode: "MarkdownV2" });
            return;
          }

          let message = "🛒 *Marketplace Tasks (HBAR only)*:\n\n";

          for (const t of openTasks) {
            const sellerDisplay = t.sellerId ? `Seller: ${t.sellerId}` : "Seller: unknown";
            const multiplier = dynamicPriceMultiplier[t.id] ?? 1;
            let dynamicPriceHBAR = Math.min((t.priceHBAR ?? 0) * multiplier, 0.1);

            const titleTruncated = t.title.length > 40 ? t.title.slice(0, 37) + "..." : t.title;
            message += `• [${t.id}] ${titleTruncated} — Price: ${dynamicPriceHBAR} HBAR\n${sellerDisplay}\n\n`;
          }

          await this.bot.sendMessage(chatId, this.escapeMarkdownV2(message), { parse_mode: "MarkdownV2" });
          return;
        }

        // ------------------------
        // /listTask
        // ------------------------
        case "/listTask": {
          await this.ensureReady();
          const openTasks = Object.values(taskStore).filter((t) => t.status === "open");

          if (openTasks.length === 0) {
            await this.bot.sendMessage(chatId, this.escapeMarkdownV2("No open tasks available at the moment."), { parse_mode: "MarkdownV2" });
            return;
          }

          let message = "";
          for (const t of openTasks) {
            const multiplier = dynamicPriceMultiplier[t.id] ?? 1;
            const dynamicPriceHBAR = Math.min((t.priceHBAR ?? 0) * multiplier, 0.1);

            message += this.escapeMarkdownV2(`🆔 ${t.id} — ${t.title}\n${t.description}\nPrice: ${dynamicPriceHBAR} HBAR\n\n`);
          }

          await this.bot.sendMessage(chatId, message, { parse_mode: "MarkdownV2" });
          return;
        }

        // ------------------------
        // /completeTask
        // ------------------------
        case "/completeTask": {
          const args = text.split(" ").slice(1);
          if (args.length === 0) {
            await this.bot.sendMessage(chatId, this.escapeMarkdownV2("Usage: /completeTask <task-id>"), { parse_mode: "MarkdownV2" });
            return;
          }

          const taskId = args[0];
          const task = taskStore[taskId];
          if (!task) {
            await this.bot.sendMessage(chatId, this.escapeMarkdownV2(`❌ Task ${taskId} not found.`), { parse_mode: "MarkdownV2" });
            return;
          }
          if (task.assignedTo !== userId) {
            await this.bot.sendMessage(chatId, this.escapeMarkdownV2(`❌ You are not assigned to this task.`), { parse_mode: "MarkdownV2" });
            return;
          }

          task.status = "completed";
          await this.bot.sendMessage(chatId, this.escapeMarkdownV2(`✅ Task ${taskId} marked as completed.`), { parse_mode: "MarkdownV2" });
          return;
        }

        case "/paidsignal": {
          const { paidSignalCommand } = await import("../../commands/paidSignal");
          await paidSignalCommand(this.bot, msg);
          return;
        }



        // -------------------------------
        // External commands
        // -------------------------------
        case "/balance": {
          const { balanceCommand } = await import("../../commands/balanceCommand");
          await balanceCommand(this.bot, msg);
          return;
        }
        case "/help": {
          const { helpCommand } = await import("../../commands/help");
          await helpCommand(this.bot, msg);
          return;
        }
        case "/mywallet": {
          const { myWalletCommand } = await import("../../commands/myWallet");
          await myWalletCommand(this.bot, msg);
          return;
        }
        case "/airtime": {
          const { airtimeCommand } = await import("../../commands/airtime");
          await airtimeCommand(this.bot, msg);
          return;
        }
        case "/claim": {
          const { claimUSDTCommand1 } = await import("../../commands/claimForUSDT");
          await claimUSDTCommand1(this.bot, msg);
          return;
        }
        case "/transferusdt": {
          const { transferUSDTCommand } = await import("../../commands/transferkUSDT");
          await transferUSDTCommand(this.bot, msg);
          return;
        }
        case "/sendusdt": {
          const { sendUSDTCommand } = await import("../../commands/send");
          await sendUSDTCommand(this.bot, msg);
          return;
        }
        case "/transferhbar": {
          const { transferHBARCommand } = await import("../../commands/transferKAIA");
          await transferHBARCommand(this.bot, msg);
          return;
        }
        case "/faucet": {
          const { faucetCommand } = await import("../../commands/faucet");
          await faucetCommand(this.bot, msg);
          return;
        }
        case "/claimuser": {
          const { claimUSDTCommand } = await import("../../commands/claimUSDT");
          await claimUSDTCommand(this.bot, msg);
          return;
        }

        default:
          await this.bot.sendMessage(chatId, "Unknown command.");
          return;
      }
    }

    // 🧠 AI Response
    try {
      const sentMessage = await this.bot.sendMessage(chatId, "Thinking...");
      console.log(`[AI Request] User (${userId}): ${text}`);

      let finalResponse = "";
      let toolResultText = "";

      const stream = await kaiaDeFAIAgent.stream(text, {
        threadId: `telegram-${chatId}`,
        resourceId: userId,
        context: [{ role: "system", content: `User: ${firstName} (${username})` }],
      });

      for await (const chunk of stream.fullStream) {
        switch (chunk.type) {
          case "text-delta":
            finalResponse += this.escapeMarkdown(chunk.textDelta);
            break;
          case "tool-result":
            toolResultText = this.formatToolResult(chunk.result);
            console.log("Tool result:", chunk.result);
            break;
          case "error":
            finalResponse += `\n❌ ${this.escapeMarkdown(String(chunk.error))}`;
            break;
        }

        await this.updateOrSplitMessage(
          chatId,
          sentMessage.message_id,
          finalResponse + (toolResultText ? `\n\n✨ Result:\n\`\`\`\n${toolResultText}\n\`\`\`` : "")
        );
      }

      let output = finalResponse.trim();
      if (toolResultText) {
        output += `\n\n✨ Result:\n\`\`\`\n${toolResultText}\n\`\`\``;
      }

      if (output.toLowerCase().includes("airtime")) {
        output += `\n\n${this.suggestCommand("/airtime 08012345678 1500 NGN")}`;
      }

      await this.updateOrSplitMessage(chatId, sentMessage.message_id, output);
      console.log("[AI Response] ✅ Sent.");
    } catch (error) {
      console.error("Error processing message:", error);
      await this.bot.sendMessage(
        chatId,
        "Sorry, I encountered an error processing your message. Please try again."
      );
    }
  }
}
