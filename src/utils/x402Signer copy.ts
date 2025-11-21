import { createSigner } from "x402-fetch";

export async function createHederaSigner() {
  if (!process.env.HEDERA_PRIVATE_KEY) throw new Error("Missing HEDERA_PRIVATE_KEY");
  return await createSigner("hedera-testnet", process.env.HEDERA_PRIVATE_KEY);
}
