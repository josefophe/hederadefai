import { Packages } from "@kaiachain/kaia-agent-kit";
import { getKaiaConfig, getWalletClientFromPrivateKey } from "../kaia/utils/helper"; // adjust path

export async function refundUsdt({
  to,
  amount,
}: {
  to: string;
  amount: string;
}) {
  const tokenAddress = process.env.USDT_CONTRACT!;
  const sender = process.env.BOT_WALLET_ADDRESS!;
  const privateKey = process.env.BOT_PRIVATE_KEY!;

  const config = getKaiaConfig();
  const walletClient = getWalletClientFromPrivateKey(privateKey, config);

  return await Packages.web3.Services.transferErc20(
    {
      sender,
      receiver: to,
      amount,
      tokenAddress,
    },
    config,
    walletClient
  );
}