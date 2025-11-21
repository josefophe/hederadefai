// src/x402Client.ts
import { config } from "dotenv";
import { decodeXPaymentResponse, createSigner, type Hex, type Signer } from "x402-fetch";

config();

const privateKey = process.env.PRIVATE_KEY as Hex | string;
const hederaAccountId = process.env.HEDERA_ACCOUNT_ID as string;

if (!privateKey || !hederaAccountId) {
  console.error("Missing PRIVATE_KEY or HEDERA_ACCOUNT_ID in .env");
  process.exit(1);
}

/**
 * Hedera signer (optional for sending payments later)
 */
export async function getSigner(): Promise<Signer> {
  return await createSigner("hedera-testnet", privateKey, { accountId: hederaAccountId });
}

/**
 * Verify Hedera payment object (server-side)
 */
export async function x402Fetch(
  payment: string, // client sends x-payment-response
  options: { to: string }
): Promise<{ success: boolean; details?: any }> {
  try {
    const decoded = decodeXPaymentResponse(payment);

    // Hedera-only verification
    const success = decoded.network.startsWith("hedera") && decoded.payer === options.to;

    return { success, details: decoded };
  } catch (err) {
    console.error("Payment decoding failed:", err);
    return { success: false, details: err };
  }
}
