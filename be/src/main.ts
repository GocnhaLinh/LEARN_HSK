import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { setDefaultResultOrder } from "dns";
import { json, NextFunction, Request, Response, urlencoded } from "express";
import { setDefaultAutoSelectFamily } from "net";
import { gzip } from "zlib";
import { AppModule } from "./app.module";

// Prevent Node 20/22 Happy Eyeballs IPv6 TLS Alert 80 issues against MongoDB Atlas
setDefaultResultOrder("ipv4first");
setDefaultAutoSelectFamily(false);

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>("PORT", 3001);
  const corsOrigin = config.get<string>("CORS_ORIGIN", "http://localhost:5173");

  // Lightweight built-in Gzip compression for JSON payloads >= 1 KB (saves ~80% bandwidth)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const acceptEncoding = String(req.headers["accept-encoding"] || "");
    if (!acceptEncoding.includes("gzip")) {
      return next();
    }

    const origJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.headersSent || body === undefined) {
        return origJson(body);
      }
      const jsonStr = JSON.stringify(body);
      if (!jsonStr || jsonStr.length < 1024) {
        return origJson(body);
      }
      gzip(Buffer.from(jsonStr, "utf8"), { level: 6 }, (err, compressed) => {
        if (err || res.headersSent) {
          if (!res.headersSent) origJson(body);
          return;
        }
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Content-Encoding", "gzip");
        res.setHeader("Vary", "Accept-Encoding");
        res.setHeader("Content-Length", String(compressed.length));
        res.end(compressed);
      });
      return res;
    }) as Response["json"];

    next();
  });

  // Support large PDF/DOCX bulk vocab imports & base64 canvas snapshots
  app.use(json({ limit: "15mb" }));
  app.use(urlencoded({ extended: true, limit: "15mb" }));

  app.setGlobalPrefix("api");

  app.enableCors({
    origin: corsOrigin.split(",").map((s) => s.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(port);
  logger.log(
    `HSK (QUEST) 3.0 NestJS API running at http://localhost:${port}/api`,
  );
}

bootstrap();
