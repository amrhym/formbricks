import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const KIMI_API_KEY = process.env.KIMI_API_KEY || "";
const KIMI_BASE_URL = process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1";
const KIMI_MODEL = process.env.KIMI_MODEL || "moonshot-v1-32k";

export const kimi = createOpenAICompatible({
  name: "kimi",
  baseURL: KIMI_BASE_URL,
  apiKey: KIMI_API_KEY,
});

export const getModel = () => kimi(KIMI_MODEL);

export const isAIConfigured = () => !!KIMI_API_KEY;
