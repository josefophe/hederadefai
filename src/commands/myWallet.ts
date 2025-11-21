import { getOrCreateWallet } from "./utils/walletManager";
import TelegramBot from "node-telegram-bot-api";

export async function myWalletCommand(bot: TelegramBot, msg: TelegramBot.Message) {
  const telegramId = msg.from?.id.toString();
  const username = msg.from?.username || undefined;
  const chatId = msg.chat.id;

  if (!telegramId) {
    await bot.sendMessage(chatId, "❌ Could not identify your Telegram account.");
    return;
  }

  try {
    const { address, privateKey, evmPrivateKey, publicKey, accountId } =
      await getOrCreateWallet(telegramId, username);

    await bot.sendMessage(
      chatId,
      `
🪪 *Your Hedera Wallet*

*EVM Address:*  
\`${address}\`

*Account ID:*  
\`${accountId}\`

      `,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("Error generating wallet:", err);
    await bot.sendMessage(chatId, "❌ Failed to generate your wallet. Please try again.");
  }
}
