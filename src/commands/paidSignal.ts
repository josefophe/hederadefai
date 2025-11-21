import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import { getOrCreateWallet } from "./utils/walletManager";
import {
  decodeXPaymentResponse,
  wrapFetchWithPayment,
  createSigner,
  type Hex,
} from "x402-fetch";

// Helper to check user's hUSDT balance (implement based on your setup)
async function getHUSDTBalance(accountId: string): Promise<number> {
  // TODO: replace with real Hedera token query
  // For example, use Hedera SDK to fetch hUSDT balance for accountId
  return 0.01; // placeholder for testing
}

export async function paidSignalCommand(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id?.toString();
  const username = msg.from?.username || undefined;

  if (!telegramId) {
    await bot.sendMessage(chatId, "❌ Could not identify your Telegram account.");
    return;
  }

  try {
    // Load user's Hedera wallet
    const { accountId, privateKey } = await getOrCreateWallet(telegramId, username);

    if (!accountId || !privateKey) {
      await bot.sendMessage(chatId, "❌ Your wallet is incomplete. Please run /mywallet first.");
      return;
    }

    // --- PRE-CHECK: hUSDT balance ---
    const hUSDTBalance = await getHUSDTBalance(accountId);
    const priceUSD = 0.001; // must match server middleware price
    if (hUSDTBalance < priceUSD) {
      await bot.sendMessage(
        chatId,
        `❌ Insufficient hUSDT balance. You need at least $${priceUSD} to unlock the premium signal.`
      );
      return;
    }

    // Create x402 signer
    const signer = await createSigner("hedera-testnet", privateKey, { accountId });
    const fetchWithPayment = wrapFetchWithPayment(fetch, signer);

    // Build endpoint URL
    const baseURL = process.env.RESOURCE_SERVER_URL!;
    const endpoint = process.env.ENDPOINT_PATH!; // /paid-signal
    const url = `${baseURL}${endpoint}`;

    // Call the paid API
    const response = await fetchWithPayment(url, { method: "GET" });

    // --- DEBUG: raw response & headers ---
    const raw = await response.text();
    console.log("RAW RESPONSE >>>", raw);
    console.log("HEADERS >>>", Object.fromEntries(response.headers.entries()));

    // Parse JSON safely
    let body: any;
    try {
      body = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      await bot.sendMessage(chatId, "❌ Server did not return valid JSON. Check logs.");
      return;
    }

    // Decode x402 payment response
    const paymentResponseHeader = response.headers.get("x-payment-response");
    const paymentResponse = paymentResponseHeader
      ? decodeXPaymentResponse(paymentResponseHeader)
      : null;

    // --- Send Telegram message ---
    if (body.data) {
      await bot.sendMessage(
        chatId,
        `✅ <b>Premium Signal Unlocked</b>\n\n` +
          `📊 <b>${body.data.signal}</b>\n` +
          `📝 ${body.data.body}\n\n` +
          `💳 Paid via ${body.data.paid_with || "x402"}\n` +
          `🆔 Transaction: ${paymentResponse?.transactionId || "unknown"}\n` +
          `🌐 Network: ${body.data.network || "hedera-testnet"}`,
        { parse_mode: "HTML" }
      );
    } else {
      await bot.sendMessage(
        chatId,
        `❌ Payment failed or signal unavailable.\nServer message: ${body.message || "Unknown error"}`
      );
    }
  } catch (err: any) {
    console.error("Error in /paid-signal:", err);
    await bot.sendMessage(chatId, "❌ Failed to fetch paid signal. Check logs.");
  }
}
