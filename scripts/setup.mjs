import { existsSync, copyFileSync, closeSync, openSync } from "node:fs";
if (!existsSync("backend/.env"))
  copyFileSync("backend/.env.example", "backend/.env");

if (!existsSync("backend/prisma/dev.db"))
  closeSync(openSync("backend/prisma/dev.db", "w"));
