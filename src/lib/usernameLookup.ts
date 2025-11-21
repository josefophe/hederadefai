// src/lib/usernameLookup.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getUsernameWallet(username: string) {
  return prisma.wallet.findUnique({
    where: { username },
  });
}
