import { test, after } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { execFileSync } from "node:child_process";
import { createMocks } from "node-mocks-http";
import { app } from "../src/app.js";
import { db } from "../src/db.js";
import { pointInput, reviewInput, campaignInput } from "../src/validators.js";
let testPoint = "",
  testUser = "";
async function request(
  method: string,
  url: string,
  body: any = {},
  session?: any,
  extra: any = {},
) {
  const headers: any = { "content-type": "application/json", ...extra };
  if (session) {
    headers.cookie = session.cookie;
    headers["x-csrf-token"] = session.csrf;
  }
  const { req, res } = createMocks(
    { method: method as any, url, body, headers, ip: "127.0.0.1" },
    { eventEmitter: EventEmitter },
  );
  (req as any)._body = true;
  (req as any).cookies = undefined;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Request timeout " + url)),
      5000,
    );
    res.on("end", () => {
      clearTimeout(timer);
      resolve();
    });
    app(req as any, res as any);
  });
  let data;
  try {
    data = res._getJSONData();
  } catch {
    data = res._getData();
  }
  return {
    status: res.statusCode,
    data,
    headers: res._getHeaders(),
    cookies: res.cookies,
  };
}
async function login(email: string) {
  const r = await request("POST", "/api/auth/login", {
    email,
    password: "DemoLocal!2026",
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const cookie = "sid=" + r.cookies.sid.value;
  assert.equal(r.cookies.sid.options.httpOnly, true);
  return { cookie, csrf: r.data.csrf };
}
after(async () => {
  if (testPoint)
    await db.collectionPoint.deleteMany({ where: { id: testPoint } });
  if (testUser) await db.user.deleteMany({ where: { id: testUser } });
  await db.$disconnect();
});
test("Fluxos integrados de autenticação, aprovação, busca e persistência", async (t) => {
  let donor: any, inst: any, admin: any;
  await t.test("Login e cookie HttpOnly; rejeita senha incorreta", async () => {
    assert.equal(
      (
        await request("POST", "/api/auth/login", {
          email: "doador@demo.local",
          password: "errada",
        })
      ).status,
      401,
    );
    donor = await login("doador@demo.local");
    inst = await login("instituicao@demo.local");
    admin = await login("admin@demo.local");
  });
  await t.test("Cadastro público não pode criar administrador", async () => {
    assert.equal(
      (
        await request("POST", "/api/auth/register", {
          name: "Ataque",
          email: "ataque@demo.local",
          password: "DemoLocal!2026",
          role: "ADMIN",
        })
      ).status,
      400,
    );
  });
  await t.test(
    "Sem login, sem CSRF e origem externa são bloqueados",
    async () => {
      assert.equal(
        (await request("POST", "/api/favorites", { pointId: "demo-1" })).status,
        401,
      );
      assert.equal(
        (
          await request(
            "POST",
            "/api/favorites",
            { pointId: "demo-1" },
            { ...donor, csrf: "" },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await request(
            "POST",
            "/api/favorites",
            { pointId: "demo-1" },
            donor,
            { origin: "https://invalido.example" },
          )
        ).status,
        403,
      );
      assert.equal(
        (await request("GET", "/api/admin/overview", {}, donor)).status,
        403,
      );
    },
  );
  await t.test("Busca por cidade, bairro e categorias combinadas", async () => {
    const r = await request(
      "GET",
      "/api/points?city=São%20Paulo&neighborhood=Vila&categories=1,3",
    );
    assert.equal(r.status, 200);
    assert.equal(r.data.items[0].id, "demo-1");
    assert.ok(r.data.items.every((p: any) => p.isDemo));
    assert.equal((await request("GET", "/api/points?mode=real")).data.total, 0);
  });
  const payload = {
    name: "Ponto de teste automatizado",
    description: "Descrição de teste automatizado.",
    state: "SP",
    city: "CidadeTeste",
    neighborhood: "BairroTeste",
    street: "Local fictício",
    number: "s/n",
    latitude: -23,
    longitude: -46,
    isDemo: true,
    categories: ["1", "3"],
    hours: [{ day: 1, opens: "09:00", closes: "17:00" }],
  };
  await t.test(
    "Criação pendente, aprovação e retirada após alteração",
    async () => {
      const r = await request("POST", "/api/points", payload, inst);
      assert.equal(r.status, 201, JSON.stringify(r.data));
      testPoint = r.data.id;
      assert.equal(
        (await request("GET", "/api/points/" + testPoint)).status,
        404,
      );
      assert.equal(
        (
          await request(
            "PATCH",
            "/api/admin/points/" + testPoint,
            { status: "APPROVED" },
            admin,
          )
        ).status,
        200,
      );
      assert.equal(
        (await request("GET", "/api/points/" + testPoint)).status,
        200,
      );
      assert.equal(
        (await request("PATCH", "/api/points/" + testPoint, payload, donor))
          .status,
        403,
      );
      assert.equal(
        (await request("PATCH", "/api/points/" + testPoint, payload, inst))
          .status,
        200,
      );
      assert.equal(
        (await request("GET", "/api/points/" + testPoint)).status,
        404,
      );
      await request(
        "PATCH",
        "/api/admin/points/" + testPoint,
        { status: "APPROVED" },
        admin,
      );
    },
  );
  await t.test("Outra instituição não edita ponto alheio", async () => {
    const r = await request("POST", "/api/auth/register", {
      name: "Teste isolado",
      email: "teste-" + Date.now() + "@demo.local",
      password: "DemoLocal!2026",
      role: "INSTITUTION",
    });
    assert.equal(r.status, 201);
    testUser = r.data.user.id;
    const other = { cookie: "sid=" + r.cookies.sid.value, csrf: r.data.csrf };
    assert.equal(
      (await request("PATCH", "/api/points/" + testPoint, payload, other))
        .status,
      403,
    );
  });
  await t.test(
    "Favoritos idempotentes e persistentes em outro processo",
    async () => {
      await request("POST", "/api/favorites", { pointId: testPoint }, donor);
      await request("POST", "/api/favorites", { pointId: testPoint }, donor);
      const r = await request("GET", "/api/favorites", {}, donor);
      assert.equal(
        r.data.filter((f: any) => f.pointId === testPoint).length,
        1,
      );
      const out = execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          "import 'dotenv/config';import {PrismaClient} from '@prisma/client';const p=new PrismaClient();console.log(await p.favorite.count({where:{pointId:process.argv[1]}}));await p.$disconnect();",
          testPoint,
        ],
        { encoding: "utf8" },
      );
      assert.equal(out.trim(), "1");
    },
  );
  await t.test(
    "Avaliação única, edição, denúncia, moderação e exclusão",
    async () => {
      const r = await request(
        "POST",
        "/api/points/" + testPoint + "/reviews",
        { rating: 5, comment: "Teste de avaliação" },
        donor,
      );
      assert.equal(r.status, 201);
      const rid = r.data.id;
      assert.equal(
        (
          await request(
            "POST",
            "/api/points/" + testPoint + "/reviews",
            { rating: 5, comment: "Duplicada" },
            donor,
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await request(
            "PATCH",
            "/api/reviews/" + rid,
            { rating: 4, comment: "Comentário editado" },
            donor,
          )
        ).status,
        200,
      );
      const report = await request(
        "POST",
        "/api/reviews/" + rid + "/reports",
        { reason: "Teste de denúncia" },
        inst,
      );
      assert.equal(report.status, 201);
      await request(
        "PATCH",
        "/api/admin/review-reports/" + report.data.id,
        { status: "HIDDEN" },
        admin,
      );
      assert.equal(
        (await request("GET", "/api/points/" + testPoint + "/reviews")).data
          .length,
        0,
      );
      assert.equal(
        (await request("DELETE", "/api/reviews/" + rid, {}, donor)).status,
        200,
      );
    },
  );
  await t.test(
    "Relato chega ao administrador e pode ser resolvido",
    async () => {
      const r = await request(
        "POST",
        "/api/points/" + testPoint + "/reports",
        {
          reason: "Horário incorreto",
          description: "Horário de teste incorreto",
        },
        donor,
      );
      assert.equal(r.status, 201);
      assert.equal(
        (
          await request(
            "PATCH",
            "/api/admin/reports/" + r.data.id,
            { status: "RESOLVED" },
            admin,
          )
        ).status,
        200,
      );
    },
  );
  await t.test("Campanha respeita aprovação e encerramento", async () => {
    const body = {
      title: "Campanha teste",
      description: "Campanha fictícia de teste.",
      items: "Agasalhos",
      pointId: testPoint,
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2027-12-31T23:59:59.000Z",
    };
    const r = await request("POST", "/api/campaigns", body, inst);
    assert.equal(r.status, 201);
    assert.equal(
      (await request("GET", "/api/campaigns/" + r.data.id)).status,
      404,
    );
    await request(
      "PATCH",
      "/api/admin/campaigns/" + r.data.id,
      { status: "APPROVED" },
      admin,
    );
    assert.equal(
      (await request("GET", "/api/campaigns/" + r.data.id)).data.phase,
      "Em andamento",
    );
    await request(
      "PATCH",
      "/api/campaigns/" + r.data.id,
      { status: "CLOSED" },
      inst,
    );
    assert.equal(
      (await request("GET", "/api/campaigns/" + r.data.id)).data.phase,
      "Encerrada",
    );
  });
  await t.test("Logout invalida sessão persistida", async () => {
    assert.equal(
      (await request("POST", "/api/auth/logout", {}, donor)).status,
      200,
    );
    assert.equal(
      (await request("GET", "/api/auth/me", {}, donor)).data.user,
      null,
    );
  });
});
test("Validações de limites e integridade", () => {
  assert.equal(
    reviewInput.safeParse({ rating: 6, comment: "Teste" }).success,
    false,
  );
  assert.equal(
    reviewInput.safeParse({ rating: 2.5, comment: "Teste" }).success,
    false,
  );
  assert.equal(
    campaignInput.safeParse({
      title: "Teste",
      description: "Descrição válida",
      items: "Roupas",
      pointId: "p",
      startDate: "2027-01-01T00:00:00Z",
      endDate: "2026-01-01T00:00:00Z",
    }).success,
    false,
  );
  assert.equal(pointInput.safeParse({ latitude: 100 }).success, false);
});
