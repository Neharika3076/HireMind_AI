import { Router } from "express";
import mongoose from "mongoose";
import { healthCheck } from "../services/hiremind-client.js";

export const healthRouter = Router();
healthRouter.get("/", async (_req, res) => {
  let ai;
  try { ai = await healthCheck(); }
  catch (error) { ai = { status: "unavailable", message: error.message }; }
  res.json({ status: mongoose.connection.readyState === 1 && ai.status === "healthy" ? "healthy" : "degraded", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected", hireMindAi: ai });
});
