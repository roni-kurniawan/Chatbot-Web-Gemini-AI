import { handleChatStream } from "../_geminiCore";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Metode tidak diizinkan. Gunakan POST." });
    return;
  }
  return handleChatStream(req, res);
}
