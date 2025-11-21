import { config } from "dotenv";
import { Client, Hbar, AccountId, PrivateKey, TransferTransaction } from "@hashgraph/sdk";
import fs from "fs";

config();

const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
const operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY!);
const client = Client.forTestnet().setOperator(operatorId, operatorKey);
const SERVER_ACCOUNT = AccountId.fromString(process.env.SERVER_ACCOUNT_ID!);
const SIGNAL_FILE = "/Users/user/documents/hedera/x402-hedera/examples/typescript/servers/express/data/signals.json";

async function storeSignal(accountId: string, text: string, amountHbar = 0.5) {
  // 1️⃣ Send HBAR
  const tx = await new TransferTransaction()
    .addHbarTransfer(operatorId, Hbar.fromTinybars(-Hbar.from(amountHbar).toTinybars()))
    .addHbarTransfer(SERVER_ACCOUNT, Hbar.from(amountHbar))
    .execute(client);

  const receipt = await tx.getReceipt(client);
  console.log(`HBAR sent! Status: ${receipt.status}`);

  // 2️⃣ Store signal locally
  let signals: any[] = [];
  if (fs.existsSync(SIGNAL_FILE)) signals = JSON.parse(fs.readFileSync(SIGNAL_FILE, "utf-8"));

  signals.push({ accountId, text, hbarPaid: amountHbar, timestamp: new Date().toISOString() });
  fs.writeFileSync(SIGNAL_FILE, JSON.stringify(signals, null, 2));

  console.log("Signal stored successfully!");
}

// Usage
(async () => {
  await storeSignal(operatorId.toString(), "Test signal via Hashgraph SDK");
})();
