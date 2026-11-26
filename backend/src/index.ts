import { mkdirSync } from "node:fs";
import path from "node:path";
import { createApp } from "./app.ts";
import { loadConfig, loadEnvFile } from "./config.ts";
import { openDatabase } from "./db.ts";

loadEnvFile();
const config = loadConfig();

const dbDir = path.dirname(config.databasePath);
if (dbDir && dbDir !== ".") {
  mkdirSync(dbDir, { recursive: true });
}
mkdirSync(config.uploadsDir, { recursive: true });

const db = openDatabase(config.databasePath);
const app = createApp({ db, config });

app.listen({
  hostname: "0.0.0.0",
  port: config.port,
});

console.log(`RythonDev media kit listening on http://localhost:${config.port}`);
