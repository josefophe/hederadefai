import TelegramBot from "node-telegram-bot-api";
import { getOrCreateWallet } from "./utils/walletManager";
import { getContract, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { kairos } from "viem/chains";
import kUSDTClaimAbi from "../abi/usdt_abi.json";

export async function claimUSDTCommand(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const username = msg.from?.username || undefined;

  if (!telegramId) {
    await bot.sendMessage(chatId, "❌ Unable to identify Telegram account.");
    return;
  }

  try {
    // Load wallet info for Telegram user
    const { address, privateKey } = await getOrCreateWallet(telegramId, username);
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // Create a wallet client
    const walletClient = createWalletClient({
      account,
      chain: kairos,
      transport: http(kairos.rpcUrls.default.http[0]),
    });

    // Load contract with claim() function
    const contract = getContract({
      abi: kUSDTClaimAbi,
      address: process.env.USDT_CONTRACT_ADDRESS! as `0x${string}`,
      client: walletClient,
    });

    // Call claim()
    const txHash = await contract.write.claim();

    await bot.sendMessage(
      chatId,
      `✅ <b>Claim sent!</b>\n\n💸 TX Hash: <code>${txHash}</code>\n\n🔗 <a href="https://kairos.kaiascan.io/tx/${txHash}">View on Kaiascan</a>`,
      { parse_mode: "HTML" }
    );

  } catch (err) {
    console.error("Claim error:", err);
    await bot.sendMessage(chatId, "❌ Claim failed. Please try again.");
  }
}