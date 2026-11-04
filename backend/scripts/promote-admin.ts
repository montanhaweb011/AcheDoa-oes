// Execute apenas no terminal autorizado do servidor após o usuário criar a conta.
// Exemplo: npm run admin:promote -w backend -- admin@seudominio.com
import "dotenv/config";
import { db } from "../src/db.js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Uso: npm run admin:promote -w backend -- email@exemplo.com");
  process.exitCode = 1;
} else {
  try {
    const result = await db.user.updateMany({
      where: { email },
      data: { role: "ADMIN" },
    });
    if (result.count !== 1) {
      console.error("Nenhuma conta encontrada. Cadastre-a no site antes.");
      process.exitCode = 1;
    } else {
      console.log("Administrador habilitado:", email);
    }
  } catch (error) {
    console.error("Erro ao atualizar o administrador:", error);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
