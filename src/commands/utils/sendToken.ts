import {
  TransferTransaction,
  TokenId,
  AccountId,
  PrivateKey,
  Client,
} from "@hashgraph/sdk";

/**
 * Send HTS token (USDT, Kaia, etc.) from owner to recipient.
 *
 * @param client Hedera client with operator set
 * @param tokenId TokenId to transfer
 * @param ownerAccountId Sender account
 * @param receiverAccountId Recipient account
 * @param amount Amount in smallest token units (e.g., 6 decimals for USDT)
 * @param ownerPrivateKey Sender's private key
 * @returns txId string
 */
export async function sendToken(
  client: Client,
  tokenId: TokenId,
  ownerAccountId: AccountId,
  receiverAccountId: AccountId,
  amount: number,
  ownerPrivateKey: PrivateKey
): Promise<string> {
  // Create transfer transaction
  const tokenTransferTx = new TransferTransaction()
    .addTokenTransfer(tokenId, ownerAccountId, -amount) // Deduct from sender
    .addTokenTransfer(tokenId, receiverAccountId, amount) // Add to recipient
    .freezeWith(client);

  // Sign transaction with sender key
  const signedTx = await tokenTransferTx.sign(ownerPrivateKey);

  // Execute transaction
  const submitTx = await signedTx.execute(client);

  // Get receipt
  const receipt = await submitTx.getReceipt(client);

  console.log("Token transfer status:", receipt.status.toString());

  return submitTx.transactionId.toString(); // return txId for HashScan link
}
