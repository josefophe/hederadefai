// src/commands/airtime.ts
import TelegramBot from "node-telegram-bot-api";
import { getOrCreateWallet } from "./utils/walletManager";
import { topUpAirtime } from "../lib/reloadly";
import { createInvoice } from "../lib/invoice";
import {
  Client,
  TransferTransaction,
  AccountBalanceQuery,
  Hbar,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";

const TREASURY_ACCOUNT_ID = AccountId.fromString(process.env.TREASURY_ACCOUNT_ID!);

export async function airtimeCommand(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id?.toString();

  if (!telegramId) {
    await bot.sendMessage(chatId, "❌ Could not identify your Telegram account.");
    return;
  }

  const parts = msg.text?.trim().split(" ");
  const phone = parts?.[1];
  const amountStr = parts?.[2];
  const countryCode = parts?.[3];

  if (!phone || !amountStr || !countryCode || isNaN(Number(amountStr))) {
    await bot.sendMessage(
      chatId,
      "❌ Usage: /airtime <phone> <amountNGN> <countryCode>\n\nExample: /airtime 2348012345678 1000 NG"
    );
    return;
  }

  const amountNGN = Number(amountStr);

  try {
    const { privateKey, address: senderAccountStr } = await getOrCreateWallet(telegramId);

    const senderAccount = AccountId.fromString(senderAccountStr);
    const senderKey = PrivateKey.fromString(privateKey);

    const HEDERA_NETWORK = (process.env.HEDERA_NETWORK || "testnet").toLowerCase();
    const client =
      HEDERA_NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();

    client.setOperator(senderAccount, senderKey);

    // Convert NGN → HBAR (1 HBAR = 1450 NGN)
    const hbarInHbar = amountNGN / 1450;
    const tinybarAmount = Math.floor(hbarInHbar * 1e8); // tinybars
    const hbarAmount = Hbar.fromTinybars(tinybarAmount);

    // Check sender balance
    const balance = await new AccountBalanceQuery()
      .setAccountId(senderAccount)
      .execute(client);

    if (balance.hbars.toTinybars().toNumber() < tinybarAmount) {
      await bot.sendMessage(
        chatId,
        `❌ Insufficient HBAR balance. You have ${balance.hbars.toString()} HBAR, need ${hbarAmount.toString()} HBAR`
      );
      return;
    }

    // Transfer HBAR
    const tx = await new TransferTransaction()
      .addHbarTransfer(senderAccount, hbarAmount.negated())
      .addHbarTransfer(TREASURY_ACCOUNT_ID, hbarAmount)
      .setTransactionMemo(`Airtime top-up for ${phone}`)
      .freezeWith(client)
      .sign(senderKey);

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    const txId = response.transactionId.toString();
    const explorerUrl = `https://hashscan.io/${HEDERA_NETWORK}/transaction/${txId}`;

    // Top-up airtime
    const reloadlyResult = await topUpAirtime({
      phoneNumber: phone,
      amount: amountNGN,
      operatorId: 341,
    });

    if (!reloadlyResult || !reloadlyResult.transactionId) {
      await bot.sendMessage(chatId, "⚠️ Airtime top-up failed. Please contact support.");
      return;
    }

    // Create invoice
    const invoice = await createInvoice({
      type: "airtime",
      from: senderAccountStr,
      to: phone,
      value: amountNGN,
      token: "NGN",
      txHash: txId,
    });

    await bot.sendMessage(
      chatId,
      `✅ <b>Airtime Purchase Successful</b>\n\n` +
        `📱 Phone: <code>${phone}</code>\n` +
        `💵 Amount: <b>₦${amountNGN}</b>\n` +
        `🔗 <a href="${explorerUrl}">View transaction</a>\n\n` +
        `🧾 Invoice:\n${invoice}`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("Airtime command error:", err);
    await bot.sendMessage(chatId, "❌ Something went wrong while processing your airtime purchase.");
  }
}
