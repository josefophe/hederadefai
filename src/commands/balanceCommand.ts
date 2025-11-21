import TelegramBot from "node-telegram-bot-api";
import { Client, AccountBalanceQuery, TokenId, TokenInfoQuery } from "@hashgraph/sdk";
import { getOrCreateWallet } from "./utils/walletManager";
import "dotenv/config";

export async function balanceCommand(
  bot: TelegramBot, 
  msg: TelegramBot.Message
) {
  const telegramId = msg.from?.id.toString();
  const username = msg.from?.username || undefined;
  const chatId = msg.chat.id;

  if (!telegramId) {
    return bot.sendMessage(chatId, "❌ Could not identify your Telegram account.");
  }

  try {
    // Retrieve user's Hedera wallet
    const { accountId, address } = await getOrCreateWallet(telegramId, username);
    if (!accountId) {
      return bot.sendMessage(chatId, "❌ No Hedera account found.");
    }

    // Hedera client
    const HEDERA_NETWORK = (process.env.HEDERA_NETWORK || "testnet").toLowerCase();
    const client =
      HEDERA_NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();

    client.setOperator(
      process.env.HEDERA_OPERATOR_ID!,
      process.env.HEDERA_OPERATOR_KEY!
    );

    // Fetch account balances
    const balance = await new AccountBalanceQuery()
      .setAccountId(accountId)
      .execute(client);

    const hbarBalance = balance.hbars.toBigNumber().toString();

    // Fetch hUSDT token info
    const usdtTokenId = TokenId.fromString(process.env.USDT_TOKEN_ID!);
    const tokenInfo = await new TokenInfoQuery().setTokenId(usdtTokenId).execute(client);

    const decimals = tokenInfo.decimals;
    const symbol = tokenInfo.symbol;

    // Get raw balance and convert to human-readable
    const rawBalance = balance.tokens._map.get(usdtTokenId.toString()) ?? 0;
    const realBalance = Number(rawBalance) / Math.pow(10, decimals);

    const explorerUrl = `https://hashscan.io/${HEDERA_NETWORK}/account/${accountId}`;

    await bot.sendMessage(
      chatId,
      `💰 <b>Your Hedera Wallet Balance</b>\n\n` +
        `📌 <b>Account ID:</b> <code>${accountId}</code>\n` +
        `🔗 <b>EVM Address:</b> <code>${address}</code>\n\n` +
        `💠 <b>HBAR:</b> ${hbarBalance} HBAR\n` +
        `💵 <b>${symbol}:</b> ${realBalance} ${symbol}\n\n` +
        `🔍 <a href="${explorerUrl}">View on HashScan</a>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Refresh", callback_data: "refresh_balance" }],
            [
              {
                text: "💬 Live Support",
                url: "https://t.me/+TpTPlZOWPpUxZWE0",
              },
            ],
          ],
        },
      }
    );
  } catch (err) {
    console.error("Hedera balance error:", err);
    await bot.sendMessage(chatId, "❌ Failed to fetch Hedera balance.");
  }
}
