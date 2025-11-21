import TelegramBot from "node-telegram-bot-api";
import { TelegramIntegration } from "../telegram";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TEST_CHAT_ID = parseInt(process.env.TEST_CHAT_ID!, 10);

async function runTest() {
  const botIntegration = new TelegramIntegration(TELEGRAM_TOKEN);
  await botIntegration.ensureReady();
  console.log("✅ Telegram bot ready for test.");

  const sendCommand = async (text: string) => {
    await botIntegration.sendCommand({
      chat: { id: TEST_CHAT_ID },
      text,
      from: { id: TEST_CHAT_ID.toString(), first_name: "Tester", username: "tester" },
    });
  };

  // 1️⃣ Create a test task
  console.log("Creating task...");
  await sendCommand(`/createTask test1 "Sample Task" 0.1 analyzeTool`);

  // 2️⃣ Show marketplace
  console.log("Displaying marketplace...");
  await sendCommand(`/marketplace`);

  // 3️⃣ Accept task (dynamic price + x402 payment)
  console.log("Accepting task...");
  await sendCommand(`/acceptTask test1`);

  // 4️⃣ List open tasks
  console.log("Listing tasks...");
  await sendCommand(`/listTask`);

  console.log("✅ Test run completed. Check Telegram for messages.");
}

runTest().catch((err) => console.error("Test failed:", err));
