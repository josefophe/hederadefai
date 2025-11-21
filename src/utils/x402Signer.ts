import { createSigner } from "x402-fetch";
import { config } from "dotenv";
config();

export async function createHederaSigner() {
  return createSigner("hedera-testnet", process.env.HEDERA_PRIVATE_KEY!);
}

export async function createHederaNativeSigner() {
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const accountId = process.env.HEDERA_ACCOUNT_ID;

  if (!privateKey || !accountId) {
    throw new Error("Missing HEDERA_PRIVATE_KEY or HEDERA_ACCOUNT_ID");
  }

  return await createSigner("hedera-testnet", privateKey, {
    accountId,
  });
}

