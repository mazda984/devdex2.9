import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { generalLimiter, speedLimiter } from "./middlewares/rate-limit";

const app: Express = express();

// Trust the first proxy hop (e.g. Cloudflare / load balancer / Replit) so
// req.ip reflects the real client IP instead of the proxy's IP. This is
// required for IP-based rate limiting to work correctly behind a proxy.
app.set("trust proxy", 1);

// Security-related HTTP headers (hides framework fingerprint, sets sane
// defaults like X-Content-Type-Options, disables some attack surfaces).
app.use(helmet());

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
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser(process.env.SESSION_SECRET));

// Cap request body size so large payloads can't be used to exhaust
// memory/CPU (a common low-effort DoS vector).
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Apply flood/DoS mitigation to all API traffic. Individual routers
// (e.g. auth) can layer `strictLimiter` on top for sensitive endpoints.
app.use("/api", speedLimiter, generalLimiter, router);

export default app;
