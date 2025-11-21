import { Client, PrivateKey, AccountId, TopicCreateTransaction, TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import TelegramBot from "node-telegram-bot-api";
import { transferHBARCommand } from "../../commands/transferKAIA";

// --- CONFIG ---
const HEDERA_NETWORK = process.env.HEDERA_NETWORK || "testnet";
const AGENT_ACCOUNT_ID = AccountId.fromString(process.env.AGENT_ACCOUNT_ID!);
const AGENT_PRIVATE_KEY = PrivateKey.fromString(process.env.AGENT_PRIVATE_KEY!);

// --- INIT HEDERA CLIENT ---
const client = Client.forName(HEDERA_NETWORK);
client.setOperator(AGENT_ACCOUNT_ID, AGENT_PRIVATE_KEY);

// --- CREATE OR USE HCS TOPIC ---
let hcsTopicId: string | undefined = process.env.AGENT_HCS_TOPIC_ID;

async function createTopicIfNeeded() {
  if (!hcsTopicId) {
    const tx = await new TopicCreateTransaction().execute(client);
    const receipt = await tx.getReceipt(client);
    hcsTopicId = receipt.topicId!.toString();
    console.log("Created new HCS topic:", hcsTopicId);
  }
  return hcsTopicId!;
}

// --- AGENT ---
export class OnChainAgent {
  private bot: TelegramBot;

  constructor(bot: TelegramBot) {
    this.bot = bot;
  }

  private signTaskProof(taskId: string, recipient: string, amount: number) {
    const message = `${taskId}:${recipient}:${amount}`;
    const signature = AGENT_PRIVATE_KEY.sign(message);
    return { message, signature: signature.toString("hex") };
  }

  private async submitProofOnChain(proof: { message: string; signature: string }) {
    const topicId = await createTopicIfNeeded();

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(JSON.stringify(proof))
      .execute(client);

    const receipt = await tx.getReceipt(client);
    console.log("Proof submitted on-chain with status:", receipt.status.toString());
    return receipt;
  }

  async rewardTask(msg: TelegramBot.Message, taskId: string, recipient: string, amount: number) {
    try {
      // 1️⃣ Sign proof
      const proof = this.signTaskProof(taskId, recipient, amount);

      // 2️⃣ Submit proof on-chain
      await this.submitProofOnChain(proof);

      // 3️⃣ Call existing HBAR transfer logic
      await transferHBARCommand(this.bot, {
        ...msg,
        text: `/transfer ${recipient} ${amount}`,
      } as TelegramBot.Message);

      // 4️⃣ Reply in Telegram
      this.bot.sendMessage(
        msg.chat.id,
        `✅ Task ${taskId} rewarded with ${amount} HBAR to ${recipient}.\nOn-chain proof submitted!`
      );
    } catch (err) {
      console.error("Error rewarding task:", err);
      this.bot.sendMessage(msg.chat.id, `❌ Failed to reward task ${taskId}: ${err}`);
    }
  }
}
