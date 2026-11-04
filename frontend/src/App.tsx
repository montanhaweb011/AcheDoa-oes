import {
  useEffect,
  useState,
  createContext,
  useContext,
  ReactNode,
  FormEvent,
} from "react";
import {
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Search,
  Heart,
  Menu,
  X,
  Shirt,
  Navigation,
  Leaf,
  Check,
  Clock,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "./api";
import Map from "./Map";
import Dashboard from "./Dashboard";
export const Auth = createContext<any>(null);
export const demoText =
  "Os pontos exibidos neste ambiente de demonstração são fictícios e não devem ser utilizados para entrega de doações.";
export function Demo({ demo }: { demo: boolean }) {
  return demo ? (
    <span className="demo-label">DEMONSTRAÇÃO — LOCAL FICTÍCIO</span>
  ) : (
    <span className="verified">
      <Check size={13} /> Cadastro aprovado
    </span>
  );
}
export function Notice({ message }: { message: string }) {
  return message ? (
    <p className="notice" role="status">
      {message}
    </p>
  ) : null;
}
export function useData(path: string) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api(path)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [path, revision]);
  return { data, error, reload: () => setRevision((r) => r + 1) };
}
export function State({ data, error }: { data: any; error: string }) {
  return error ? (
    <Notice message={error} />
  ) : !data ? (
    <p role="status" className="empty">
      Carregando…
    </p>
  ) : null;
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function PointCard({
  p,
  selected,
  onSelect,
}: {
  p: any;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const { user } = useContext(Auth);
  const [message, setMessage] = useState("");
  return (
    <article
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && e.key === "Enter" && e.target === e.currentTarget)
          onSelect(p.id);
      }}
      onClick={(e) => {
        if (onSelect && !(e.target as HTMLElement).closest("button,a"))
          onSelect(p.id);
      }}
      id={"card-" + p.id}
      className={"point-card " + (selected ? "selected" : "")}
    >
      <div className="row">
        <Demo demo={p.isDemo} />
        {user && (
          <button
            className="icon-button"
            aria-label={"Favoritar " + p.name}
            onClick={() =>
              api("/favorites", "POST", { pointId: p.id })
                .then(() => setMessage("Salvo nos favoritos."))
                .catch((e) => setMessage(e.message))
            }
          >
            <Heart size={19} />
          </button>
        )}
      </div>
      <p className="eyebrow">
        {p.city} · {p.neighborhood}
      </p>
      <h3>{p.name}</h3>
      <p className="muted">{p.institution?.name}</p>
      <p className="small">
        <MapPin size={15} /> {p.street}, {p.number}
      </p>
      <p className="small">
        <Clock size={15} />{" "}
        {p.hours?.length
          ? `${p.hours[0].opens}–${p.hours[0].closes} · consulte os dias`
          : "Horário não informado"}
      </p>
      <div className="tags">
        {p.categories?.map((c: any) => (
          <span key={c.categoryId}>{c.category.name}</span>
        ))}
      </div>
      {p.distance !== undefined && (
        <p>{p.distance.toFixed(1)} km aproximadamente</p>
      )}
      <div className="card-bottom">
        <Link to={"/pontos/" + p.id}>
          Ver detalhes <ArrowUpRight size={17} />
        </Link>
        {onSelect && (
          <button className="text-button" onClick={() => onSelect(p.id)}>
            Ver no mapa
          </button>
        )}
      </div>
      <Notice message={message} />
    </article>
  );
}
function Header() {
  const { user } = useContext(Auth);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc]);
  return (
    <header>
      <Link className="brand" to="/">
        <span className="brand-icon">
          <Shirt size={22} />
        </span>
        Ache<span>Doações</span>
        <i>®</i>
      </Link>
      <button
        className="mobile icon-button"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      <nav className={open ? "open" : ""}>
        {[
          ["/", "Início"],
          ["/pontos", "Pontos de doação"],
          ["/campanhas", "Campanhas"],
          ["/como-doar", "Como doar"],
          ["/sobre", "Sobre nós"],
        ].map(([p, n]) => (
          <NavLink end key={p} to={p}>
            {n}
          </NavLink>
        ))}
        <Link className="account" to={user ? "/conta" : "/entrar"}>
          {user ? "Minha conta" : "Entrar"} <ArrowUpRight size={16} />
        </Link>
      </nav>
    </header>
  );
}
function Home() {
  const { data, error } = useData("/points");
  const camps = useData("/campaigns");
  const nav = useNavigate();
  const [q, setQ] = useState("");
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="dot" /> BOAS ROUPAS. NOVAS HISTÓRIAS.
          </p>
          <h1>
            Uma roupa parada pode fazer a <em>diferença.</em>
          </h1>
          <p className="lead">
            Encontre pontos de coleta perto de você e transforme roupas que não
            usa mais em novas oportunidades para outras pessoas.
          </p>
          <form
            className="hero-search"
            onSubmit={(e) => {
              e.preventDefault();
              nav("/pontos?q=" + encodeURIComponent(q));
            }}
          >
            <MapPin size={20} />
            <input
              aria-label="Cidade ou bairro"
              placeholder="Qual é sua cidade ou bairro?"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button aria-label="Encontrar pontos de coleta">
              <ArrowRight />
            </button>
          </form>
          <Link className="sub-link" to="/cadastro?role=INSTITUTION">
            Cadastrar minha instituição <ArrowUpRight size={16} />
          </Link>
          <div className="hero-note">
            <Leaf size={19} />
            <span>
              Menos roupas paradas.
              <br />
              <strong>Mais possibilidades para alguém.</strong>
            </span>
          </div>
        </div>
        <div className="hero-art">
          <img
            src="/images/roupas.svg"
            alt="Ilustração de roupas dobradas e caixa preparada para doação"
          />
          <div className="image-caption">
            <span>UM NOVO DESTINO</span>
            <strong>
              O que já fez parte da sua história
              <br />
              pode começar outra.
            </strong>
          </div>
          <div className="floating-note">
            <Heart size={22} />
            <span>
              Doar é deixar
              <br />
              <b>o cuidado circular.</b>
            </span>
          </div>
        </div>
      </section>
      <section className="steps">
        <div>
          <p className="eyebrow">SIMPLES PARA VOCÊ. IMPORTANTE PARA ALGUÉM.</p>
          <h2>
            Um pequeno gesto.
            <br />
            Um novo começo.
          </h2>
        </div>
        {[
          [
            "01",
            "Encontre um ponto",
            "Pesquise instituições e locais de coleta na sua região.",
          ],
          [
            "02",
            "Prepare sua doação",
            "Confira os itens aceitos e organize as peças com carinho.",
          ],
          [
            "03",
            "Faça a diferença",
            "Confirme as informações e combine a entrega com o local.",
          ],
        ].map(([n, t, d]) => (
          <div key={n}>
            <span className="step-number">{n}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        ))}
      </section>
      <section className="section">
        <div className="section-title">
          <div>
            <p className="eyebrow">A SOLIDARIEDADE PODE ESTAR PERTO</p>
            <h2>Encontre o próximo destino.</h2>
          </div>
          <Link to="/pontos">
            Explorar todos os pontos <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="demo-banner">{demoText}</div>
        <State data={data} error={error} />
        <div className="grid three">
          {data?.items?.slice(0, 3).map((p: any) => (
            <PointCard p={p} key={p.id} />
          ))}
        </div>
      </section>
      <section className="section campaigns-home">
        <div className="section-title">
          <div>
            <p className="eyebrow">CADA PEÇA CONTA</p>
            <h2>Causas que conectam.</h2>
          </div>
          <Link to="/campanhas">
            Conhecer campanhas <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="grid three">
          {camps.data?.items?.map((c: any) => (
            <CampaignCard c={c} key={c.id} />
          ))}
        </div>
      </section>
      <section className="section category-section">
        <p className="eyebrow">TEM ESPAÇO PARA MUITO CUIDADO</p>
        <h2>O que você pode doar?</h2>
        <div className="category-grid">
          {[
            "Roupas femininas",
            "Roupas masculinas",
            "Roupas infantis",
            "Roupas de bebê",
            "Agasalhos",
            "Calçados",
            "Cobertores",
            "Acessórios",
          ].map((c, i) => (
            <Link to={"/pontos?categories=" + (i + 1)} key={c}>
              <Shirt />
              <span>{c}</span>
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
        <p>
          Cada instituição decide o que recebe. Confira as orientações antes de
          entregar.
        </p>
      </section>
      <section className="institution-cta">
        <div>
          <p className="eyebrow">VAMOS CONECTAR MAIS PESSOAS?</p>
          <h2>
            Sua instituição pode
            <br />
            alcançar mais pessoas.
          </h2>
          <p>
            Cadastre seus pontos de coleta e dê visibilidade às suas campanhas.
          </p>
        </div>
        <Link className="button light" to="/cadastro?role=INSTITUTION">
          Cadastrar instituição <ArrowUpRight size={18} />
        </Link>
      </section>
    </>
  );
}
function CampaignCard({ c }: { c: any }) {
  return (
    <article className="campaign-card">
      <div className="campaign-visual">
        <Shirt size={65} strokeWidth={1} />
        <span>{c.phase}</span>
      </div>
      <div className="campaign-copy">
        <Demo demo={c.isDemo} />
        <h3>{c.title}</h3>
        <p>{c.items}</p>
        <p className="muted">
          {c.point?.city} · {new Date(c.endDate).toLocaleDateString("pt-BR")}
        </p>
        <Link to={"/campanhas/" + c.id}>
          Conhecer campanha <ArrowUpRight size={17} />
        </Link>
      </div>
    </article>
  );
}
function Points() {
  const [params, setParams] = useSearchParams();
  const { data, error } = useData("/points?" + params);
  const cats = useData("/categories");
  const [selected, setSelected] = useState(""),
    [view, setView] = useState("list"),
    [location, setLocation] = useState<number[]>(),
    [message, setMessage] = useState("");
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    v ? p.set(k, v) : p.delete(k);
    if (k !== "page") p.delete("page");
    setParams(p);
  };
  const [nearby, setNearby] = useState<any[] | null>(null);
  const filterParams = new URLSearchParams(params);
  filterParams.delete("page");
  const filterKey = filterParams.toString();
  useEffect(() => {
    let live = true;
    setNearby(null);
    if (!location) return;
    async function collect() {
      try {
        const first = await api("/points?" + filterKey);
        const all = [...first.items];
        for (let page = 2; page <= first.pages && live; page++) {
          const next = await api("/points?" + filterKey + "&page=" + page);
          all.push(...next.items);
        }
        if (live) setNearby(all);
      } catch (e: any) {
        if (live) setMessage(e.message);
      }
    }
    collect();
    return () => {
      live = false;
    };
  }, [filterKey, location]);
  let items = data?.items || [];
  if (location && nearby) {
    const offset = (Math.max(1, Number(params.get("page")) || 1) - 1) * 12;
    items = nearby
      .map((p: any) => ({
        ...p,
        distance: distance(location, [p.latitude, p.longitude]),
      }))
      .sort((a: any, b: any) => a.distance - b.distance)
      .slice(offset, offset + 12);
  }
  function select(id: string) {
    setSelected(id);
    setView("map");
    document
      .getElementById("card-" + id)
      ?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }
  return (
    <section className="section">
      <p className="eyebrow">ENCONTRE ONDE O CUIDADO CONTINUA</p>
      <h1 className="page-title">Pontos de doação</h1>
      <p>Um destino para suas roupas. Um novo começo para alguém.</p>
      <div className="filters">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            set("q", String(new FormData(e.currentTarget).get("q") || ""));
          }}
        >
          <Search size={18} />
          <input
            aria-label="Buscar pontos"
            name="q"
            defaultValue={params.get("q") || ""}
            placeholder="Nome, cidade, bairro ou endereço"
          />
          <button>Buscar</button>
        </form>
        <select
          aria-label="Tipo de dados"
          value={params.get("mode") || "demo"}
          onChange={(e) => set("mode", e.target.value)}
        >
          <option value="demo">Explorar demonstração</option>
          <option value="real">Pontos reais verificados</option>
        </select>
        <button
          className="outline"
          onClick={() => {
            if (!navigator.geolocation) {
              setMessage("Geolocalização indisponível. Use a pesquisa manual.");
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (p) => {
                setLocation([p.coords.latitude, p.coords.longitude]);
                setMessage(
                  "Buscando os pontos em ordem de proximidade. Sua localização permanece neste navegador.",
                );
              },
              () =>
                setMessage(
                  "Localização indisponível ou negada. Você pode pesquisar manualmente.",
                ),
              { timeout: 10000 },
            );
          }}
        >
          <Navigation size={16} /> Perto de mim
        </button>
      </div>
      <div className="filter-details">
        <SlidersHorizontal size={18} />
        <input
          aria-label="Filtrar cidade"
          placeholder="Cidade"
          value={params.get("city") || ""}
          onChange={(e) => set("city", e.target.value)}
        />
        <input
          aria-label="Filtrar bairro"
          placeholder="Bairro"
          value={params.get("neighborhood") || ""}
          onChange={(e) => set("neighborhood", e.target.value)}
        />
        <button className="text-button" onClick={() => setParams({})}>
          Limpar filtros
        </button>
      </div>
      <div className="chips">
        {cats.data?.map((c: any) => {
          const ids = (params.get("categories") || "")
            .split(",")
            .filter(Boolean);
          return (
            <button
              aria-pressed={ids.includes(c.id)}
              className={ids.includes(c.id) ? "active" : ""}
              key={c.id}
              onClick={() =>
                set(
                  "categories",
                  (ids.includes(c.id)
                    ? ids.filter((i) => i !== c.id)
                    : [...ids, c.id]
                  ).join(","),
                )
              }
            >
              {c.name}
            </button>
          );
        })}
      </div>
      {params.get("mode") !== "real" && (
        <div className="demo-banner">{demoText}</div>
      )}
      <Notice message={message} />
      <div className="result-bar">
        <span>{data?.total || 0} pontos encontrados</span>
        <div className="mobile">
          <button
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            Lista
          </button>
          <button onClick={() => setView("map")} aria-pressed={view === "map"}>
            Mapa
          </button>
        </div>
      </div>
      <State data={data} error={error} />
      {data && !items.length && (
        <div className="empty">
          <h3>Nenhum ponto encontrado</h3>
          <p>Experimente outra cidade ou remova alguns filtros.</p>
        </div>
      )}
      <div className={"explorer view-" + view}>
        <div className="results">
          {items.map((p: any) => (
            <PointCard
              p={p}
              key={p.id}
              selected={selected === p.id}
              onSelect={select}
            />
          ))}
        </div>
        <Map
          key={view}
          items={items}
          selected={selected}
          onSelect={select}
          location={location}
        />
      </div>
      <div className="pagination">
        {Array.from({ length: data?.pages || 0 }, (_, i) => (
          <button
            key={i}
            aria-current={
              Number(params.get("page") || 1) === i + 1 ? "page" : undefined
            }
            onClick={() => set("page", String(i + 1))}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </section>
  );
}
function distance(a: number[], b: number[]) {
  const rad = (x: number) => (x * Math.PI) / 180;
  return (
    6371 *
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin(rad(b[0] - a[0]) / 2) ** 2 +
          Math.cos(rad(a[0])) *
            Math.cos(rad(b[0])) *
            Math.sin(rad(b[1] - a[1]) / 2) ** 2,
      ),
    )
  );
}
function PointDetail() {
  const { id } = useParams();
  const { data: p, error } = useData("/points/" + id);
  const reviews = useData("/points/" + id + "/reviews");
  const camps = useData("/campaigns");
  const { user } = useContext(Auth);
  const [message, setMessage] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>, type: string) => {
    e.preventDefault();
    const f = e.currentTarget;
    const d = Object.fromEntries(new FormData(f));
    try {
      await api(
        "/points/" + id + "/" + type,
        "POST",
        type === "reviews"
          ? { rating: Number(d.rating), comment: d.comment }
          : d,
      );
      setMessage(
        type === "reviews"
          ? "Avaliação publicada."
          : "Relato enviado para análise.",
      );
      f.reset();
      reviews.reload();
    } catch (e: any) {
      setMessage(e.message);
    }
  };
  return (
    <section className="section">
      <Link to="/pontos">← Voltar aos pontos</Link>
      <State data={p} error={error} />
      {p && (
        <>
          <div className="detail-heading">
            <Demo demo={p.isDemo} />
            <h1 className="page-title">{p.name}</h1>
            <p>
              {p.institution.name} · {p.neighborhood}, {p.city}
            </p>
          </div>
          {p.isDemo && (
            <div className="demo-banner">
              {demoText} Rotas de entrega desabilitadas.
            </div>
          )}
          <div className="grid two">
            <div>
              <img
                className="detail-image"
                src="/images/roupas.svg"
                alt="Roupas organizadas para doação"
              />
              <h2>Sobre este ponto</h2>
              <p>{p.description}</p>
              <h3>O que recebe</h3>
              <div className="tags">
                {p.categories.map((c: any) => (
                  <span key={c.categoryId}>{c.category.name}</span>
                ))}
              </div>
              <h3>Restrições</h3>
              <p>{p.restrictions || "Confirme com a instituição."}</p>
              <h3>Como entregar</h3>
              <p>
                {p.instructions ||
                  "Confirme as orientações antes de sair de casa."}
              </p>
              <h3>Horários informados</h3>
              {p.hours.map((h: any) => (
                <p key={h.id}>
                  {
                    [
                      "Domingo",
                      "Segunda",
                      "Terça",
                      "Quarta",
                      "Quinta",
                      "Sexta",
                      "Sábado",
                    ][h.day]
                  }
                  : {h.opens}–{h.closes}
                </p>
              ))}
            </div>
            <aside className="detail-aside">
              <Map items={[p]} />
              <h3>
                <MapPin size={18} /> Localização
              </h3>
              <p>
                {p.street}, {p.number} {p.complement}
                <br />
                {p.neighborhood} · {p.city}/{p.state} · {p.zip}
              </p>
              {!p.isDemo && p.verifiedAt && (
                <a
                  className="button"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Como chegar <ArrowUpRight size={17} />
                </a>
              )}
              <p>Confirme horários e recebimento antes de sair de casa.</p>
              {p.phone && <p>Telefone: {p.phone}</p>}
              {p.email && <p>E-mail: {p.email}</p>}
              {p.website && (
                <a href={p.website} target="_blank" rel="noreferrer">
                  Site oficial
                </a>
              )}
              {!p.isDemo && p.source && (
                <p>
                  <a href={p.source} target="_blank" rel="noreferrer">
                    Fonte de verificação
                  </a>
                  <br />
                  Confirmado em{" "}
                  {new Date(p.verifiedAt).toLocaleDateString("pt-BR", {
                    timeZone: "UTC",
                  })}
                </p>
              )}
              <button
                onClick={() =>
                  api("/favorites", "POST", { pointId: id })
                    .then(() => setMessage("Salvo nos favoritos."))
                    .catch((e) => setMessage(e.message))
                }
              >
                <Heart size={16} /> Salvar ponto
              </button>
            </aside>
          </div>
          <Notice message={message} />
          <h2>Campanhas deste ponto</h2>
          <div className="grid three">
            {camps.data?.items
              .filter((c: any) => c.pointId === id)
              .map((c: any) => (
                <CampaignCard key={c.id} c={c} />
              ))}
          </div>
          <h2>Avaliações da comunidade</h2>
          {p.isDemo && (
            <p>Avaliações deste local são testes sobre um ponto fictício.</p>
          )}
          {reviews.data?.map((r: any) => (
            <article className="review" key={r.id}>
              <strong>
                {r.user.name} · {r.rating}/5
              </strong>
              <p>{r.comment}</p>
              {user && (
                <button
                  className="text-button"
                  onClick={() => {
                    const reason = prompt(
                      "Qual é o problema com esta avaliação? (mínimo 5 caracteres)",
                    );
                    if (reason)
                      api("/reviews/" + r.id + "/reports", "POST", { reason })
                        .then(() => setMessage("Denúncia registrada."))
                        .catch((e) => setMessage(e.message));
                  }}
                >
                  Denunciar avaliação
                </button>
              )}
            </article>
          ))}
          {reviews.data?.length === 0 && <p>Ainda não há avaliações.</p>}
          {user ? (
            <div className="grid two">
              <form className="panel" onSubmit={(e) => submit(e, "reviews")}>
                <h3>Conte sua experiência</h3>
                <Field label="Nota">
                  <select name="rating">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Comentário">
                  <textarea
                    name="comment"
                    required
                    minLength={3}
                    maxLength={2000}
                  />
                </Field>
                <button>Publicar avaliação</button>
                <p className="small">
                  Uma avaliação por ponto. Edite em Minha conta.
                </p>
              </form>
              <form className="panel" onSubmit={(e) => submit(e, "reports")}>
                <h3>Informar dados incorretos</h3>
                <Field label="Problema">
                  <select name="reason">
                    {[
                      "Endereço incorreto",
                      "Horário incorreto",
                      "Local não recebe doações",
                      "Telefone incorreto",
                      "Outros problemas",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Detalhes">
                  <textarea
                    required
                    minLength={5}
                    name="description"
                    maxLength={2000}
                  />
                </Field>
                <button>Enviar relato</button>
              </form>
            </div>
          ) : (
            <p>
              <Link to="/entrar">Entre na sua conta</Link> para avaliar ou
              informar dados incorretos.
            </p>
          )}
        </>
      )}
    </section>
  );
}
function Campaigns() {
  const [params, setParams] = useSearchParams();
  const { data, error } = useData("/campaigns?" + params);
  return (
    <section className="section">
      <p className="eyebrow">JUNTOS, O CUIDADO VAI MAIS LONGE</p>
      <h1 className="page-title">Campanhas de arrecadação</h1>
      <select
        aria-label="Tipo de campanha"
        value={params.get("mode") || "demo"}
        onChange={(e) => setParams({ mode: e.target.value })}
      >
        <option value="demo">Campanhas demonstrativas</option>
        <option value="real">Campanhas reais</option>
      </select>
      {params.get("mode") !== "real" && (
        <div className="demo-banner">
          Campanhas fictícias, sem arrecadação real.
        </div>
      )}
      <State data={data} error={error} />
      <div className="grid three">
        {data?.items.map((c: any) => (
          <CampaignCard key={c.id} c={c} />
        ))}
      </div>
      {data?.total === 0 && (
        <p className="empty">Nenhuma campanha publicada neste momento.</p>
      )}
      <div className="pagination">
        {Array.from({ length: data?.pages || 0 }, (_, i) => (
          <button
            key={i}
            onClick={() =>
              setParams({
                mode: params.get("mode") || "demo",
                page: String(i + 1),
              })
            }
          >
            {i + 1}
          </button>
        ))}
      </div>
    </section>
  );
}
function CampaignDetail() {
  const { id } = useParams();
  const { data: c, error } = useData("/campaigns/" + id);
  return (
    <section className="section narrow">
      <Link to="/campanhas">← Campanhas</Link>
      <State data={c} error={error} />
      {c && (
        <>
          <p>
            <Demo demo={c.isDemo} />
          </p>
          <h1 className="page-title">{c.title}</h1>
          <p>
            {c.institution.name} · {c.phase}
          </p>
          <p>
            {new Date(c.startDate).toLocaleDateString("pt-BR")} a{" "}
            {new Date(c.endDate).toLocaleDateString("pt-BR")}
          </p>
          <p className="lead">{c.description}</p>
          <h2>Itens necessários</h2>
          <p>{c.items}</p>
          <h2>Orientações</h2>
          <p>{c.instructions}</p>
          <Link className="button" to={"/pontos/" + c.pointId}>
            Ver ponto de coleta <ArrowRight size={18} />
          </Link>
          {c.isDemo && (
            <div className="demo-banner">
              Campanha fictícia. Não realize entregas.
            </div>
          )}
        </>
      )}
    </section>
  );
}
function Login({ signup = false }: { signup?: boolean }) {
  const [params] = useSearchParams();
  const { refresh } = useContext(Auth);
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const nav = useNavigate();
  return (
    <section className="auth-page">
      <div>
        <p className="eyebrow">FAÇA PARTE DESSA HISTÓRIA</p>
        <h1>
          {signup
            ? "O cuidado começa com uma conexão."
            : "Que bom ter você por aqui."}
        </h1>
        <p>
          Organize suas doações, salve pontos e ajude a manter as informações
          atualizadas.
        </p>
      </div>
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api(
              "/auth/" + (signup ? "register" : "login"),
              "POST",
              Object.fromEntries(new FormData(e.currentTarget)),
            );
            await refresh();
            nav("/conta");
          } catch (e: any) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>{signup ? "Criar conta" : "Entrar na sua conta"}</h2>
        {signup && (
          <>
            <Field label="Nome / nome da instituição">
              <input name="name" required minLength={2} />
            </Field>
            <Field label="Tipo de conta">
              <select
                name="role"
                defaultValue={
                  params.get("role") === "INSTITUTION" ? "INSTITUTION" : "DONOR"
                }
              >
                <option value="DONOR">Quero doar</option>
                <option value="INSTITUTION">Sou uma instituição</option>
              </select>
            </Field>
          </>
        )}
        <Field label="E-mail">
          <input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Senha">
          <input
            name="password"
            type="password"
            required
            minLength={signup ? 10 : 1}
            maxLength={72}
            autoComplete={signup ? "new-password" : "current-password"}
          />
        </Field>
        {signup && (
          <p className="small">
            Mínimo de 10 caracteres. Ao criar sua conta, consulte a{" "}
            <Link to="/privacidade">política de privacidade</Link>.
          </p>
        )}
        <Notice message={message} />
        <button disabled={busy}>
          {busy ? "Aguarde…" : signup ? "Criar conta" : "Entrar"}{" "}
          <ArrowRight size={18} />
        </button>
        <p>
          <Link to={signup ? "/entrar" : "/cadastro"}>
            {signup ? "Já tenho uma conta" : "Ainda não tenho conta"}
          </Link>
        </p>
      </form>
    </section>
  );
}
function Editorial({ page }: { page: string }) {
  return (
    <section className="section narrow">
      <p className="eyebrow">ACHE DOAÇÕES · CUIDADO QUE CIRCULA</p>
      <h1 className="page-title">
        {page === "como-doar"
          ? "Doar bem também é cuidar."
          : page === "sobre"
            ? "Boas roupas merecem novas histórias."
            : "Sua privacidade importa."}
      </h1>
      {page === "como-doar" ? (
        <>
          {[
            [
              "Separe as peças",
              "Escolha roupas em boas condições. Pense no que você gostaria de receber e separe por tipo.",
            ],
            [
              "Higienize com cuidado",
              "Lave e seque completamente as peças, seguindo as orientações da instituição.",
            ],
            [
              "Organize e embale",
              "Dobre, proteja as roupas da umidade e identifique os tipos de peças.",
            ],
            [
              "Confira o ponto",
              "Verifique categorias, horários e restrições. Confirme diretamente com a instituição antes de sair.",
            ],
            [
              "Combine a entrega",
              "Siga as instruções do responsável e respeite os horários de atendimento.",
            ],
          ].map(([t, d], i) => (
            <article className="editorial-step" key={t}>
              <span>0{i + 1}</span>
              <div>
                <h2>{t}</h2>
                <p>{d}</p>
              </div>
            </article>
          ))}
          <h2>Dúvidas frequentes</h2>
          {[
            [
              "Posso doar qualquer roupa?",
              "Depende da instituição. Peças molhadas, mofadas ou sem condição de uso geralmente não são adequadas. Confira as restrições.",
            ],
            [
              "Vocês retiram em casa?",
              "O AcheDoações conecta pessoas a pontos de coleta. Não oferece serviço próprio de retirada.",
            ],
            [
              "Os pontos demonstrativos recebem roupas?",
              "Não. Eles são fictícios e servem exclusivamente para testar a plataforma.",
            ],
            [
              "Posso doar calçados e cobertores?",
              "Consulte as categorias aceitas pelo ponto escolhido antes de entregar.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </>
      ) : page === "sobre" ? (
        <>
          <p className="lead">
            Doar uma roupa deveria ser simples. Encontrar o lugar certo nem
            sempre é.
          </p>
          <h2>Uma ponte entre intenção e ação</h2>
          <p>
            O AcheDoações nasce como um projeto para reunir pontos de coleta,
            orientações e campanhas em um só lugar. Nossa missão é facilitar
            conexões entre pessoas que querem doar e instituições que podem
            receber.
          </p>
          <h2>Reutilizar é ampliar possibilidades</h2>
          <p>
            Dar um novo uso a uma peça pode reduzir o descarte e apoiar o acesso
            a roupas em boas condições. Cada instituição tem necessidades
            próprias, por isso incentivamos a confirmação das informações.
          </p>
          <h2>Bem-estar e dignidade</h2>
          <p>
            A proposta contribui indiretamente para a ODS 3 — Saúde e Bem-Estar,
            ao apoiar condições de cuidado, acolhimento e dignidade. Não
            substitui ações de saúde nem representa resultados de impacto já
            comprovados.
          </p>
          <div className="demo-banner">
            Este ambiente contém uma base demonstrativa. Não há estatísticas de
            doações ou parcerias presumidas.
          </div>
        </>
      ) : (
        <>
          <h2>Dados utilizados</h2>
          <p>
            Nome, e-mail, senha protegida por hash, favoritos, avaliações e
            relatos são armazenados para oferecer as funções da plataforma.
            Instituições também fornecem informações públicas dos seus pontos.
          </p>
          <h2>Sessão e localização</h2>
          <p>
            Um cookie HttpOnly mantém sua sessão por até sete dias. A
            localização só é solicitada ao usar “Perto de mim” e é calculada no
            navegador, sem armazenamento no servidor. O mapa utiliza Google Maps quando a API está configurada ou
            OpenStreetMap como alternativa. O provedor do mapa recebe
            requisições do navegador para exibir a região.
          </p>
          <h2>Ambiente local e contato</h2>
          <p>
            Este é um projeto local demonstrativo. Antes de operação pública, o
            responsável deve configurar seu canal de contato, definir prazos de
            retenção e procedimentos de atendimento aos titulares. Não envie
            dados sensíveis aos campos públicos.
          </p>
        </>
      )}
    </section>
  );
}
export default function App() {
  const [user, setUser] = useState<any>(null),
    [loading, setLoading] = useState(true);
  const refresh = async () => {
    const d = await api("/auth/me");
    setUser(d.user);
  };
  useEffect(() => {
    refresh()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const name = loc.pathname.split("/")[1];
    document.title =
      (name ? name.charAt(0).toUpperCase() + name.slice(1) + " · " : "") +
      "AcheDoações";
  }, [loc.pathname]);
  return (
    <Auth.Provider value={{ user, refresh, loading }}>
      <a className="skip" href="#conteudo">
        Pular para conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pontos" element={<Points />} />
          <Route path="/pontos/:id" element={<PointDetail />} />
          <Route path="/campanhas" element={<Campaigns />} />
          <Route path="/campanhas/:id" element={<CampaignDetail />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/cadastro" element={<Login signup />} />
          <Route path="/conta/*" element={<Dashboard />} />
          {["sobre", "como-doar", "privacidade"].map((page) => (
            <Route
              key={page}
              path={"/" + page}
              element={<Editorial page={page} />}
            />
          ))}
          <Route
            path="*"
            element={
              <section className="section">
                <h1>Página não encontrada</h1>
                <Link to="/">Voltar ao início</Link>
              </section>
            }
          />
        </Routes>
      </main>
      <footer>
        <div>
          <Link className="brand" to="/">
            <Shirt /> AcheDoações
          </Link>
          <p>Conectando roupas a novas histórias.</p>
          <small>Projeto demonstrativo · Solidariedade e reutilização.</small>
        </div>
        <div>
          <Link to="/pontos">Pontos de doação</Link>
          <Link to="/como-doar">Como doar</Link>
          <Link to="/sobre">Sobre o projeto</Link>
          <Link to="/privacidade">Privacidade</Link>
        </div>
        <p>
          Uma peça pode ser
          <br />
          <strong>um novo começo.</strong>
        </p>
      </footer>
    </Auth.Provider>
  );
}
