import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { z, ZodError } from "zod";
import { db } from "./db.js";
import {
  register,
  pointInput,
  campaignInput,
  reviewInput,
} from "./validators.js";
export const app = express();
// Vercel is the trusted reverse proxy immediately in front of this function.
if (process.env.VERCEL) app.set("trust proxy", 1);
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (process.env.VERCEL && !process.env.DATABASE_URL) {
    res.status(503).json({
      error:
        "Serviço temporariamente indisponível. O banco de dados ainda precisa ser conectado.",
      code: "DATABASE_NOT_CONFIGURED",
    });
    return;
  }
  next();
});
// Cada origem é explícita: Render recebe a sua URL HTTPS via variável própria.
// Se o frontend estiver na Vercel, informe também APP_ORIGINS no backend.
const allowedOrigins = new Set(
  [
    process.env.APP_ORIGIN,
    process.env.RENDER_EXTERNAL_URL,
    ...(process.env.VERCEL
      ? [
          process.env.VERCEL_URL,
          process.env.VERCEL_PROJECT_PRODUCTION_URL,
          process.env.VERCEL_BRANCH_URL,
        ]
          .filter(Boolean)
          .map((host) => `https://${host}`)
      : []),
    ...(process.env.APP_ORIGINS || "").split(","),
    ...(process.env.NODE_ENV !== "production"
      ? ["http://localhost:5173", "http://localhost:3001"]
      : []),
  ]
    .map((value) => value?.trim().replace(/\/$/, ""))
    .filter((value): value is string => Boolean(value)),
);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Necessário quando o frontend completo é servido pela Render:
        // Maps JavaScript API carrega scripts, imagens e chamadas externas.
        scriptSrc: [
          "'self'",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.tile.openstreetmap.org",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://*.google.com",
          "https://*.googleapis.com",
          "https://*.gstatic.com",
          "https://*.ggpht.com",
        ],
        connectSrc: [
          "'self'",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://*.googleapis.com",
        ],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        frameSrc: ["https://www.google.com"],
        upgradeInsecureRequests:
          process.env.NODE_ENV === "production" ? [] : null,
      },
    },
  }),
);
app.use(express.json({ limit: "100kb" }), cookieParser());
const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
const fail = (code: number, message: string) => {
  throw Object.assign(new Error(message), { status: code });
};
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const safeUser = (u: any) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});
const includePoint = {
  institution: true,
  categories: { include: { category: true } },
  hours: true,
};
const published = { status: "APPROVED", institution: { status: "APPROVED" } };
const publicCampaign = {
  approved: true,
  status: { in: ["APPROVED", "CLOSED"] },
  institution: { status: "APPROVED" },
  point: published,
};
const contains = (value: string): any => ({
  contains: value,
  ...(/^postgres(ql)?:/.test(process.env.DATABASE_URL || "")
    ? { mode: "insensitive" }
    : {}),
});
const pagination = (q: any) => ({
  take: 12,
  skip: (Math.max(1, Number(q.page) || 1) - 1) * 12,
});
app.use(
  wrap(async (req, res, next) => {
    const token = req.cookies.sid;
    const session = token
      ? await db.session.findUnique({
          where: { id: hash(token) },
          include: { user: true },
        })
      : null;
    if (session && session.expiresAt > new Date()) {
      res.locals.user = session.user;
      res.locals.session = session;
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.headers.origin && !allowedOrigins.has(req.headers.origin))
        fail(403, "Origem não permitida");
      if (res.locals.user && req.headers["x-csrf-token"] !== session?.csrf)
        fail(403, "Token de segurança inválido. Atualize a página.");
    }
    next();
  }),
);
const auth = (req: Request, res: Response, next: NextFunction) =>
  res.locals.user
    ? next()
    : res.status(401).json({ error: "Entre na sua conta para continuar." });
const admin = (req: Request, res: Response, next: NextFunction) =>
  res.locals.user?.role === "ADMIN"
    ? next()
    : res.status(403).json({ error: "Acesso restrito ao administrador." });
async function institution(res: Response) {
  const u = res.locals.user;
  if (u.role === "DONOR") fail(403, "Conta de instituição necessária");
  const inst = await db.institution.findUnique({ where: { ownerId: u.id } });
  if (!inst && u.role === "ADMIN")
    return db.institution.create({
      data: {
        ownerId: u.id,
        name: "Administração de cadastros",
        status: "APPROVED",
      },
    });
  if (!inst) fail(403, "Cadastre os dados institucionais");
  return inst!;
}
async function owned(
  model: "collectionPoint" | "campaign",
  id: string,
  res: Response,
) {
  const item = await (db[model] as any).findUnique({
    where: { id },
    include: { institution: true },
  });
  if (!item) fail(404, "Registro não encontrado");
  if (
    res.locals.user.role !== "ADMIN" &&
    item.institution.ownerId !== res.locals.user.id
  )
    fail(403, "Este registro pertence a outra conta");
  return item;
}
async function publicPoint(id: string) {
  const p = await db.collectionPoint.findFirst({
    where: { id, ...published },
    include: includePoint,
  });
  if (!p) fail(404, "Ponto não encontrado ou não publicado");
  return p!;
}
async function newSession(res: Response, u: any) {
  const token = randomBytes(32).toString("hex");
  const csrf = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      id: hash(token),
      csrf,
      userId: u.id,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  res.cookie("sid", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 86400000,
    path: "/",
  });
  return { user: safeUser(u), csrf };
}
const loginLimiter = rateLimit({
  windowMs: 15 * 60000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
});
app.post(
  "/api/auth/register",
  loginLimiter,
  wrap(async (req, res) => {
    const data = register.parse(req.body);
    const u = await db.user.create({
      data: {
        ...data,
        password: await bcrypt.hash(data.password, 12),
        ...(data.role === "INSTITUTION"
          ? { institution: { create: { name: data.name } } }
          : {}),
      },
    });
    res.status(201).json(await newSession(res, u));
  }),
);
app.post(
  "/api/auth/login",
  loginLimiter,
  wrap(async (req, res) => {
    const data = z
      .object({ email: z.string().email(), password: z.string().max(72) })
      .parse(req.body);
    const u = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (!u || !(await bcrypt.compare(data.password, u.password)))
      fail(401, "E-mail ou senha inválidos");
    if (res.locals.session)
      await db.session.delete({ where: { id: res.locals.session.id } });
    res.json(await newSession(res, u));
  }),
);
app.get(
  "/api/auth/me",
  wrap(async (req, res) => {
    res.json({
      user: res.locals.user ? safeUser(res.locals.user) : null,
      csrf: res.locals.session?.csrf || null,
    });
  }),
);
app.post(
  "/api/auth/logout",
  auth,
  wrap(async (req, res) => {
    await db.session.delete({ where: { id: res.locals.session.id } });
    res.clearCookie("sid", { path: "/" });
    res.json({ ok: true });
  }),
);
app.patch(
  "/api/profile",
  auth,
  wrap(async (req, res) => {
    const data = z
      .object({ name: z.string().trim().min(2).max(100) })
      .strict()
      .parse(req.body);
    res.json(
      safeUser(
        await db.user.update({ where: { id: res.locals.user.id }, data }),
      ),
    );
  }),
);
app.get(
  "/api/categories",
  wrap(async (req, res) => {
    res.json(await db.clothingCategory.findMany());
  }),
);
app.get(
  "/api/points",
  wrap(async (req, res) => {
    const q = String(req.query.q || "").slice(0, 200);
    const cats = String(req.query.categories || "")
      .split(",")
      .filter(Boolean);
    const where: any = {
      ...published,
      isDemo: req.query.mode === "demo",
      AND: [
        ...(q
          ? [
              {
                OR: ["name", "city", "neighborhood", "street"]
                  .map((k) => ({ [k]: contains(q) }))
                  .concat([{ institution: { name: contains(q) } }] as any),
              },
            ]
          : []),
        ...cats.map((categoryId) => ({ categories: { some: { categoryId } } })),
      ],
      ...(req.query.city ? { city: contains(String(req.query.city)) } : {}),
      ...(req.query.neighborhood
        ? { neighborhood: contains(String(req.query.neighborhood)) }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.collectionPoint.findMany({
        where,
        include: includePoint,
        ...pagination(req.query),
        orderBy: { name: "asc" },
      }),
      db.collectionPoint.count({ where }),
    ]);
    res.json({
      items,
      total,
      page: Math.max(1, Number(req.query.page) || 1),
      pages: Math.ceil(total / 12),
    });
  }),
);
app.get(
  "/api/points/:id",
  wrap(async (req, res) => {
    res.json(await publicPoint(req.params.id));
  }),
);
app.post(
  "/api/points",
  auth,
  wrap(async (req, res) => {
    const inst = await institution(res);
    const { categories, hours, ...data } = pointInput.parse(req.body);
    res.status(201).json(
      await db.collectionPoint.create({
        data: {
          ...data,
          verifiedAt: null,
          source: data.source,
          institutionId: inst.id,
          categories: {
            create: categories.map((categoryId) => ({ categoryId })),
          },
          hours: { create: hours },
        },
      }),
    );
  }),
);
app.patch(
  "/api/points/:id",
  auth,
  wrap(async (req, res) => {
    await owned("collectionPoint", req.params.id, res);
    const { categories, hours, ...data } = pointInput.parse(req.body);
    res.json(
      await db.collectionPoint.update({
        where: { id: req.params.id },
        data: {
          ...data,
          verifiedAt: null,
          status: "PENDING",
          campaigns: {
            updateMany: {
              where: {},
              data: { approved: false, status: "PENDING", isDemo: data.isDemo },
            },
          },
          categories: {
            deleteMany: {},
            create: categories.map((categoryId) => ({ categoryId })),
          },
          hours: { deleteMany: {}, create: hours },
        },
      }),
    );
  }),
);
app.delete(
  "/api/points/:id",
  auth,
  wrap(async (req, res) => {
    await owned("collectionPoint", req.params.id, res);
    await db.collectionPoint.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);
app.get(
  "/api/institution",
  auth,
  wrap(async (req, res) => {
    res.json(await institution(res));
  }),
);
app.patch(
  "/api/institution",
  auth,
  wrap(async (req, res) => {
    const inst = await institution(res);
    const data = z
      .object({
        name: z.string().min(2).max(150),
        description: z.string().max(4000),
      })
      .strict()
      .parse(req.body);
    res.json(
      await db.institution.update({
        where: { id: inst.id },
        data: { ...data, status: "PENDING" },
      }),
    );
  }),
);
app.get(
  "/api/manage/points",
  auth,
  wrap(async (req, res) => {
    const where =
      res.locals.user.role === "ADMIN"
        ? {}
        : { institution: { ownerId: res.locals.user.id } };
    res.json(
      await db.collectionPoint.findMany({
        where,
        include: includePoint,
        orderBy: { createdAt: "desc" },
      }),
    );
  }),
);
app.get(
  "/api/manage/campaigns",
  auth,
  wrap(async (req, res) => {
    res.json(
      await db.campaign.findMany({
        where:
          res.locals.user.role === "ADMIN"
            ? {}
            : { institution: { ownerId: res.locals.user.id } },
        include: { point: true, institution: true },
      }),
    );
  }),
);
const campaignState = (c: any) => ({
  ...c,
  phase:
    c.status === "CLOSED" || new Date(c.endDate) < new Date()
      ? "Encerrada"
      : new Date(c.startDate) > new Date()
        ? "Em breve"
        : "Em andamento",
});
app.get(
  "/api/campaigns",
  wrap(async (req, res) => {
    const where = { ...publicCampaign, isDemo: req.query.mode === "demo" };
    const [items, total] = await Promise.all([
      db.campaign.findMany({
        where,
        include: { point: true, institution: true },
        ...pagination(req.query),
      }),
      db.campaign.count({ where }),
    ]);
    res.json({
      items: items.map(campaignState),
      total,
      pages: Math.ceil(total / 12),
    });
  }),
);
app.get(
  "/api/campaigns/:id",
  wrap(async (req, res) => {
    const c = await db.campaign.findFirst({
      where: { id: req.params.id, ...publicCampaign },
      include: { point: true, institution: true },
    });
    if (!c) fail(404, "Campanha não encontrada");
    res.json(campaignState(c));
  }),
);
app.post(
  "/api/campaigns",
  auth,
  wrap(async (req, res) => {
    const inst = await institution(res);
    const data = campaignInput.parse(req.body);
    const point = await owned("collectionPoint", data.pointId, res);
    if (point.institutionId !== inst.id)
      fail(403, "Ponto deve pertencer à instituição");
    res.status(201).json(
      await db.campaign.create({
        data: { ...data, institutionId: inst.id, isDemo: point.isDemo },
      }),
    );
  }),
);
app.patch(
  "/api/campaigns/:id",
  auth,
  wrap(async (req, res) => {
    const c = await owned("campaign", req.params.id, res);
    if (req.body.status === "CLOSED" && Object.keys(req.body).length === 1) {
      res.json(
        await db.campaign.update({
          where: { id: c.id },
          data: { status: "CLOSED" },
        }),
      );
      return;
    }
    const data = campaignInput.parse(req.body);
    const p = await owned("collectionPoint", data.pointId, res);
    if (p.institutionId !== c.institutionId)
      fail(403, "Ponto de outra instituição");
    res.json(
      await db.campaign.update({
        where: { id: c.id },
        data: { ...data, approved: false, isDemo: p.isDemo },
      }),
    );
  }),
);
app.delete(
  "/api/campaigns/:id",
  auth,
  wrap(async (req, res) => {
    await owned("campaign", req.params.id, res);
    await db.campaign.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);
app.get(
  "/api/favorites",
  auth,
  wrap(async (req, res) => {
    res.json(
      await db.favorite.findMany({
        where: { userId: res.locals.user.id, point: published },
        include: { point: { include: includePoint } },
      }),
    );
  }),
);
app.post(
  "/api/favorites",
  auth,
  wrap(async (req, res) => {
    const { pointId } = z.object({ pointId: z.string() }).parse(req.body);
    await publicPoint(pointId);
    const userId = res.locals.user.id;
    res.json(
      await db.favorite.upsert({
        where: { userId_pointId: { userId, pointId } },
        update: {},
        create: { userId, pointId },
      }),
    );
  }),
);
app.delete(
  "/api/favorites/:pointId",
  auth,
  wrap(async (req, res) => {
    await db.favorite.deleteMany({
      where: { userId: res.locals.user.id, pointId: req.params.pointId },
    });
    res.json({ ok: true });
  }),
);
app.get(
  "/api/points/:id/reviews",
  wrap(async (req, res) => {
    await publicPoint(req.params.id);
    res.json(
      await db.review.findMany({
        where: { pointId: req.params.id, hidden: false },
        include: { user: { select: { name: true } } },
        ...pagination(req.query),
        orderBy: { createdAt: "desc" },
      }),
    );
  }),
);
app.get(
  "/api/reviews/mine",
  auth,
  wrap(async (req, res) => {
    res.json(
      await db.review.findMany({
        where: { userId: res.locals.user.id },
        include: { point: true },
      }),
    );
  }),
);
app.post(
  "/api/points/:id/reviews",
  auth,
  wrap(async (req, res) => {
    await publicPoint(req.params.id);
    const data = reviewInput.parse(req.body);
    res.status(201).json(
      await db.review.create({
        data: { ...data, userId: res.locals.user.id, pointId: req.params.id },
      }),
    );
  }),
);
app.patch(
  "/api/reviews/:id",
  auth,
  wrap(async (req, res) => {
    const data = reviewInput.parse(req.body);
    const r = await db.review.findUnique({ where: { id: req.params.id } });
    if (r?.userId !== res.locals.user.id)
      fail(403, "Avaliação pertence a outra conta");
    res.json(await db.review.update({ where: { id: req.params.id }, data }));
  }),
);
app.delete(
  "/api/reviews/:id",
  auth,
  wrap(async (req, res) => {
    const r = await db.review.findUnique({ where: { id: req.params.id } });
    if (r?.userId !== res.locals.user.id)
      fail(403, "Avaliação pertence a outra conta");
    await db.review.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);
app.post(
  "/api/points/:id/reports",
  auth,
  wrap(async (req, res) => {
    await publicPoint(req.params.id);
    const data = z
      .object({
        reason: z.enum([
          "Endereço incorreto",
          "Horário incorreto",
          "Local não recebe doações",
          "Telefone incorreto",
          "Outros problemas",
        ]),
        description: z.string().min(5).max(2000),
      })
      .parse(req.body);
    res.status(201).json(
      await db.informationReport.create({
        data: { ...data, pointId: req.params.id, userId: res.locals.user.id },
      }),
    );
  }),
);
app.post(
  "/api/reviews/:id/reports",
  auth,
  wrap(async (req, res) => {
    const { reason } = z
      .object({ reason: z.string().min(5).max(500) })
      .parse(req.body);
    const r = await db.review.findUnique({ where: { id: req.params.id } });
    if (!r || r.hidden) fail(404, "Avaliação indisponível");
    await publicPoint(r!.pointId);
    res.status(201).json(
      await db.reviewReport.create({
        data: { reason, reviewId: req.params.id, userId: res.locals.user.id },
      }),
    );
  }),
);
app.use("/api/admin", auth, admin);
app.get(
  "/api/admin/overview",
  wrap(async (req, res) => {
    const [users, institutions, points, campaigns, reports, reviewReports] =
      await Promise.all([
        db.user.count(),
        db.institution.findMany(),
        db.collectionPoint.findMany(),
        db.campaign.count(),
        db.informationReport.findMany({ include: { point: true } }),
        db.reviewReport.findMany({
          include: {
            review: { include: { user: { select: { name: true } } } },
          },
        }),
      ]);
    res.json({
      metrics: {
        Usuários: users,
        "Instituições pendentes": institutions.filter(
          (i) => i.status === "PENDING",
        ).length,
        "Instituições aprovadas": institutions.filter(
          (i) => i.status === "APPROVED",
        ).length,
        "Pontos aprovados": points.filter((p) => p.status === "APPROVED")
          .length,
        "Pontos em revisão": points.filter((p) => p.status === "PENDING")
          .length,
        Campanhas: campaigns,
        "Relatos pendentes": reports.filter((r) => r.status === "PENDING")
          .length,
        "Avaliações denunciadas": reviewReports.filter(
          (r) => r.status === "PENDING",
        ).length,
      },
      institutions,
      reports,
      reviewReports,
    });
  }),
);
app.patch(
  "/api/admin/:kind/:id",
  wrap(async (req, res) => {
    const { kind, id } = req.params;
    const { status, source, verifiedAt } = z
      .object({
        status: z.enum(["APPROVED", "REJECTED", "RESOLVED", "HIDDEN"]),
        source: z.string().url().optional(),
        verifiedAt: z.string().datetime().optional(),
      })
      .parse(req.body);
    if (
      ["institutions", "points", "campaigns"].includes(kind) &&
      !["APPROVED", "REJECTED"].includes(status)
    )
      fail(400, "Situação inválida");
    if (kind === "institutions")
      res.json(
        await db.institution.update({ where: { id }, data: { status } }),
      );
    else if (kind === "points") {
      const p = await db.collectionPoint.findUnique({
        where: { id },
        include: { institution: true },
      });
      if (!p) fail(404, "Ponto não encontrado");
      if (status === "APPROVED") {
        if (p!.institution.status !== "APPROVED")
          fail(400, "Aprove primeiro a instituição");
        if (
          !p!.isDemo &&
          (!source ||
            !/^https?:\/\//.test(source) ||
            !verifiedAt ||
            new Date(verifiedAt) > new Date())
        )
          fail(
            400,
            "Ponto real exige fonte oficial e data de confirmação válida",
          );
      }
      res.json(
        await db.collectionPoint.update({
          where: { id },
          data: {
            status,
            ...(status === "APPROVED" && !p!.isDemo
              ? { source, verifiedAt }
              : {}),
          },
        }),
      );
    } else if (kind === "campaigns") {
      const c = await db.campaign.findUnique({
        where: { id },
        include: { point: true, institution: true },
      });
      if (!c) fail(404, "Campanha inexistente");
      if (
        status === "APPROVED" &&
        (c!.point.status !== "APPROVED" || c!.institution.status !== "APPROVED")
      )
        fail(400, "Aprove instituição e ponto primeiro");
      res.json(
        await db.campaign.update({
          where: { id },
          data: { status, approved: status === "APPROVED" },
        }),
      );
    } else if (kind === "reports") {
      if (status !== "RESOLVED") fail(400, "Situação inválida");
      res.json(
        await db.informationReport.update({ where: { id }, data: { status } }),
      );
    } else if (kind === "review-reports") {
      if (!["HIDDEN", "RESOLVED"].includes(status))
        fail(400, "Situação inválida");
      res.json(
        await db.$transaction(async (tx) => {
          const r = await tx.reviewReport.update({
            where: { id },
            data: { status: "RESOLVED" },
          });
          if (status === "HIDDEN")
            await tx.review.update({
              where: { id: r.reviewId },
              data: { hidden: true },
            });
          return r;
        }),
      );
    } else fail(404, "Recurso inválido");
  }),
);
app.get(
  "/api/health",
  wrap(async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  }),
);
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Rota não encontrada" }),
);
// No deploy Render, process.cwd() é a raiz do monorepo; no desenvolvimento
// local, pode ser a pasta backend. Resolva ambos sem acessar fora do projeto.
const frontendDistFromRoot = resolve(process.cwd(), "frontend/dist");
const frontendDist = existsSync(frontendDistFromRoot)
  ? frontendDistFromRoot
  : resolve(process.cwd(), "../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (_req, res) => res.sendFile(resolve(frontendDist, "index.html")));
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: err.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    });
    return;
  }
  const code =
    err.status ||
    (err.code === "P2002"
      ? 409
      : err.code === "P2025"
        ? 404
        : err.code === "P2003"
          ? 400
          : 500);
  if (code === 500) console.error(err);
  res.status(code).json({
    error:
      code === 500
        ? "Erro interno. Tente novamente."
        : err.code === "P2002"
          ? "Registro já existe (e-mail ou avaliação duplicada)."
          : err.code
            ? "Registro inválido ou inexistente."
            : err.message,
  });
});
