// lib/invoice.ts

type InvoiceInput = {
  type: "airtime" | "data" | "other";
  from: string;
  to: string; // Phone number or receiver address
  value: number; // Amount in NGN or USD
  token: string; // e.g. kUSDT
  txHash: string;
};

export async function createInvoice({
  type,
  from,
  to,
  value,
  token,
  txHash,
}: InvoiceInput): Promise<string> {
  const lines: string[] = [];

  lines.push(`🧾 <b>Transaction Invoice</b>`);
  lines.push(`• Type: ${type}`);
  lines.push(`• From: <code>${from}</code>`);
  lines.push(`• To: <code>${to}</code>`);
  lines.push(`• Amount: <b>${value} ${token}</b>`);
  lines.push(`• Hash: <code>${txHash}</code>`);

  return lines.join("\n");
}
