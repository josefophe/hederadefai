import TelegramBot from "node-telegram-bot-api";
import { getOrCreateWallet } from "./utils/walletManager";
import { JsonRpcProvider, Wallet } from "@kaiachain/ethers-ext";
import { kairos } from "viem/chains";
import { getContract, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import kUSDTClaimAbi from "../abi/usdt_abi.json";

export async function claimUSDTCommand1(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const username = msg.from?.username || undefined;

  if (!telegramId) {
    await bot.sendMessage(chatId, "❌ Could not identify your Telegram account.");
    return;
  }

  try {
    // 1. Load user wallet
    const { address } = await getOrCreateWallet(telegramId, username);
    if (!address) {
      await bot.sendMessage(chatId, "❌ Could not retrieve your wallet address.");
      return;
    }

    const rawKey = process.env.WALLET_PRIVATE_KEY;
    if (!rawKey) throw new Error("❌ Missing WALLET_PRIVATE_KEY in .env");

    // Ensure proper 0x prefix
    const privateKey = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;

    // Convert to Viem account
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    if (!account) {
      await bot.sendMessage(chatId, "❌ Could not retrieve the faucet wallet account.");
      return;
    }   
    if (!privateKey) {
      throw new Error("❌ Missing user private key");
    }

    const userAddress = address as `0x${string}`;
    // console.log("Using account:", account.address);

    const walletClient = createWalletClient({
        account,
        chain: kairos,
        transport: http(kairos.rpcUrls.default.http[0]),
    });

    // console.log("Wallet client created:", walletClient);

    // 2. Setup Viem wallet client
/*     const walletClient = createWalletClient({
      account: { address: address as `0x${string}`, type: "local", privateKey: privateKey as `0x${string}` },
      chain: kairos,
      transport: http(),
    }); */

    // 3. Load contract
    const contract = getContract({
      abi: kUSDTClaimAbi,
      address: process.env.USDT_CONTRACT_ADDRESS! as `0x${string}`,
      client: walletClient,
    });

    // 4. Call `claim()` function
    const tx = await contract.write.claimFor([userAddress]);

    // console.log("Transaction hash:", tx);

    const explorerUrl = `https://kairos.kaiascan.io/tx/${tx}`;
    await bot.sendMessage(
      chatId,
      `✅ <b>Claim successful!</b>\n\n🪙 1000 kUSDT sent to <code>${address}</code>\n\n🔗 <a href="${explorerUrl}">View on Kaiascan</a>`,
      { parse_mode: "HTML" }
    );

  } catch (err) {
    console.error("Claim error:", err);
    await bot.sendMessage(chatId, "❌ Claim failed. Try again later or contact support.");
  }
}