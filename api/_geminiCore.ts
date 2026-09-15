import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Priority list of Gemini models with failover
export const MODEL_FALLBACK_LIST = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
];

// Helper to retrieve and clean Gemini API Key from multiple common environment variable names
export function getGeminiApiKey(): { key: string | undefined; sourceName: string | undefined } {
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

// Lazy getter for GoogleGenAI instance with telemetry User-Agent
let aiClient: GoogleGenAI | null = null;
let lastUsedKey: string | null = null;

export function getAIClient(): GoogleGenAI {
  const { key: apiKey, sourceName } = getGeminiApiKey();

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY belum dikonfigurasi di environment Vercel / server. " +
      "Silakan tambahkan 'GEMINI_API_KEY' pada Dashboard Vercel (Project Settings > Environment Variables) atau Google AI Studio."
    );
  }

  // Re-instantiate if the key was updated dynamically
  if (!aiClient || lastUsedKey !== apiKey) {
    lastUsedKey = apiKey;
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  return aiClient;
}

// Helper to format friendly error message for users
export function formatErrorMessage(rawError: any): string {
  if (!rawError) return "Terjadi kesalahan yang tidak diketahui.";
  const str = typeof rawError === "string" ? rawError : rawError.message || JSON.stringify(rawError);

  // If the error message contains embedded JSON string, try to parse it first
  try {
    const jsonMatch = str.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error && typeof parsed.error.message === "string") {
        return formatErrorMessage(parsed.error.message);
      }
    }
  } catch {
    // Ignore JSON parse failure
  }

  if (str.includes("503") || str.includes("UNAVAILABLE") || str.includes("high demand")) {
    return "Layanan Gemini sedang mengalami lonjakan trafik (503 UNAVAILABLE). Silakan klik 'Ulangi Jawaban' sesaat lagi.";
  }
  if (str.includes("429") || str.includes("RESOURCE_EXHAUSTED") || str.includes("Quota exceeded")) {
    return "Batas frekuensi permintaan (kuota gratis) tercapai sementara (429). Mohon tunggu sekitar 30-60 detik sebelum mengirim pesan lagi.";
  }
  if (str.includes("API_KEY_INVALID") || str.includes("API key not valid") || str.includes("PERMISSION_DENIED")) {
    return "API Key Gemini tidak valid atau izin ditolak. Harap periksa kunci API Anda di menu Environment Variables Vercel atau AI Studio.";
  }
  if (str.includes("GEMINI_API_KEY belum dikonfigurasi")) {
    return str;
  }

  return str;
}

// Health check handler
export function handleHealthCheck(req: any, res: any) {
  const { key, sourceName } = getGeminiApiKey();

  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    status: "ok",
    hasApiKey: Boolean(key),
    envSource: sourceName || null,
    model: MODEL_FALLBACK_LIST[0],
    platform: process.env.VERCEL ? "vercel" : "standalone",
    timestamp: new Date().toISOString(),
  });
}

// Chat streaming handler with Server-Sent Events
export async function handleChatStream(req: any, res: any) {
  try {
    const { messages, systemInstruction, temperature } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Daftar pesan tidak valid atau kosong." });
      return;
    }

    const { key: apiKey } = getGeminiApiKey();
    if (!apiKey) {
      res.status(500).json({
        error:
          "GEMINI_API_KEY belum dikonfigurasi di environment Vercel / server. " +
          "Buka Dashboard Vercel > Settings > Environment Variables > Tambahkan 'GEMINI_API_KEY', lalu lakukan Redeploy.",
      });
      return;
    }

    const ai = getAIClient();

    // Map conversation messages to Gemini format (supports text and optional image)
    const contents = messages.map((m: { role: string; content: string; imageUrl?: string }) => {
      const parts: any[] = [];
      if (m.imageUrl && typeof m.imageUrl === "string") {
        const match = m.imageUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }
      parts.push({ text: m.content || "" });
      return {
        role: m.role === "user" ? "user" : "model",
        parts,
      };
    });

    const defaultSystemInstruction =
      "Nama Anda adalah Roni. Jika ditanya nama panjang atau nama lengkap, nama Anda adalah Gusti Roni Kurniawan. Anda adalah asisten AI chatbot yang cerdas, ramah, dan solutif. Jika pengguna menyapa atau menanyakan nama atau identitas Anda, perkenalkan diri Anda dengan nama Roni (dan jika ditanya nama panjang atau nama lengkap, sebutkan Gusti Roni Kurniawan). Anda merespons pertanyaan pengguna secara cepat, akurat, dan terstruktur dengan Bahasa Indonesia yang baik dan alami (atau menyesuaikan dengan bahasa yang digunakan pengguna). Gunakan format Markdown yang rapi (seperti poin-poin, tabel, atau blok kode) bila membantu keterbacaan penjelasan.";

    // Set SSE headers (with Vercel/proxy buffering disabled)
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const config = {
      systemInstruction: systemInstruction || defaultSystemInstruction,
      temperature: typeof temperature === "number" ? temperature : 0.7,
    };

    let streamSucceeded = false;
    let lastError: any = null;

    // Try models in fallback order
    for (const modelName of MODEL_FALLBACK_LIST) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config,
        });

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }

        streamSucceeded = true;
        break; // Stream completed without throwing
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} stream encountered error:`, err?.message || err);
        // If it's a 503/429/UNAVAILABLE error, loop to next fallback model
        const errStr = String(err?.message || err);
        if (errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("429")) {
          continue;
        } else {
          break; // Other error (e.g. invalid arguments/key) - don't retry
        }
      }
    }

    if (!streamSucceeded) {
      throw lastError || new Error("Gagal mendapatkan respon dari model Gemini.");
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error("Gemini stream error:", error);
    const friendlyError = formatErrorMessage(error);

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: friendlyError })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: friendlyError });
    }
  }
}
