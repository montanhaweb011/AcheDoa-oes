import { execFileSync } from "node:child_process";
const env = { ...process.env };
// Generating the client does not connect to the database.
if (!env.DATABASE_URL)
  env.DATABASE_URL =
    "postgresql://unconfigured:unconfigured@localhost:5432/unconfigured";
if (!/^postgres(ql)?:\/\//.test(env.DATABASE_URL))
  throw new Error(
    "Vercel exige DATABASE_URL PostgreSQL persistente, não SQLite local.",
  );
const run = (args) => execFileSync("npm", args, { stdio: "inherit", env });
run([
  "exec",
  "-w",
  "backend",
  "--",
  "prisma",
  "generate",
  "--schema",
  "prisma-postgres/schema.prisma",
]);
run(["exec", "-w", "backend", "--", "tsc"]);
run(["run", "build", "-w", "frontend"]);
