import express from "express";
import { handleHealthCheck, handleChatStream } from "./_geminiCore";

const app = express();

app.use(express.json({ limit: "25mb" }));

// Mount endpoints on both `/api/*` and `/*` to guarantee matching under any proxy/Vercel rewrite setup
app.get(["/api/health", "/health"], handleHealthCheck);
app.post(["/api/chat/stream", "/chat/stream"], handleChatStream);

export default app;
