import express from "express";
import streamHandler from "./chat/stream";
import healthHandler from "./health";

const app = express();

app.use(express.json({ limit: "25mb" }));

app.all(["/api/health", "/health"], (req, res) => {
  return healthHandler(req, res);
});

app.all(["/api/chat/stream", "/chat/stream"], (req, res) => {
  return streamHandler(req, res);
});

export default app;
