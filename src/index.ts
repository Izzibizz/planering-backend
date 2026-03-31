import cors from "cors";
import express from "express";
import plannerRoutes from "./routes/plannerRoutes.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

app.use(
  cors({
    origin: [frontendOrigin, "http://127.0.0.1:5173"],
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

app.listen(port, () => {
  console.log(`Planner backend running on http://localhost:${port}`);
});
