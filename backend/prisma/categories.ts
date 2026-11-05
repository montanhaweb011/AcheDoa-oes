import { db } from "../src/db.js";
// Production initialization: categories only, no fake locations or shared passwords.
const categories = [
  "Roupas femininas",
  "Roupas masculinas",
  "Roupas infantis",
  "Roupas de bebê",
  "Agasalhos",
  "Calçados",
  "Cobertores",
  "Acessórios",
];
try {
  for (const [i, name] of categories.entries())
    await db.clothingCategory.upsert({
      where: { id: String(i + 1) },
      update: { name },
      create: { id: String(i + 1), name },
    });
} finally {
  await db.$disconnect();
}
