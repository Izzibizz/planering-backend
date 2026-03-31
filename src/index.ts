import "dotenv/config";
import cors from "cors";
import express from "express";
import { initializePlannerStore } from "./lib/plannerStore.js";
import plannerRoutes from "./routes/plannerRoutes.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const configuredOrigins = (process.env.FRONTEND_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  "https://planering.netlify.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...configuredOrigins,
]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.has(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/", (_request, response) => {
  response.json({
    name: "planering-backend",
    status: "running",
    docs: "/api/health",
  });
});

app.use("/api", plannerRoutes);

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);

    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    response.status(500).json({ message });
  },
);

async function startServer() {
  await initializePlannerStore();

  app.listen(port, () => {
    console.log(`Planner backend running on http://localhost:${port}`);
  });
}

void startServer().catch((error) => {
  console.error("Failed to start backend.", error);
  process.exit(1);
});
