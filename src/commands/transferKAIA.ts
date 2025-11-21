import TelegramBot from "node-telegram-bot-api";
import { getOrCreateWallet } from "./utils/walletManager";
import {
  Client,
  TransferTransaction,
  Hbar,
  AccountId,
  PrivateKey
} from "@hashgraph/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function transferHBARCommand(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const username = msg.from?.username || undefined;

  if (!telegramId) {
    await bot.sendMessage(chatId, "❌ Unable to identify your Telegram account.");
    return;
  }

  const parts = msg.text?.trim().split(" ");
  const rawRecipient = parts?.[1];
  const amountStr = parts?.[2];

  if (!rawRecipient || !amountStr || isNaN(Number(amountStr))) {
    await bot.sendMessage(
      chatId,
      "❌ Usage: /transferhbar <@username | accountId> <amount>"
    );
    return;
  }

  let recipientAccountId: string | null = null;

  // Resolve alias or raw account ID
  if (rawRecipient.startsWith("@")) {
    const user = rawRecipient.slice(1);

    const wallet = await prisma.wallet.findUnique({ where: { username: user } });
    if (!wallet) {
      await bot.sendMessage(chatId, `❌ Alias @${user} not found.`);
      return;
    }

    recipientAccountId = wallet.accountId!;
  } else if (/^\d+\.\d+\.\d+$/.test(rawRecipient)) {
    recipientAccountId = rawRecipient;
  } else {
    await bot.sendMessage(chatId, "❌ Invalid Hedera Account ID or alias.");
    return;
  }

  try {
    // Load sender wallet
    const { privateKey, accountId } = await getOrCreateWallet(telegramId, username);

    const senderAccount = AccountId.fromString(accountId);
    const senderKey = PrivateKey.fromString(privateKey);

    // Hedera Client
    const HEDERA_NETWORK = (process.env.HEDERA_NETWORK || "testnet").toLowerCase();
    const client =
      HEDERA_NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();
    client.setOperator(senderAccount, senderKey);

    const amountHbar = new Hbar(Number(amountStr));

    // Perform transfer
    const tx = await new TransferTransaction()
      .addHbarTransfer(senderAccount, amountHbar.negated())
      .addHbarTransfer(recipientAccountId, amountHbar)
      .freezeWith(client)
      .sign(senderKey);

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    const txId = response.transactionId.toString();

    const explorerUrl = `https://hashscan.io/${HEDERA_NETWORK}/transaction/${txId}`;

    // Notify user
    await bot.sendMessage(
      chatId,
      `✅ <b>HBAR transfer successful</b>\n\n` +
      `💸 <code>${amountStr} HBAR</code> sent to <code>${recipientAccountId}</code>\n\n` +
      `🔗 <a href="${explorerUrl}">View on HashScan</a>`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("HBAR Transfer failed:", err);
    await bot.sendMessage(chatId, "❌ Transfer failed. Ensure you have enough HBAR.");
  }
}
