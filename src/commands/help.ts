import TelegramBot from "node-telegram-bot-api";

export async function helpCommand(bot: TelegramBot, msg: TelegramBot.Message) {
  const chatId = msg.chat.id;

  try {
    await bot.sendMessage(
      chatId,
      `📖 <b>Welcome to HederaDeFAI Bot</b>

This bot helps you interact with the Hedera blockchain right from Telegram.

<b>🚰 Faucet</b>
- /faucet — Get 1 Hedera test token to your wallet.

<b>💸 Claim</b>
- /claim — Claim 1000 test kUSDT once per day.

<b>👛 Wallet</b>
- /mywallet — Show your wallet address.
- /balance — Check your token balances.

<b>🔁 Transfers</b>
- /transferusdt &lt;address|@username&gt; &lt;amount&gt; — Send USDT.
- /transferhbar &lt;address|@username&gt; &lt;amount&gt; — Send Hedera.

<b>📱 Airtime</b>
- /airtime &lt;phone&gt; &lt;amount&gt; &lt;countryCode&gt; — Buy airtime with USDT.
Example: <code>/airtime 2348012345678 1500 NG</code>

<b>🧪 Coming Soon</b>
- /swap — Swap tokens between kUSDT, Hedera, and more.
- /airdrop — Claim campaign-based airdrops.

Need help with anything else? Just ask.`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Satisfied", callback_data: "satisfied" }],
            [
              {
                text: "💬 Talk to a live agent",
                url: "https://t.me/+TpTPlZOWPpUxZWE0",
                callback_data: "live_agent",
              },
            ],
          ],
        },
      }
    );
  } catch (error) {
    console.error("❌ Help command failed:", error);
    await bot.sendMessage(chatId, "❌ Something went wrong displaying the help menu. Please try again later.",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Satisfied", callback_data: "satisfied" }],
            [
              {
                text: "💬 Talk to a live agent",
                url: "https://t.me/+TpTPlZOWPpUxZWE0",
                callback_data: "live_agent",
              },
            ],
          ],
        },});
  }
}
