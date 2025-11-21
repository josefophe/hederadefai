import express from "express";
import bodyParser from "body-parser";
import { addSignal, readSignals, findSignalById } from "./utils";
import { x402Fetch } from "x402-fetch";

const app = express();
const PORT = process.env.PORT || 4021;
const SERVER_ACCOUNT = "0.0.7243485"; // HEDERA account receiving storage payments

app.use(bodyParser.json());

// Trader stores signal (pays 0.5 HBAR to server)
app.post("/signal", async (req, res) => {
  try {
    const { accountId, text, price, payment } = req.body;
    if (!accountId || !text || !price || !payment)
      return res.status(400).json({ error: "Missing fields" });

    // Verify 0.5 HBAR payment to server
    const paymentResult = await x402Fetch(payment, { amount: "0.5", to: SERVER_ACCOUNT });
    if (!paymentResult.success)
      return res.status(402).json({ error: "Payment failed or insufficient" });

    const signal = addSignal(accountId, text, price);
    res.json({ success: true, signal, paymentStatus: paymentResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// User reads signal (pays signal owner)
app.post("/read-signal", async (req, res) => {
  try {
    const { signalId, payment } = req.body;
    const signal = findSignalById(signalId);
    if (!signal) return res.status(404).json({ error: "Signal not found" });
    if (!payment) return res.status(400).json({ error: "Payment required" });

    // Payment must go to signal owner
    const paymentResult = await x402Fetch(payment, { amount: signal.price.toString(), to: signal.accountId });
    if (!paymentResult.success)
      return res.status(402).json({ error: "Payment failed or insufficient" });

    res.json({ success: true, text: signal.text, paymentStatus: paymentResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// List signals (IDs + price)
app.get("/list-signals", (req, res) => {
  const signals = readSignals().map(s => ({
    id: s.id,
    price: s.price,
    createdAt: s.createdAt
  }));
  res.json(signals);
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
