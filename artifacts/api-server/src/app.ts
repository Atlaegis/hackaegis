import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";
import { globalRateLimit } from "./middlewares/rateLimiter";

const app: Express = express();

const allowedOrigins = process.env["ALLOWED_ORIGINS"]
  ? process.env["ALLOWED_ORIGINS"].split(",").map((o) => o.trim())
  : true;

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        upgradeInsecureRequests: null,
      },
    },
  }),
);

app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(cookieParser());

app.use(globalRateLimit);

app.use("/api", router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "not_found", message: "Route not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err && typeof err === "object" && "type" in err && (err as { type: string }).type === "entity.too.large") {
    res.status(413).json({ error: "payload_too_large", message: "Request body exceeds size limit" });
    return;
  }
  if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 413) {
    res.status(413).json({ error: "payload_too_large", message: "Request body exceeds size limit" });
    return;
  }
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "internal_error", message: "An unexpected error occurred" });
});

export default app;
