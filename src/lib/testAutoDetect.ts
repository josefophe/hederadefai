import { autoDetectOperator } from "./autoDetectOperator";

const run = async () => {
  try {
    const operator = await autoDetectOperator("8020000000"); // replace with real number
    console.log("Detected operator:", operator);
  } catch (err) {
    if (err instanceof Error) {
      console.error("Failed to detect operator:", (err as any).response?.data || err.message);
    } else {
      console.error("Unknown error:", err);
    }
  }
};

run();