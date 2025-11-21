import { createSigner } from "x402-fetch"; // this matches your reference!
import { config } from "dotenv";

config();

export async function createHederaSigner() {
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const accountId = process.env.HEDERA_ACCOUNT_ID;

  if (!privateKey || !accountId) {
    throw new Error("Missing HEDERA_PRIVATE_KEY or HEDERA_ACCOUNT_ID in .env");
  }

  // IMPORTANT: use "hedera-testnet" not "hedera"
  const signer = await createSigner(
    "hedera-testnet",    // must match x402-axios pattern
    privateKey,          // 2nd arg is PRIVATE KEY
    {
      accountId          // accountId inside options
    }
  );

  return signer;
}
