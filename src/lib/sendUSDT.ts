// src/lib/sendUSDT.ts
import { Client, TransferTransaction, TokenId, PrivateKey, Hbar } from "@hashgraph/sdk";

type SendUSDTArgs = {
  fromPrivateKey: string; // Hedera private key string for sender (stored encrypted on server)
  toAddress: string; // Hedera accountId string (0.0.x)
  amount: number | string; // decimal amount in USDT units (e.g., 10.5)
};

export async function sendUSDT({ fromPrivateKey, toAddress, amount }: SendUSDTArgs): Promise<string | null> {
  if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_KEY) {
    throw new Error("Server operator credentials are required in env");
  }
  if (!process.env.USDT_TOKEN_ID) {
    throw new Error("USDT_TOKEN_ID must be set in env (e.g. 0.0.12345)");
  }
  const HEDERA_NETWORK = (process.env.HEDERA_NETWORK || "testnet").toLowerCase();
  const client = HEDERA_NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(process.env.HEDERA_OPERATOR_ID!, process.env.HEDERA_OPERATOR_KEY!);

  const tokenId = TokenId.fromString(process.env.USDT_TOKEN_ID!);

  // Get token decimals via TokenInfoQuery would be ideal, but to keep this module self-contained
  // prefer to fetch decimals if provided in env else assume 6
  const decimals = process.env.USDT_TOKEN_DECIMALS ? Number(process.env.USDT_TOKEN_DECIMALS) : 6;

  // convert decimal amount into base units (bigint)
  const amountDecimal = typeof amount === "string" ? Number(amount) : amount;
  if (isNaN(amountDecimal)) throw new Error("Invalid amount");

  const baseAmountBigInt = BigInt(Math.floor(amountDecimal * 10 ** decimals));

  // Build transfer transaction: token transfer from user -> treasury
  // Server operator pays transaction fee (client.operator)
  const treasuryAccount = process.env.TREASURY_ACCOUNT_ID!;
  if (!treasuryAccount) throw new Error("TREASURY_ACCOUNT_ID env missing");

  const senderPrivateKey = PrivateKey.fromString(fromPrivateKey);

  // create transaction
  const tx = new TransferTransaction()
    .addTokenTransfer(tokenId, senderPrivateKey.publicKey.toString(), -baseAmountBigInt) // placeholder - NDA below
    .addTokenTransfer(tokenId, treasuryAccount, baseAmountBigInt)
    // Add a tiny HBAR transfer from operator to cover fees if needed, (operator is payer by client)
    .addHbarTransfer(process.env.HEDERA_OPERATOR_ID!, Hbar.from(0)) ;

  // NOTE: hedgehog: TransferTransaction expects account IDs (like "0.0.x") for token transfers, not public keys.
  // We must use the sender accountId (not just the public key). Since we store privateKey only, we should require fromAddress
  // in production — but our architecture stores the Hedera account ID as 'address' in DB, and getOrCreateWallet returns it.
  // To sign for sender we will freeze transaction and sign with sender's private key, which identifies the account signer.

  // To make this work safely, the caller must pass the sender account id as 'fromAddress' and the privateKey. But to keep function
  // signature identical to earlier expectations (fromPrivateKey only), we will derive senderAccountId by reading env SENDER_ACCOUNT (NOT recommended).
  // To be correct, change caller to provide senderAccountId. For now, assume server code will pass the correct 'fromAddress' as toAddress param? — to avoid confusion:
  throw new Error("sendUSDT must be called with both sender account id and private key. Please call sendUSDTWithSender({ fromAccountId, fromPrivateKey, toAddress, amount }) - see implemented helper below.");
}

// Instead implement a correct helper that requires senderAccountId:
export async function sendUSDTWithSender({
  fromAccountId,
  fromPrivateKey,
  toAddress,
  amount,
}: {
  fromAccountId: string;
  fromPrivateKey: string;
  toAddress: string;
  amount: number | string;
}): Promise<string | null> {
  if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_KEY) {
    throw new Error("Server operator credentials are required in env");
  }
  if (!process.env.USDT_TOKEN_ID) {
    throw new Error("USDT_TOKEN_ID must be set in env (e.g. 0.0.12345)");
  }
  const HEDERA_NETWORK = (process.env.HEDERA_NETWORK || "testnet").toLowerCase();
  const client = HEDERA_NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(process.env.HEDERA_OPERATOR_ID!, process.env.HEDERA_OPERATOR_KEY!);

  const tokenId = TokenId.fromString(process.env.USDT_TOKEN_ID!);
  const decimals = process.env.USDT_TOKEN_DECIMALS ? Number(process.env.USDT_TOKEN_DECIMALS) : 6;

  const amountDecimal = typeof amount === "string" ? Number(amount) : amount;
  if (isNaN(amountDecimal)) throw new Error("Invalid amount");

  const baseAmountBigInt = BigInt(Math.floor(amountDecimal * 10 ** decimals));

  const treasuryAccount = process.env.TREASURY_ACCOUNT_ID!;
  if (!treasuryAccount) throw new Error("TREASURY_ACCOUNT_ID env missing");

  // Build the transfer transaction where operator pays fees.
  const transferTx = new TransferTransaction()
    .addTokenTransfer(tokenId, fromAccountId, -baseAmountBigInt)
    .addTokenTransfer(tokenId, treasuryAccount, baseAmountBigInt);

  // Freeze with client so we can sign with the user's private key
  const frozen = await transferTx.freezeWith(client);

  const userKey = PrivateKey.fromString(fromPrivateKey);
  const signed = await frozen.sign(userKey);

  // Now execute with the client (operator already set)
  const resp = await signed.execute(client);
  const receipt = await resp.getReceipt(client);
  const txId = resp.transactionId?.toString() ?? receipt.transactionId?.toString() ?? null;
  return txId;
}
