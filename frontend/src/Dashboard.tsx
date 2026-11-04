import { useContext, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Auth, Field, Notice, State, useData, PointCard, Demo } from "./App";
import { api } from "./api";
import Map from "./Map";
import { Plus, LogOut } from "lucide-react";
const statusName: Record<string, string> = {
  APPROVED: "Aprovado",
  PENDING: "Em revisão",
  REJECTED: "Rejeitado",
  CLOSED: "Encerrada",
  RESOLVED: "Resolvido",
};
export default function Dashboard() {
  const { user, loading, refresh } = useContext(Auth);
  const [tab, setTab] = useState("overview");
  const nav = useNavigate();
  if (loading) return <p className="empty">Carregando conta…</p>;
  if (!user) return <Navigate to="/entrar" />;
  const tabs = [
    ["overview", "Visão geral"],
    ["profile", "Dados pessoais"],
    ["favorites", "Pontos favoritos"],
    ["reviews", "Minhas avaliações"],
    ...(user.role !== "DONOR"
      ? [
          ["points", "Pontos de coleta"],
          ["campaigns", "Minhas campanhas"],
        ]
      : []),
    ...(user.role !== "DONOR" ? [["institution", "Minha instituição"]] : []),
    ...(user.role === "ADMIN" ? [["admin", "Administração"]] : []),
  ];
  return (
    <section className="dashboard">
      <aside>
        <p className="eyebrow">SEU ESPAÇO</p>
        <h2>Olá, {user.name.split(" ")[0]}.</h2>
        {tabs.map(([id, title]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {title}
          </button>
        ))}
        <button
          onClick={async () => {
            await api("/auth/logout", "POST");
            await refresh();
            nav("/");
          }}
        >
          <LogOut size={16} /> Sair da conta
        </button>
      </aside>
      <div className="dashboard-content" key={tab}>
        {tab === "overview" ? (
          <>
            <p className="eyebrow">CUIDADO EM MOVIMENTO</p>
            <h1 className="page-title">Cada conexão importa.</h1>
            <p>
              Acompanhe seus favoritos, mantenha seu perfil atualizado e
              participe da comunidade.
            </p>
            <div className="panel">
              <h2>Próximo passo</h2>
              <p>
                {user.role === "DONOR"
                  ? "Encontre um ponto e confira as condições para doar."
                  : "Cadastre um ponto. Ele passará por revisão antes de aparecer publicamente."}
              </p>
              <Link className="button" to="/pontos">
                Explorar pontos
              </Link>
            </div>
          </>
        ) : tab === "profile" ? (
          <Profile />
        ) : tab === "favorites" ? (
          <Favorites />
        ) : tab === "reviews" ? (
          <Reviews />
        ) : tab === "institution" ? (
          <Institution />
        ) : tab === "admin" ? (
          <Admin />
        ) : (
          <Manage kind={tab} />
        )}
      </div>
    </section>
  );
}
function Profile() {
  const { user, refresh } = useContext(Auth);
  const [message, setMessage] = useState("");
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api(
            "/profile",
            "PATCH",
            Object.fromEntries(new FormData(e.currentTarget)),
          );
          await refresh();
          setMessage("Perfil atualizado.");
        } catch (e: any) {
          setMessage(e.message);
        }
      }}
    >
      <h1>Dados pessoais</h1>
      <Field label="Nome">
        <input name="name" defaultValue={user.name} required minLength={2} />
      </Field>
      <Field label="E-mail de acesso">
        <input value={user.email} readOnly />
      </Field>
      <p className="small">
        O e-mail é o identificador da conta e não pode ser alterado por este
        formulário.
      </p>
      <button>Salvar alterações</button>
      <Notice message={message} />
    </form>
  );
}
function Favorites() {
  const { data, error, reload } = useData("/favorites");
  const [message, setMessage] = useState("");
  return (
    <>
      <h1>Meus favoritos</h1>
      <State data={data} error={error} />
      <Notice message={message} />
      {data?.length === 0 && (
        <p className="empty">Salve um ponto para encontrá-lo aqui.</p>
      )}
      <div className="grid two">
        {data?.map((f: any) => (
          <div key={f.pointId}>
            <PointCard p={f.point} />
            <button
              className="text-button"
              onClick={() =>
                api("/favorites/" + f.pointId, "DELETE")
                  .then(reload)
                  .catch((e) => setMessage(e.message))
              }
            >
              Remover dos favoritos
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
function Reviews() {
  const { data, error, reload } = useData("/reviews/mine");
  const [message, setMessage] = useState("");
  return (
    <>
      <h1>Minhas avaliações</h1>
      <State data={data} error={error} />
      <Notice message={message} />
      {data?.length === 0 && (
        <p className="empty">Você ainda não publicou avaliações.</p>
      )}
      {data?.map((r: any) => (
        <form
          className="panel"
          key={r.id}
          onSubmit={async (e) => {
            e.preventDefault();
            const d = Object.fromEntries(new FormData(e.currentTarget));
            try {
              await api("/reviews/" + r.id, "PATCH", {
                rating: Number(d.rating),
                comment: d.comment,
              });
              setMessage("Avaliação atualizada.");
              reload();
            } catch (e: any) {
              setMessage(e.message);
            }
          }}
        >
          <Demo demo={r.point.isDemo} />
          <h3>{r.point.name}</h3>
          {r.hidden && <p>Ocultada pela moderação.</p>}
          <Field label="Nota">
            <select name="rating" defaultValue={r.rating}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field label="Comentário">
            <textarea
              name="comment"
              defaultValue={r.comment}
              minLength={3}
              maxLength={2000}
              required
            />
          </Field>
          <div className="actions">
            <button>Salvar</button>
            <button
              type="button"
              className="danger"
              onClick={() => {
                if (confirm("Excluir esta avaliação?"))
                  api("/reviews/" + r.id, "DELETE")
                    .then(reload)
                    .catch((e) => setMessage(e.message));
              }}
            >
              Excluir
            </button>
          </div>
        </form>
      ))}
    </>
  );
}
function Institution() {
  const { data, error, reload } = useData("/institution");
  const [message, setMessage] = useState("");
  return (
    <>
      <h1>Minha instituição</h1>
      <State data={data} error={error} />
      {data && (
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api(
                "/institution",
                "PATCH",
                Object.fromEntries(new FormData(e.currentTarget)),
              );
              setMessage("Informações enviadas para revisão.");
              reload();
            } catch (e: any) {
              setMessage(e.message);
            }
          }}
        >
          <p>Situação: {statusName[data.status]}</p>
          <Field label="Nome oficial">
            <input required name="name" defaultValue={data.name} />
          </Field>
          <Field label="Descrição">
            <textarea name="description" defaultValue={data.description} />
          </Field>
          <p>
            Alterações institucionais retornam à revisão e suspendem a exibição
            pública dos pontos até aprovação.
          </p>
          <button>Salvar e enviar para revisão</button>
        </form>
      )}
      <Notice message={message} />
    </>
  );
}
function Manage({ kind }: { kind: string }) {
  const { data, error, reload } = useData("/manage/" + kind);
  const [editing, setEditing] = useState<any>(null),
    [message, setMessage] = useState(""),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("");
  return (
    <>
      <div className="section-title">
        <h1>{kind === "points" ? "Pontos de coleta" : "Campanhas"}</h1>
        <button onClick={() => setEditing({})}>
          <Plus size={18} /> Criar {kind === "points" ? "ponto" : "campanha"}
        </button>
      </div>
      <div className="filters">
        <input
          aria-label="Pesquisar registros"
          placeholder="Pesquisar nome"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="Filtrar situação"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">Todas as situações</option>
          {Object.entries(statusName).map(([v, n]) => (
            <option key={v} value={v}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <Notice message={message} />
      {editing &&
        (kind === "points" ? (
          <PointForm
            item={editing}
            done={() => {
              setEditing(null);
              reload();
              setMessage("Ponto salvo e enviado para revisão.");
            }}
            cancel={() => setEditing(null)}
          />
        ) : (
          <CampaignForm
            item={editing}
            done={() => {
              setEditing(null);
              reload();
              setMessage("Campanha salva.");
            }}
            cancel={() => setEditing(null)}
          />
        ))}
      <State data={data} error={error} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Registro</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {data
              ?.filter(
                (p: any) =>
                  (p.name || p.title).toLowerCase().includes(q.toLowerCase()) &&
                  (!filter || p.status === filter),
              )
              .map((p: any) => (
                <tr key={p.id}>
                  <td>
                    <Demo demo={p.isDemo} />
                    <strong>{p.name || p.title}</strong>
                    <span>{p.city || p.point?.city}</span>
                  </td>
                  <td>{statusName[p.status]}</td>
                  <td>
                    <div className="actions">
                      <button className="outline" onClick={() => setEditing(p)}>
                        Editar
                      </button>
                      {kind === "campaigns" && p.status !== "CLOSED" && (
                        <button
                          className="outline"
                          onClick={() =>
                            api("/campaigns/" + p.id, "PATCH", {
                              status: "CLOSED",
                            })
                              .then(reload)
                              .catch((e) => setMessage(e.message))
                          }
                        >
                          Encerrar
                        </button>
                      )}
                      <button
                        className="danger"
                        onClick={() => {
                          if (confirm("Excluir este registro e seus vínculos?"))
                            api("/" + kind + "/" + p.id, "DELETE")
                              .then(reload)
                              .catch((e) => setMessage(e.message));
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {data?.length === 0 && (
        <p className="empty">Nenhum registro cadastrado.</p>
      )}
    </>
  );
}
const fields = [
  ["name", "Nome do ponto"],
  ["description", "Descrição"],
  ["state", "UF"],
  ["city", "Cidade"],
  ["neighborhood", "Bairro"],
  ["street", "Rua"],
  ["number", "Número"],
  ["complement", "Complemento"],
  ["zip", "CEP"],
  ["phone", "Telefone"],
  ["email", "E-mail"],
  ["website", "Site oficial"],
  ["source", "Fonte oficial para verificação"],
  ["restrictions", "O que não é aceito"],
  ["instructions", "Orientações para entrega"],
];
function PointForm({
  item,
  done,
  cancel,
}: {
  item: any;
  done: () => void;
  cancel: () => void;
}) {
  const cats = useData("/categories");
  const [lat, setLat] = useState(item.latitude ?? -23.55),
    [lng, setLng] = useState(item.longitude ?? -46.63),
    [message, setMessage] = useState("");
  const [hours, setHours] = useState<any[]>(item.hours || []);
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(f);
        data.categories = f.getAll("categories");
        data.latitude = lat;
        data.longitude = lng;
        data.isDemo = f.get("isDemo") === "on";
        data.hours = hours.map(({ day, opens, closes }) => ({
          day,
          opens,
          closes,
        }));
        data.verifiedAt = null;
        try {
          await api(
            "/points" + (item.id ? "/" + item.id : ""),
            item.id ? "PATCH" : "POST",
            data,
          );
          done();
        } catch (e: any) {
          setMessage(e.message);
        }
      }}
    >
      <h2>{item.id ? "Editar ponto" : "Cadastrar ponto"}</h2>
      <p>
        Salvamentos retornam à revisão. Pontos reais precisam de fonte e
        confirmação administrativa.
      </p>
      <div className="grid two">
        {fields.map(([name, label]) => (
          <Field label={label} key={name}>
            {["description", "restrictions", "instructions"].includes(name) ? (
              <textarea
                name={name}
                defaultValue={item[name] || ""}
                required={name === "description"}
                minLength={name === "description" ? 10 : undefined}
              />
            ) : (
              <input
                name={name}
                defaultValue={item[name] || ""}
                required={[
                  "name",
                  "state",
                  "city",
                  "neighborhood",
                  "street",
                  "number",
                ].includes(name)}
                maxLength={name === "state" ? 2 : undefined}
                type={
                  ["website", "source"].includes(name)
                    ? "url"
                    : name === "email"
                      ? "email"
                      : "text"
                }
              />
            )}
          </Field>
        ))}
      </div>
      <label className="check">
        <input
          type="checkbox"
          name="isDemo"
          defaultChecked={item.isDemo ?? true}
        />{" "}
        Este é um local fictício de demonstração
      </label>
      <fieldset>
        <legend>Categorias aceitas (selecione ao menos uma)</legend>
        <div className="check-grid">
          {cats.data?.map((c: any) => (
            <label className="check" key={c.id}>
              <input
                type="checkbox"
                name="categories"
                value={c.id}
                defaultChecked={item.categories?.some(
                  (x: any) => x.categoryId === c.id,
                )}
              />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      <h3>Horários semanais</h3>
      {[
        "Domingo",
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
      ].map((day, i) => {
        const h = hours.find((h) => h.day === i);
        return (
          <div className="hours-row" key={i}>
            <label className="check">
              <input
                type="checkbox"
                checked={!!h}
                onChange={(e) =>
                  setHours(
                    e.target.checked
                      ? [...hours, { day: i, opens: "09:00", closes: "17:00" }]
                      : hours.filter((x) => x.day !== i),
                  )
                }
              />
              {day}
            </label>
            {h && (
              <>
                <input
                  aria-label={"Abertura " + day}
                  type="time"
                  value={h.opens}
                  onChange={(e) =>
                    setHours(
                      hours.map((x) =>
                        x.day === i ? { ...x, opens: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label={"Fechamento " + day}
                  type="time"
                  value={h.closes}
                  onChange={(e) =>
                    setHours(
                      hours.map((x) =>
                        x.day === i ? { ...x, closes: e.target.value } : x,
                      ),
                    )
                  }
                />
              </>
            )}
          </div>
        );
      })}
      <h3>Localização no mapa</h3>
      <p>Clique para posicionar o marcador ou preencha as coordenadas.</p>
      <div className="grid two">
        <Field label="Latitude">
          <input
            type="number"
            step="any"
            value={lat}
            min={-90}
            max={90}
            onChange={(e) => setLat(Number(e.target.value))}
          />
        </Field>
        <Field label="Longitude">
          <input
            type="number"
            step="any"
            value={lng}
            min={-180}
            max={180}
            onChange={(e) => setLng(Number(e.target.value))}
          />
        </Field>
      </div>
      <Map
        items={[
          {
            id: "pin",
            name: "Local selecionado",
            latitude: lat,
            longitude: lng,
          },
        ]}
        onPick={(a, b) => {
          setLat(a);
          setLng(b);
        }}
      />
      <Notice message={message} />
      <div className="actions">
        <button>Salvar e enviar para revisão</button>
        <button type="button" className="outline" onClick={cancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
function CampaignForm({
  item,
  done,
  cancel,
}: {
  item: any;
  done: () => void;
  cancel: () => void;
}) {
  const points = useData("/manage/points");
  const [message, setMessage] = useState("");
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        const d: any = Object.fromEntries(new FormData(e.currentTarget));
        d.startDate = new Date(d.startDate + "T00:00:00-03:00").toISOString();
        d.endDate = new Date(d.endDate + "T23:59:59-03:00").toISOString();
        try {
          await api(
            "/campaigns" + (item.id ? "/" + item.id : ""),
            item.id ? "PATCH" : "POST",
            d,
          );
          done();
        } catch (e: any) {
          setMessage(e.message);
        }
      }}
    >
      <h2>{item.id ? "Editar campanha" : "Nova campanha"}</h2>
      {[
        ["title", "Título"],
        ["description", "Descrição"],
        ["items", "Itens necessários"],
        ["instructions", "Orientações"],
      ].map(([k, v]) => (
        <Field key={k} label={v}>
          <textarea
            name={k}
            required
            defaultValue={item[k] || ""}
            minLength={k === "description" ? 10 : 1}
          />
        </Field>
      ))}
      <Field label="Ponto de entrega">
        <select name="pointId" required defaultValue={item.pointId}>
          {points.data
            ?.filter(
              (p: any) =>
                !item.institutionId || p.institutionId === item.institutionId,
            )
            .map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isDemo ? " (fictício)" : ""}
              </option>
            ))}
        </select>
      </Field>
      <div className="grid two">
        {[
          ["startDate", "Início"],
          ["endDate", "Término"],
        ].map(([k, v]) => (
          <Field label={v} key={k}>
            <input
              type="date"
              name={k}
              required
              defaultValue={
                item[k]
                  ? new Date(item[k]).toLocaleDateString("sv-SE", {
                      timeZone: "America/Sao_Paulo",
                    })
                  : ""
              }
            />
          </Field>
        ))}
      </div>
      <Field label="Situação">
        <select
          name="status"
          defaultValue={item.status === "CLOSED" ? "CLOSED" : "PENDING"}
        >
          <option value="PENDING">Enviar para revisão</option>
          <option value="CLOSED">Encerrar campanha</option>
        </select>
      </Field>
      <Notice message={message} />
      <div className="actions">
        <button>Salvar campanha</button>
        <button type="button" className="outline" onClick={cancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
function Admin() {
  const overview = useData("/admin/overview"),
    points = useData("/manage/points"),
    campaigns = useData("/manage/campaigns");
  const [message, setMessage] = useState(""),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("");
  const action = async (
    kind: string,
    id: string,
    status: string,
    real = false,
  ) => {
    const body: any = { status };
    if (real && status === "APPROVED") {
      const source = prompt(
        "URL da fonte oficial que confirma o recebimento de doações:",
      );
      if (!source) return;
      const date = prompt(
        "Data da verificação (AAAA-MM-DD):",
        new Date().toISOString().slice(0, 10),
      );
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        setMessage("Data inválida.");
        return;
      }
      body.source = source;
      body.verifiedAt = new Date(date).toISOString();
    }
    try {
      await api("/admin/" + kind + "/" + id, "PATCH", body);
      setMessage("Situação atualizada.");
      overview.reload();
      points.reload();
      campaigns.reload();
    } catch (e: any) {
      setMessage(e.message);
    }
  };
  return (
    <>
      <h1>Administração</h1>
      <State data={overview.data} error={overview.error} />
      <Notice message={message} />
      {overview.data && (
        <>
          <div className="metrics">
            {Object.entries(overview.data.metrics).map(([k, v]) => (
              <div key={k}>
                <strong>{String(v)}</strong>
                <span>{k}</span>
              </div>
            ))}
          </div>
          <div className="filters">
            <input
              aria-label="Pesquisar registros administrativos"
              placeholder="Pesquisar nome ou motivo"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              aria-label="Situação administrativa"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">Todas as situações</option>
              {Object.entries(statusName).map(([v, n]) => (
                <option value={v} key={v}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          {[
            ["institutions", "Instituições", overview.data.institutions],
            ["points", "Pontos de coleta", points.data],
            ["campaigns", "Campanhas", campaigns.data],
            ["reports", "Relatos de dados incorretos", overview.data.reports],
            [
              "review-reports",
              "Avaliações denunciadas",
              overview.data.reviewReports,
            ],
          ].map(([kind, title, items]: any) => (
            <section key={kind}>
              <h2>{title}</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Registro</th>
                      <th>Situação</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      ?.filter(
                        (i: any) =>
                          JSON.stringify(i)
                            .toLowerCase()
                            .includes(q.toLowerCase()) &&
                          (!filter || i.status === filter),
                      )
                      .map((i: any) => (
                        <tr key={i.id}>
                          <td>
                            {i.isDemo !== undefined && <Demo demo={i.isDemo} />}
                            <strong>{i.name || i.title || i.reason}</strong>
                            <span>{i.description || i.review?.comment}</span>
                            {i.point && (
                              <span>
                                {i.point.name}
                                {i.point.isDemo ? " — fictício" : ""}
                              </span>
                            )}
                          </td>
                          <td>{statusName[i.status] || i.status}</td>
                          <td>
                            <div className="actions">
                              {kind === "reports" ? (
                                <button
                                  onClick={() => action(kind, i.id, "RESOLVED")}
                                >
                                  Resolver
                                </button>
                              ) : kind === "review-reports" ? (
                                <>
                                  <button
                                    onClick={() => action(kind, i.id, "HIDDEN")}
                                  >
                                    Ocultar avaliação
                                  </button>
                                  <button
                                    className="outline"
                                    onClick={() =>
                                      action(kind, i.id, "RESOLVED")
                                    }
                                  >
                                    Manter
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() =>
                                      action(
                                        kind,
                                        i.id,
                                        "APPROVED",
                                        kind === "points" && !i.isDemo,
                                      )
                                    }
                                  >
                                    Aprovar
                                  </button>
                                  <button
                                    className="danger"
                                    onClick={() =>
                                      action(kind, i.id, "REJECTED")
                                    }
                                  >
                                    Rejeitar
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {items?.length === 0 && <p>Nenhum registro.</p>}
            </section>
          ))}
        </>
      )}
    </>
  );
}
