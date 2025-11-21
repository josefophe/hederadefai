import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import {
  PrivateKey,
  Client,
  AccountCreateTransaction,
  Hbar,
  TokenAssociateTransaction,
  TokenId,
} from "@hashgraph/sdk";

const prisma = new PrismaClient();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const IV_LENGTH = 16;

// AES-256 encryption
function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(encrypted: string) {
  const [ivHex, encryptedHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );

  return Buffer.concat([decipher.update(encryptedText), decipher.final()]).toString("utf8");
}

// ---------------------------------------------------------
// MAIN WALLET GENERATION FUNCTION WITH AUTO-TOKEN ASSOCIATION
// ---------------------------------------------------------
export async function getOrCreateWallet(telegramId: string, username?: string) {
  let wallet = await prisma.wallet.findUnique({ where: { telegramId } });

  if (!wallet) {
    // 1️⃣ Generate ECDSA keypair (Hedera + EVM)
    const ecdsaKey = PrivateKey.generateECDSA();
    const derPrivateKey = ecdsaKey.toString();
    const publicKeyHex = ecdsaKey.publicKey.toStringRaw();
    const evmPrivateKey = `0x${ecdsaKey.toStringRaw()}`;
    const evmAddress = `0x${ecdsaKey.publicKey.toEvmAddress()}`;

    // 2️⃣ Create Hedera account
    const HEDERA_NETWORK = (process.env.HEDERA_NETWORK || "testnet").toLowerCase();
    const client =
      HEDERA_NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();
    client.setOperator(
      process.env.HEDERA_OPERATOR_ID!,
      process.env.HEDERA_OPERATOR_KEY!
    );

    const tx = await new AccountCreateTransaction()
      .setKey(ecdsaKey.publicKey)
      .setInitialBalance(new Hbar(1)) // for token associations
      .execute(client);

    const receipt = await tx.getReceipt(client);
    const accountId = receipt.accountId!.toString();

    // 3️⃣ Auto-associate platform tokens with wallet's own key
    const tokensToAssociate = process.env.PLATFORM_TOKEN_IDS
      ? process.env.PLATFORM_TOKEN_IDS.split(",").map(id => TokenId.fromString(id))
      : [];

    if (tokensToAssociate.length > 0) {
      // create a client signed by the new wallet itself
      const walletClient =
        HEDERA_NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();
      walletClient.setOperator(accountId, ecdsaKey);

      for (const tokenId of tokensToAssociate) {
        try {
          const assocTx = new TokenAssociateTransaction()
            .setAccountId(accountId)
            .setTokenIds([tokenId]);
          const assocResp = await assocTx.execute(walletClient);
          await assocResp.getReceipt(walletClient);
          console.log(`✅ Auto-associated token ${tokenId} to account ${accountId}`);
        } catch (err) {
          console.log(`⚠ Token association failed or already associated: ${err}`);
        }
      }
    }

    // 4️⃣ Save wallet in DB
    wallet = await prisma.wallet.create({
      data: {
        telegramId,
        username,
        address: evmAddress,
        accountId,
        publicKey: publicKeyHex,
        privateKey: encrypt(derPrivateKey),
        evmPrivateKey: encrypt(evmPrivateKey),
      },
    });
  }
  // Update username if changed
  else if (username && wallet.username !== username) {
    wallet = await prisma.wallet.update({
      where: { telegramId },
      data: { username },
    });
  }

  // Return decrypted wallet
  return {
    address: wallet.address,
    privateKey: decrypt(wallet.privateKey),
    evmPrivateKey: decrypt(wallet.evmPrivateKey),
    publicKey: wallet.publicKey,
    accountId: wallet.accountId,
  };
}
