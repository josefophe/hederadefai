import TelegramBot from "node-telegram-bot-api";
import { getOrCreateWallet } from "./utils/walletManager";
import { Packages } from "@kaiachain/kaia-agent-kit";
import { JsonRpcProvider, Wallet } from "@kaiachain/ethers-ext";
import { kairos } from "viem/chains";

export async function faucetCommand(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const username = msg.from?.username || undefined;

  if (!telegramId) {
    await bot.sendMessage(chatId, "❌ Could not identify your Telegram account.");
    return;
  }

  try {
    // 1. Load user wallet
    const { privateKey, address } = await getOrCreateWallet(telegramId, username);

    // 2. Load faucet wallet
    const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;
    if (!PRIVATE_KEY) {
      throw new Error("Missing faucet wallet private key in environment");
    }

    const formattedKey = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
    const provider = new JsonRpcProvider(kairos.rpcUrls.default.http[0]);
    const wallet = new Wallet(formattedKey, provider);

    // 3. Send faucet
    const result = await Packages.web3.Services.transferFaucet(
      {
        receiver: address,
      },
      {
        KAIROS_FAUCET_AMOUNT: "1", // Optional: default is 1 KAIA
      },
      wallet
    );

    // 4. Respond with success
    const explorerUrl = `https://kairos.kaiascan.io/tx/${result.transactionHash}?tabId=tokenBalance&page=1`;
    await bot.sendMessage(chatId, `✅ <b>1 KAIA faucet sent!</b>\n\n🔗 <a href="${explorerUrl}">View transaction on Kaiascan</a>`, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Satisfied", callback_data: "satisfied" }],
          [{ text: "🚿 Get 50 KAIA", callback_data: "kaia faucet", url: "https://www.kaia.io/faucet" }],
        ],
      },
    });

  } catch (err) {
    console.error("Faucet error:", err);
    await bot.sendMessage(chatId, "❌ Faucet request failed. Please try again or contact support.");
  }
}
