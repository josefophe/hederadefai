import TelegramBot from "node-telegram-bot-api";
import { getOrCreateWallet } from "./utils/walletManager";
import {
  Client,
  TransferTransaction,
  TokenAssociateTransaction,
  TokenId,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function transferUSDTCommand(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id?.toString();
  const username = msg.from?.username || undefined;

  if (!telegramId) {
    await bot.sendMessage(chatId, "❌ Unable to identify your Telegram account.");
    return;
  }

  const parts = msg.text?.trim().split(" ");
  const rawRecipient = parts?.[1];
  const amountStr = parts?.[2];

  if (!rawRecipient || !amountStr || isNaN(Number(amountStr))) {
    await bot.sendMessage(chatId, "❌ Usage: /sendtoken <@alias | accountId> <amount>");
    return;
  }

  // Resolve recipient
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
    // Sender wallet
    const senderWallet = await getOrCreateWallet(telegramId, username);
    if (!senderWallet?.accountId || !senderWallet?.privateKey) {
      return bot.sendMessage(chatId, "❌ Your wallet is missing keys.");
    }

    const senderAccount = AccountId.fromString(senderWallet.accountId);
    const senderKey = PrivateKey.fromString(senderWallet.privateKey);

    // Hedera client
    const HEDERA_NETWORK = (process.env.HEDERA_NETWORK || "testnet").toLowerCase();
    const client = HEDERA_NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();
    client.setOperator(senderAccount, senderKey);

    const tokenId = TokenId.fromString(process.env.USDT_TOKEN_ID!);
    const decimals = 2;
    const amount = Math.floor(Number(amountStr) * 10 ** decimals);

    // ============================
    // 1️⃣ Associate recipient if needed
    // ============================
    try {
      const assocTx = new TokenAssociateTransaction()
        .setAccountId(recipientAccountId)
        .setTokenIds([tokenId])
        .freezeWith(client);

      // Sign with recipient key if available, else operator (fee payer)
      const signedAssocTx = recipientPrivateKey
        ? assocTx.sign(PrivateKey.fromString(recipientPrivateKey))
        : assocTx.sign(senderKey); // fee payer covers HBAR

      const assocResp = await signedAssocTx.execute(client);
      await assocResp.getReceipt(client);

      console.log(`✅ Token associated for ${recipientAccountId}`);
    } catch (err: any) {
      if (!String(err).includes("TOKEN_ALREADY_ASSOCIATED")) {
        console.log("⚠ Token association failed:", err);
        // continue; maybe recipient manually associates token
      }
    }

    // ============================
    // 2️⃣ Perform transfer
    // ============================
    const tx = new TransferTransaction()
      .addTokenTransfer(tokenId, senderAccount, -amount)
      .addTokenTransfer(tokenId, recipientAccountId, amount)
      .freezeWith(client)
      .sign(senderKey);

    const resp = await tx.execute(client);
    const receipt = await resp.getReceipt(client);
    const txId = resp.transactionId.toString();
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
    await bot.sendMessage(
      chatId,
      "❌ Transfer failed. Ensure both accounts are associated and have enough funds."
    );
  }
}
