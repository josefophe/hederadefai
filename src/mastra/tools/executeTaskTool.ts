import { createTool } from "@mastra/core";
import { z } from "zod";
import { createHederaSigner } from "../../utils/x402Signer";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";

export const executeTaskTool = createTool({
  id: "executeTask",
  description: "Executes a task using a Hedera x402 payment-protected endpoint.",

  inputSchema: z.object({
    taskId: z.string().describe("Unique identifier for the task"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    result: z.any(),
    payment: z.any(),
  }),

  execute: async ({ context }) => {
    const { taskId } = context;

    const signer = await createHederaSigner();
    const fetchWithPayment = wrapFetchWithPayment(fetch, signer);

    const url = `${process.env.RESOURCE_SERVER_URL}/execute-task?taskId=${taskId}`;
    const response = await fetchWithPayment(url, { method: "GET" });

    const body = await response.json();
    const paymentResponse = decodeXPaymentResponse(
      response.headers.get("x-payment-response")!
    );

    return {
      success: true,
      result: body,
      payment: paymentResponse,
    };
  }
});
