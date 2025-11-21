// src/mastra/tools/claimUSDTTool.ts
import { createTool } from "@mastra/core";
import { z } from "zod";
import { writeContract } from "viem/actions";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { kairos } from "viem/chains";
import claimAbi from "../../abi/usdt_abi.json"; // ensure ABI has claimFor(address)
import { Packages } from "@kaiachain/kaia-agent-kit";

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;
if (!PRIVATE_KEY) {
  throw new Error("Missing WALLET_PRIVATE_KEY in environment variables.");
}
const formattedKey = PRIVATE_KEY.startsWith("0x")
  ? PRIVATE_KEY as `0x${string}`
  : `0x${PRIVATE_KEY}` as `0x${string}`;

// 🔑 Create wallet client from private key
const account = privateKeyToAccount(formattedKey);
const walletClient = createWalletClient({
  account,
  chain: kairos,
  transport: http("https://public-en-kairos.node.kaia.io"),
});

const contractAddress = "0x7D39FA0405F3E06374c3735B40bf12712A8EC718";

export const claimUSDTTool = createTool({
  id: "claimUSDT",
  description: "Send 1000 test kUSDT to the user's wallet via claimFor()",
  inputSchema: z.object({
    address: z.string().describe("User wallet address to receive tokens"),
    // Add any other parameters you need
  }),
  outputSchema: z.object({
    message: z.string(),
    url: z.string(),
    explorerUrl: z.string().optional(), // Optional URL to view transaction
  }),
  execute: async ({ context }) => {
    // const address = context.address as `0x${string}`;
    const userAddress = context.address as `0x${string}`;

    const result = await Packages.web3.Services.transferFaucet({
      contractAddress,
      receiver: userAddress, 
      sender: account.address, // Optional but explicit
    }, {}, walletClient);

    /* const txHash = await writeContract(walletClient, {
      address: contractAddress,
      abi: claimAbi,
      functionName: "claimFor",
      args: [userAddress],
    }); */

    return {
      message: `✅ Successfully claimed 1000 test kUSDT for ${userAddress}`,
      url: result.transactionHash,
      explorerUrl: `https://kairos.kaia.io/tx/${result.transactionHash}`,
      
    };
  },
});
