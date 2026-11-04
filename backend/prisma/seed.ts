import { db } from "../src/db.js";
import bcrypt from "bcryptjs";
if (process.env.NODE_ENV === "production")
  throw new Error("Seed demonstrativo bloqueado em produção");
const cats = [
  "Roupas femininas",
  "Roupas masculinas",
  "Roupas infantis",
  "Roupas de bebê",
  "Agasalhos",
  "Calçados",
  "Cobertores",
  "Acessórios",
];
for (const [i, name] of cats.entries())
  await db.clothingCategory.upsert({
    where: { id: String(i + 1) },
    update: { name },
    create: { id: String(i + 1), name },
  });
for (const [id, name, role] of [
  ["admin", "Administrador local", "ADMIN"],
  ["doador", "Doador demonstração", "DONOR"],
  ["instituicao", "Instituição demonstração", "INSTITUTION"],
])
  await db.user.upsert({
    where: { id },
    update: {},
    create: {
      id,
      name,
      role,
      email: `${id}@demo.local`,
      password: await bcrypt.hash("DemoLocal!2026", 12),
    },
  });
await db.institution.upsert({
  where: { id: "instituicao-demo" },
  update: {},
  create: {
    id: "instituicao-demo",
    ownerId: "instituicao",
    name: "Rede Fio de Afeto — fictícia",
    description: "Instituição fictícia para testar a plataforma.",
    status: "APPROVED",
  },
});
const places: [string, string, number, number][] = [
  ["São Paulo", "Vila Mariana", -23.589, -46.635],
  ["São Paulo", "Pinheiros", -23.566, -46.693],
  ["São Paulo", "São Miguel Paulista", -23.493, -46.443],
  ["São Paulo", "Santana", -23.505, -46.625],
  ["Guarulhos", "Centro", -23.462, -46.532],
  ["Osasco", "Centro", -23.532, -46.792],
  ["Santo André", "Centro", -23.663, -46.535],
  ["Campinas", "Cambuí", -22.895, -47.052],
  ["Santos", "Gonzaga", -23.967, -46.333],
  ["Rio de Janeiro", "Tijuca", -22.924, -43.233],
  ["Belo Horizonte", "Centro", -19.919, -43.939],
  ["Curitiba", "Centro", -25.429, -49.272],
];
for (const [i, [city, neighborhood, latitude, longitude]] of places.entries())
  await db.collectionPoint.upsert({
    where: { id: `demo-${i + 1}` },
    update: {},
    create: {
      id: `demo-${i + 1}`,
      institutionId: "instituicao-demo",
      name:
        [
          "Casa dos Recomeços",
          "Espaço Entrelaços",
          "Ponto Novos Fios",
          "Casa Abraço",
        ][i % 4] + ` ${i + 1}`,
      description:
        "Um ponto inteiramente fictício para explorar a experiência de encontrar e organizar doações. Não recebe entregas.",
      state: i < 9 ? "SP" : i === 9 ? "RJ" : i === 10 ? "MG" : "PR",
      city,
      neighborhood,
      street: "Endereço ilustrativo — sem local de entrega",
      number: "s/n",
      latitude,
      longitude,
      isDemo: true,
      status: "APPROVED",
      restrictions: "Não entregar roupas neste endereço demonstrativo.",
      instructions: "Use este registro apenas para testar o sistema.",
      categories: {
        create: [
          String((i % 8) + 1),
          String(((i + 2) % 8) + 1),
          String(((i + 4) % 8) + 1),
        ].map((categoryId) => ({ categoryId })),
      },
      hours: {
        create: [1, 2, 3, 4, 5].map((day) => ({
          day,
          opens: "09:00",
          closes: "17:00",
        })),
      },
    },
  });
for (let i = 0; i < 3; i++)
  await db.campaign.upsert({
    where: { id: `campanha-${i + 1}` },
    update: { approved: true },
    create: {
      approved: true,
      id: `campanha-${i + 1}`,
      institutionId: "instituicao-demo",
      pointId: `demo-${i + 1}`,
      title: [
        "Roupas para recomeçar",
        "Pequenos gestos, novos caminhos",
        "Inverno com acolhimento",
      ][i],
      description:
        "Campanha fictícia para demonstração da plataforma. Não existe arrecadação ou local de entrega real.",
      items: [
        "Roupas adultas e calçados",
        "Roupas infantis e de bebê",
        "Agasalhos e cobertores",
      ][i],
      instructions: "Não realizar entregas: campanha de demonstração.",
      startDate: new Date("2026-01-01T00:00:00-03:00"),
      endDate: new Date(
        (i === 2 ? "2026-08-31" : "2027-12-31") + "T23:59:59-03:00",
      ),
      isDemo: true,
      status: "APPROVED",
    },
  });
await db.$disconnect();
console.log("Seed pronto: 12 pontos fictícios e 3 contas locais.");
