import dotenv from "dotenv";

dotenv.config();

function getGeminiApiKey(): { key: string | undefined; sourceName: string | undefined } {
  const envCandidates: [string, string | undefined][] = [
    ["GEMINI_API_KEY", process.env.GEMINI_API_KEY],
    ["VITE_GEMINI_API_KEY", process.env.VITE_GEMINI_API_KEY],
    ["GOOGLE_API_KEY", process.env.GOOGLE_API_KEY],
    ["GOOGLE_GENAI_API_KEY", process.env.GOOGLE_GENAI_API_KEY],
    ["GEMINI_KEY", process.env.GEMINI_KEY],
  ];

  for (const [name, val] of envCandidates) {
    if (val && typeof val === "string") {
      const cleaned = val.trim().replace(/^["']|["']$/g, "").trim();
      if (cleaned.length > 0) {
        return { key: cleaned, sourceName: name };
      }
    }
  }

  return { key: undefined, sourceName: undefined };
}

export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const { key, sourceName } = getGeminiApiKey();

  const data = {
    status: "ok",
    hasApiKey: Boolean(key),
    envSource: sourceName || null,
    model: "gemini-3.1-flash-lite",
    platform: process.env.VERCEL ? "vercel" : "standalone",
    timestamp: new Date().toISOString(),
  };

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (typeof res.json === "function" && typeof res.status === "function") {
    return res.status(200).json(data);
  }
  return res.end(JSON.stringify(data));
}
