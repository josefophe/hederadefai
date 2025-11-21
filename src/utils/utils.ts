import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const FILE_PATH = path.join(__dirname, "data", "signals.json");

interface Signal {
  id: string;
  accountId: string;
  text: string;
  price: string;
  createdAt: string;
}

export function readSignals(): Signal[] {
  if (!fs.existsSync(FILE_PATH)) return [];
  const data = fs.readFileSync(FILE_PATH, "utf-8");
  return JSON.parse(data) as Signal[];
}

export function addSignal(accountId: string, text: string, price: string): Signal {
  const signals = readSignals();
  const signal: Signal = {
    id: uuidv4(),
    accountId,
    text,
    price,
    createdAt: new Date().toISOString(),
  };
  signals.push(signal);
  fs.writeFileSync(FILE_PATH, JSON.stringify(signals, null, 2));
  return signal;
}

export function findSignalById(id: string): Signal | undefined {
  return readSignals().find(s => s.id === id);
}
