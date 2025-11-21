import TelegramBot from "node-telegram-bot-api";
import { getOrCreateWallet } from "./utils/walletManager";
import { sendToken } from "./utils/sendToken";
import {
  Client,
  TokenAssociateTransaction,
  TokenId,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function sendUSDTCommand(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id?.toString();
  const username = msg.from?.username || undefined;

  if (!telegramId) {
    return bot.sendMessage(chatId, "❌ Unable to identify your Telegram account.");
  }

  // Parse command: /sendtoken <@alias | accountId> <amount>
  const parts = msg.text?.trim().split(" ");
  const rawRecipient = parts?.[1];
  const amountStr = parts?.[2];

  if (!rawRecipient || !amountStr || isNaN(Number(amountStr))) {
    return bot.sendMessage(chatId, "❌ Usage: /sendtoken <@alias | accountId> <amount>");
  }

  // ============================
  // 1️⃣ Resolve recipient
  // ============================
  let recipientAccountId: AccountId;
  let recipientPrivateKey: string | null = null;

  if (rawRecipient.startsWith("@")) {
    const alias = rawRecipient.slice(1);
    const wallet = await prisma.wallet.findUnique({ where: { username: alias } });
    if (!wallet) return bot.sendMessage(chatId, `❌ Alias @${alias} not found.`);
    recipientAccountId = AccountId.fromString(wallet.accountId);
    recipientPrivateKey = wallet.privateKey;
  } else if (/^\d+\.\d+\.\d+$/.test(rawRecipient)) {
    recipientAccountId = AccountId.fromString(rawRecipient);
  } else {
    return bot.sendMessage(chatId, "❌ Invalid Hedera Account ID or alias.");
  }

  try {
    // ============================
    // 2️⃣ Load sender wallet
    // ============================
    const senderWallet = await getOrCreateWallet(telegramId, username);
    if (!senderWallet?.accountId || !senderWallet?.privateKey) {
      return bot.sendMessage(chatId, "❌ Your wallet is missing keys.");
    }

    const senderAccount = AccountId.fromString(senderWallet.accountId);
    const senderKey = PrivateKey.fromString(senderWallet.privateKey);

    // ============================
    // 3️⃣ Setup Hedera client
    // ============================
    const HEDERA_NETWORK = (process.env.HEDERA_NETWORK || "testnet").toLowerCase();
    const client = HEDERA_NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();
    client.setOperator(senderAccount, senderKey);

    const tokenId = TokenId.fromString(process.env.USDT_TOKEN_ID!);
    const decimals = 2; // USDT standard
    const amount = Math.floor(Number(amountStr) * 10 ** decimals);

    // ============================
    // 4️⃣ Auto-associate recipient if needed
    // ============================
    try {
      const assocTx = new TokenAssociateTransaction()
        .setAccountId(recipientAccountId)
        .setTokenIds([tokenId])
        .freezeWith(client);

      // Recipient has a key → sign it
      if (recipientPrivateKey) {
        const signedAssocTx = assocTx.sign(PrivateKey.fromString(recipientPrivateKey));
        const resp = await signedAssocTx.execute(client);
        await resp.getReceipt(client);
      } else {
        // Operator pays fee
        const resp = await assocTx.execute(client);
        await resp.getReceipt(client);
      }

      console.log(`✅ Token associated for ${recipientAccountId}`);
    } catch (err: any) {
      if (!String(err).includes("TOKEN_ALREADY_ASSOCIATED")) {
        console.warn("⚠ Token association failed:", err);
      }
    }

    // ============================
    // 5️⃣ Perform transfer
    // ============================
    const txId = await sendToken(client, tokenId, senderAccount, recipientAccountId, amount, senderKey);

    const explorerUrl = `https://hashscan.io/${HEDERA_NETWORK}/transaction/${txId}`;

    await bot.sendMessage(
      chatId,
      `✅ <b>USDT transfer successful</b>\n\n` +
        `💸 <code>${amountStr} USDT</code> sent to <code>${rawRecipient}</code>\n\n` +
        `🔗 <a href="${explorerUrl}">View Transaction on HashScan</a>`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("USDT Transfer failed:", err);
    await bot.sendMessage(chatId, "❌ Transfer failed. Ensure both accounts are associated and have enough funds.");
  }
}
