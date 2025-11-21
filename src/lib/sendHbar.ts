// src/lib/sendHbar.ts
import { Client, TransferTransaction, Hbar, AccountId, PrivateKey } from "@hashgraph/sdk";

export async function sendHbar({
  fromPrivateKey,
  fromAccountId,
  toAccountId,
  amount,
}: {
  fromPrivateKey: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
}): Promise<string> {
  const senderAccount = AccountId.fromString(fromAccountId);
  const senderKey = PrivateKey.fromString(fromPrivateKey);

  const HEDERA_NETWORK = (process.env.HEDERA_NETWORK || "testnet").toLowerCase();
  const client = HEDERA_NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(senderAccount, senderKey);

  const tx = await new TransferTransaction()
    .addHbarTransfer(senderAccount, new Hbar(-amount))
    .addHbarTransfer(toAccountId, new Hbar(amount))
    .freezeWith(client)
    .sign(senderKey);

  const response = await tx.execute(client);
  await response.getReceipt(client);

  return response.transactionId.toString();
}
