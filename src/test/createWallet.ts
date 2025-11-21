// createWallet.ts
import "dotenv/config";
import { PrivateKey, Client, AccountCreateTransaction, Hbar } from "@hashgraph/sdk";

async function main() {
  try {
    // 1️⃣ Generate ECDSA key (secp256k1)
    const ecdsaPrivateKey = PrivateKey.generateECDSA();
    const ecdsaPublicKey = ecdsaPrivateKey.publicKey;

    console.log("✅ Generated ECDSA key pair");
    console.log("ECDSA Private Key (hex):", ecdsaPrivateKey.toStringRaw());
    console.log("ECDSA Public Key (hex):", ecdsaPublicKey.toStringRaw());

    // 2️⃣ Initialize Hedera client
    const network = (process.env.HEDERA_NETWORK || "testnet").toLowerCase();
    const client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
    client.setOperator(process.env.HEDERA_OPERATOR_ID!, process.env.HEDERA_OPERATOR_KEY!);

    // 3️⃣ Create Hedera account with ECDSA key as alias
    const tx = await new AccountCreateTransaction()
      .setECDSAKeyWithAlias(ecdsaPublicKey)
      .setInitialBalance(new Hbar(1)) // optional: 1ℏ
      .execute(client);

    const receipt = await tx.getReceipt(client);
    const accountId = receipt.accountId!.toString();

    // 4️⃣ Derive EVM address from ECDSA public key
    const evmAddress = `0x${ecdsaPublicKey.toEvmAddress()}`;

    console.log("\n🎯 Account successfully created!");
    console.log("Hedera Account ID:", accountId);
    console.log("EVM Address (Metamask-compatible):", evmAddress);

    // Optional: also show 0x-prefixed private key for EVM use
    const evmPrivateKey = `0x${ecdsaPrivateKey.toStringRaw()}`;
    console.log("EVM Private Key (hex):", evmPrivateKey);
  } catch (err) {
    console.error("❌ Error creating wallet:", err);
  }
}

main();
