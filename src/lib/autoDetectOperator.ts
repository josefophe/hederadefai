// lib/autoDetectOperator.ts

import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const RELOADLY_AUTH_URL = "https://auth.reloadly.com/oauth/token";
const RELOADLY_TOPUP_BASE_URL = "https://topups-sandbox.reloadly.com";

export async function getReloadlyToken(): Promise<string> {
  const res = await axios.post(RELOADLY_AUTH_URL, {
    client_id: process.env.RELOADLY_CLIENT_ID,
    client_secret: process.env.RELOADLY_CLIENT_SECRET,
    grant_type: "client_credentials",
    audience: `${RELOADLY_TOPUP_BASE_URL}`,
  });

  return res.data.access_token;
}

function normalizePhoneNumber(phone: string): string {
  let number = phone.trim();

  if (number.startsWith("0")) {
    number = "234" + number.slice(1);
  } else if (number.startsWith("+234")) {
    number = number.replace("+", "");
  }

  return number;
}

export async function autoDetectOperator(phoneNumber: string): Promise<{
  operatorId: number;
  name: string;
}> {
  const token = await getReloadlyToken();
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  const res = await axios.get(
    `${RELOADLY_TOPUP_BASE_URL}/operators/auto-detect/phone/${normalizedPhone}/countries/NG`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/com.reloadly.topups-v1+json",
      },
    }
  );

  const { operatorId, name } = res.data;
  return { operatorId, name };
}
