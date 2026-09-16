import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Primary model is always attempted first for the fastest response
const PRIMARY_MODEL = "gemini-3.5-flash-lite";

// Fallback models are used if the primary model hits a rate limit or 503 error
const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

// Helper to get model candidates with Primary always first, followed by randomized fallbacks
function getLoadBalancedModelCandidates(): string[] {
  const fallbacks = [...FALLBACK_MODELS];
  // Shuffle fallbacks to evenly distribute load if primary fails
  for (let i = fallbacks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fallbacks[i], fallbacks[j]] = [fallbacks[j], fallbacks[i]];
  }
  // Always return primary model as the very first candidate
  return [PRIMARY_MODEL, ...fallbacks];
}

// Helper to retrieve and clean Gemini API Key from multiple common environment variable names
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

// Safely send JSON response without assuming Express helpers exist
function safeSendJson(res: any, statusCode: number, data: any) {
  try {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-gemini-api-key");
    if (typeof res.json === "function" && typeof res.status === "function") {
      return res.status(statusCode).json(data);
    }
    return res.end(JSON.stringify(data));
  } catch {
    try {
      res.end(JSON.stringify(data));
    } catch {}
  }
}

// Safe body parser that supports pre-parsed objects, strings, buffers, and unparsed streams
async function parseRequestBody(req: any): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "object") {
      return req.body;
    }
    if (typeof req.body === "string" && req.body.trim()) {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
  }

  // If body is not yet parsed, read the incoming stream
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk: any) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => {
      resolve({});
    });
  });
}

// Format friendly error messages
function formatErrorMessage(rawError: any): string {
  if (!rawError) return "Terjadi kesalahan yang tidak diketahui.";
  const str = typeof rawError === "string" ? rawError : rawError.message || JSON.stringify(rawError);

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

export default async function handler(req: any, res: any) {
  // Always attach CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-gemini-api-key");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    safeSendJson(res, 405, { error: "Metode tidak diizinkan. Gunakan POST." });
    return;
  }

  try {
    const body = await parseRequestBody(req);
    const { messages, systemInstruction, temperature } = body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      safeSendJson(res, 400, { error: "Daftar pesan tidak valid atau kosong." });
      return;
    }

    const { key: apiKey } = getGeminiApiKey();
    if (!apiKey) {
      safeSendJson(res, 500, {
        error:
          "GEMINI_API_KEY belum dikonfigurasi di environment Vercel. " +
          "Buka Dashboard Vercel > Settings > Environment Variables > Tambahkan 'GEMINI_API_KEY' (Value: AIzaSy...), lalu lakukan REDEPLOY pada deployment terakhir.",
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

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
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    const config = {
      systemInstruction: systemInstruction || defaultSystemInstruction,
      temperature: typeof temperature === "number" ? temperature : 0.7,
    };

    let streamSucceeded = false;
    let lastError: any = null;
    let activeModelName = "";

    // Iterate through randomized model candidates to distribute load
    const candidateModels = getLoadBalancedModelCandidates();

    for (const modelName of candidateModels) {
      let chunksEmitted = 0;
      try {
        const responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config,
        });

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            // If this is the very first successful chunk, inform the client which model is actively streaming
            if (chunksEmitted === 0) {
              activeModelName = modelName;
              res.write(`data: ${JSON.stringify({ model: modelName })}\n\n`);
            }

            res.write(`data: ${JSON.stringify({ text, model: modelName })}\n\n`);
            chunksEmitted++;
            if (typeof res.flush === "function") {
              res.flush();
            }
          }
        }

        streamSucceeded = true;
        break;
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || err).toLowerCase();
        console.info(`[Auto-Failover] Model candidate ${modelName} encountered: ${err?.status || err?.code || "temporary issue"}. Trying next candidate...`);

        // If chunks were already written to client, we cannot cleanly switch models mid-output
        if (chunksEmitted > 0) {
          break;
        }

        // If it's a rate limit, quota exhaustion, 429, 503, or temporary outage, try the next model
        if (
          errStr.includes("429") ||
          errStr.includes("quota") ||
          errStr.includes("resource_exhausted") ||
          errStr.includes("rate limit") ||
          errStr.includes("503") ||
          errStr.includes("unavailable") ||
          errStr.includes("overloaded") ||
          errStr.includes("not found")
        ) {
          console.info(`Auto-switching to another healthy Gemini model in pool...`);
          continue;
        } else {
          // If it's another non-quota error, still attempt next candidate if no chunks were emitted
          continue;
        }
      }
    }

    if (!streamSucceeded) {
      throw lastError || new Error("Gagal mendapatkan respon dari kumpulan model Gemini.");
    }

    res.write(`data: ${JSON.stringify({ done: true, model: activeModelName })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error("Gemini stream error:", error);
    const friendlyError = formatErrorMessage(error);

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: friendlyError })}\n\n`);
      res.end();
    } else {
      safeSendJson(res, 500, { error: friendlyError });
    }
  }
}
