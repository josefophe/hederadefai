import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function getReloadlyToken(): Promise<string> {
  const res = await axios.post(`https://auth.reloadly.com/oauth/token`, {
    client_id: process.env.RELOADLY_CLIENT_ID,
    client_secret: process.env.RELOADLY_CLIENT_SECRET,
    grant_type: "client_credentials",
    audience: "https://topups-sandbox.reloadly.com",
  });

  return res.data.access_token;
}

async function autoDetectOperator(phoneNumber: string): Promise<number> {
  const token = await getReloadlyToken();

  const res = await axios.post(
    "https://topups-sandbox.reloadly.com/operators/auto-detect/phone",
    {
      phone: phoneNumber,
      countryCode: "NG",
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/com.reloadly.topups-v1+json",
        "Content-Type": "application/json",
      },
    }
  );

  return res.data.operatorId;
}

export async function topUpAirtime({
  phoneNumber,
  amount,
  operatorId,
}: {
  phoneNumber: string;
  amount: number;
  operatorId?: number; // Optional manual override
}) {
  const token = await getReloadlyToken();

  let finalOperatorId = operatorId;

  if (!finalOperatorId) {
    finalOperatorId = process.env.RELOADLY_OPERATOR_ID
      ? parseInt(process.env.RELOADLY_OPERATOR_ID)
      : await autoDetectOperator(phoneNumber);
  }

  const result = await axios.post(
    `https://topups-sandbox.reloadly.com/topups`,
    {
      operatorId: finalOperatorId,
      amount,
      useLocalAmount: true,
      recipientPhone: {
        countryCode: "NG",
        number: phoneNumber,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/com.reloadly.topups-v1+json",
        "Content-Type": "application/json",
      },
    }
  );

  return result.data;
}