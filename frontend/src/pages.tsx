import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Truck as TruckIcon,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  FileText,
  Building2,
  Users,
  Shield,
  Download,
} from "lucide-react";
import { api, send, brl, km, dateBR, labels, alertText } from "./api";
import {
  useLoad,
  Loading,
  Title,
  Empty,
  Field,
  Pager,
  TruckCard,
  AlertCard,
  MaintenanceCard,
  Badge,
} from "./components";
import { useUser } from "./main";
import type {
  Dashboard,
  Truck,
  Page,
  Maintenance,
  Plan,
  Workshop,
  Costs,
  Attachment,
  User,
} from "./types";

function AddLink({ to, children }: { to: string; children: string }) {
  return useUser().role === "ADMIN" ? (
    <Link className="primary button" to={to}>
      <Plus size={18} />
      {children}
    </Link>
  ) : null;
}
export function DashboardPage() {
  const state = useLoad<Dashboard>("/dashboard");
  const d = state.data;
  return (
    <>
      <Title
        eyebrow="SUA OPERAÇÃO, EM DIA"
        title="Visão geral"
        subtitle="Acompanhe o que move sua frota hoje."
        action={<AddLink to="/manutencoes/nova">Nova manutenção</AddLink>}
      />
      <Loading {...state}>
        {d && (
          <>
            <div className="hero-strip">
              <div>
                <span className="eyebrow">CUIDADO QUE LEVA MAIS LONGE</span>
                <h2>Cada quilômetro conta.</h2>
                <p>Antecipe manutenções e mantenha sua frota no caminho.</p>
                <Link to="/frota">
                  Ver minha frota <ArrowUpRight size={17} />
                </Link>
              </div>
              <TruckIcon size={100} />
            </div>
            <div className="stats">
              {[
                [d.total, "Caminhões na frota", TruckIcon],
                [d.available, "Disponíveis", CheckCircle2],
                [d.maintenance, "Em manutenção", Wrench],
                [d.stopped, "Parados", AlertTriangle],
              ].map(([v, label, Icon]) => {
                const I = Icon as typeof TruckIcon;
                return (
                  <Link to="/frota" className="card stat" key={String(label)}>
                    <I size={21} />
                    <strong>{String(v)}</strong>
                    <span>{String(label)}</span>
                  </Link>
                );
              })}
            </div>
            <div className="dashboard-columns">
              <section>
                <div className="section-heading">
                  <h2>
                    Atenção necessária{" "}
                    <span className="count">{d.overdue + d.upcoming}</span>
                  </h2>
                  <Link to="/alertas">Ver alertas →</Link>
                </div>
                <div className="stack">
                  {d.alerts.length ? (
                    d.alerts
                      .slice(0, 6)
                      .map((p) => <AlertCard key={p.id} plan={p} />)
                  ) : (
                    <Empty>Nenhuma manutenção próxima ou vencida.</Empty>
                  )}
                </div>
              </section>
              <section>
                <div className="section-heading">
                  <h2>Custos de manutenção</h2>
                </div>
                <Link className="card cost-highlight" to="/relatorios">
                  <span>Neste mês</span>
                  <strong>{brl(d.month_cost)}</strong>
                  <hr />
                  <div className="row">
                    <span>Acumulado no ano</span>
                    <b>{brl(d.year_cost)}</b>
                  </div>
                  <p>Somente manutenções concluídas</p>
                </Link>
                <div className="summary-alerts">
                  <Link to="/alertas?state=AMARELO">
                    <strong>{d.upcoming}</strong> Próximas
                  </Link>
                  <Link to="/alertas?state=VERMELHO">
                    <strong>{d.overdue}</strong> Vencidas
                  </Link>
                </div>
              </section>
            </div>
            <div className="section-heading">
              <h2>Últimas manutenções</h2>
              <Link to="/manutencoes">Ver todas →</Link>
            </div>
            <div className="grid">
              {d.recent.length ? (
                d.recent.map((m) => <MaintenanceCard key={m.id} item={m} />)
              ) : (
                <Empty>
                  Registre a primeira manutenção para começar o histórico.
                </Empty>
              )}
            </div>
          </>
        )}
      </Loading>
    </>
  );
}

export function FleetPage() {
  const [showInactive, setShowInactive] = useState(false);
  const [q, setQ] = useState(""),
    [page, setPage] = useState(1);
  const state = useLoad<Page<Truck>>(
    `/trucks?q=${encodeURIComponent(q)}&page=${page}${showInactive ? '' : '&active=true'}`,
  );
  return (
    <>
      <Title
        title="Minha frota"
        subtitle="Todos os veículos. Um só lugar."
        action={<AddLink to="/frota/novo">Novo caminhão</AddLink>}
      />
      <label className="search">
        <Search size={19} />
        <input
          aria-label="Buscar caminhão"
          placeholder="Buscar por placa, marca ou modelo"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </label>
      <label style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
        <input type="checkbox" style={{width:20,minHeight:20}} checked={showInactive} onChange={e=>{setShowInactive(e.target.checked);setPage(1)}}/>
        Mostrar também caminhões excluídos/inativos
      </label>
      <Loading {...state}>
        <p className="muted">{state.data?.total} veículos encontrados</p>
        <div className="grid">
          {state.data?.items.map((t) => (
            <TruckCard key={t.id} truck={t} />
          ))}
        </div>
        {!state.data?.total && (
          <Empty>
            Nenhum caminhão encontrado. Cadastre o primeiro veículo.
          </Empty>
        )}
        <Pager page={page} total={state.data?.total || 0} onChange={setPage} />
      </Loading>
    </>
  );
}

interface Mileage {
  id: number;
  mileage: number;
  recorded_at: string;
  user_id: number;
  source: string;
  notes: string | null;
}
export function TruckPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "geral";
  const state = useLoad<Truck>(`/trucks/${id}`);
  const t = state.data;
  const user = useUser();
  async function deleteTruck() {
    if (!t || !window.confirm(`Excluir o caminhão ${t.plate} da frota ativa? Ele será inativado e todo o histórico de KM, manutenções, custos e documentos será preservado.`)) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api(`/trucks/${id}`, {method:'DELETE'});
      navigate('/frota', {replace:true});
    } catch (error) {
      setDeleteError((error as Error).message);
      setDeleting(false);
    }
  }
  return (
    <>
      <Link className="back" to="/frota">
        ← Minha frota
      </Link>
      <Loading {...state}>
        {t && (
          <>
            <Title
              title={`${t.brand} ${t.model}`}
              subtitle={`${t.plate} · ${km(t.mileage)} km`}
              action={
                user.role === "ADMIN" ? (
                  <div className="actions" style={{marginTop:0}}>
                  <Link className="button" to={`/frota/${id}/editar`}>
                    Editar caminhão
                  </Link>
                  {t.active && <button className="danger" disabled={deleting} onClick={deleteTruck}>{deleting ? 'Excluindo…' : 'Excluir caminhão'}</button>}
                  </div>
                ) : null
              }
            />
            {deleteError && <p className="error" role="alert">{deleteError}</p>}
            <div className="truck-heading card">
              <TruckPhoto id={t.id} />
              <div>
                <span className="plate">{t.plate}</span>
                <h2>
                  {km(t.mileage)} <small>km</small>
                </h2>
                <Badge value={t.status} />
                <p className="muted">
                  Atualizado em {dateBR(t.mileage_updated_at)}
                </p>
              </div>
              <div className="stack">
                <AddLink to={`/quilometragem?truck=${id}`}>
                  Atualizar KM
                </AddLink>
                <AddLink to={`/manutencoes/nova?truck=${id}`}>
                  Nova manutenção
                </AddLink>
              </div>
            </div>
            <div className="tabs">
              {[
                ["geral", "Visão geral"],
                ["historico", "Histórico"],
                ["manutencoes", "Manutenções"],
                ["preventivas", "Preventivas"],
                ["custos", "Custos"],
                ["documentos", "Documentos"],
              ].map(([key, label]) => (
                <button
                  className={tab === key ? "active" : ""}
                  key={key}
                  onClick={() => setParams({ tab: key })}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === "geral" && (
              <div className="card details-grid">
                {[
                  ["Marca", t.brand],
                  ["Modelo", t.model],
                  ["Versão", t.version],
                  [
                    "Fabricação / modelo",
                    `${t.manufacture_year || "—"} / ${t.model_year || "—"}`,
                  ],
                  ["Chassi", t.chassis],
                  ["RENAVAM", t.renavam],
                  ["Cor", t.color],
                  ["Motorista responsável", t.driver],
                  ["Observações", t.notes],
                ].map(([label, value]) => (
                  <div key={label}>
                    <small>{label}</small>
                    <p>{value || "Não informado"}</p>
                  </div>
                ))}
              </div>
            )}
            {tab === "historico" && (
              <>
                <TruckMaintenance id={t.id} />
                <MileageList id={t.id} />
              </>
            )}
            {tab === "manutencoes" && <TruckMaintenance id={t.id} />}{" "}
            {tab === "preventivas" && <TruckPlans id={t.id} />}{" "}
            {tab === "custos" && <CostReport truckId={t.id} />}{" "}
            {tab === "documentos" && <Documents id={t.id} />}
          </>
        )}
      </Loading>
    </>
  );
}
function TruckPhoto({ id }: { id: number }) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision(v => v + 1);
    window.addEventListener('attachments-changed', refresh);
    return () => window.removeEventListener('attachments-changed', refresh);
  }, []);
  const { data } = useLoad<Attachment[]>(`/trucks/${id}/attachments`, revision);
  const photo = data?.find((a) => a.kind === "FOTO");
  return photo ? (
    <img
      className="truck-photo"
      alt="Foto do caminhão"
      src={`/api/attachments/${photo.id}/download`}
    />
  ) : (
    <div className="truck-photo placeholder">
      <TruckIcon size={64} />
    </div>
  );
}
function MileageList({ id }: { id: number }) {
  const [page, setPage] = useState(1);
  const state = useLoad<Page<Mileage>>(`/trucks/${id}/mileage?page=${page}`);
  return (
    <>
      <h2 className="section-heading">Histórico de quilometragem</h2>
      <Loading {...state}>
        <div className="stack">
          {state.data?.items.map((m) => (
            <div className="card row" key={m.id}>
              <div>
                <strong>{km(m.mileage)} km</strong>
                <p className="muted">
                  {dateBR(m.recorded_at)} · {m.source} · Usuário #{m.user_id}
                </p>
                {m.notes && <p>{m.notes}</p>}
              </div>
              <CheckCircle2 size={20} />
            </div>
          ))}
        </div>
        <Pager page={page} total={state.data?.total || 0} onChange={setPage} />
      </Loading>
    </>
  );
}
function TruckMaintenance({ id }: { id: number }) {
  const [page, setPage] = useState(1);
  const state = useLoad<Page<Maintenance>>(
    `/maintenance?truck_id=${id}&page=${page}`,
  );
  return (
    <>
      <h2 className="section-heading">Histórico de manutenções</h2>
      <Loading {...state}>
        <div className="grid">
          {state.data?.items.map((m) => (
            <MaintenanceCard key={m.id} item={m} />
          ))}
        </div>
        {!state.data?.total && <Empty>Nenhuma manutenção registrada.</Empty>}
        <Pager page={page} total={state.data?.total || 0} onChange={setPage} />
      </Loading>
    </>
  );
}
function TruckPlans({ id }: { id: number }) {
  const state = useLoad<Plan[]>(`/maintenance-plans?truck_id=${id}`);
  const admin = useUser().role === "ADMIN";
  return (
    <>
      <div className="section-heading">
        <h2>Plano preventivo</h2>
        <AddLink to={`/preventivas/nova?truck=${id}`}>Novo plano</AddLink>
      </div>
      <Loading {...state}>
        <div className="grid">
          {state.data?.map((p) => (
            <div key={p.id} className="card">
              <div className="row">
                <h3>{p.name}</h3>
                <Badge value={p.active ? p.state : "INATIVO"} />
              </div>
              <p>{alertText(p)}</p>
              <dl>
                <dt>Última realização</dt>
                <dd>
                  {km(p.last_km)} km · {dateBR(p.last_date)}
                </dd>
                <dt>Próxima manutenção</dt>
                <dd>
                  {p.next_km !== null ? `${km(p.next_km)} km` : ""}
                  {p.next_date ? ` · ${dateBR(p.next_date)}` : ""}
                </dd>
              </dl>
              {admin && (
                <div className="actions">
                  <Link
                    className="button"
                    to={`/manutencoes/nova?truck=${id}&plan=${p.id}`}
                  >
                    Registrar realização
                  </Link>
                  <Link to={`/preventivas/${p.id}/editar?truck=${id}`}>
                    Editar
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
        {!state.data?.length && (
          <Empty>Crie um plano para acompanhar as próximas manutenções.</Empty>
        )}
      </Loading>
    </>
  );
}

export function MaintenancePage() {
  const [query] = useSearchParams();
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState("");
  const filter = new URLSearchParams({ page: String(page) });
  if (status) filter.set("status", status);
  if (start) filter.set("start", start);
  if (end) filter.set("end", end);
  if (query.get("workshop")) filter.set("workshop_id", query.get("workshop")!);
  const state = useLoad<Page<Maintenance>>(`/maintenance?${filter}`);
  return (
    <>
      <Title
        title="Manutenções"
        subtitle="Do agendamento ao histórico completo."
        action={<AddLink to="/manutencoes/nova">Nova manutenção</AddLink>}
      />
      <div className="filters">
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {[
              "ABERTA",
              "AGENDADA",
              "EM_ANDAMENTO",
              "CONCLUIDA",
              "CANCELADA",
            ].map((v) => (
              <option key={v} value={v}>
                {labels[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="De">
          <input
            type="date"
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Até">
          <input
            type="date"
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              setPage(1);
            }}
          />
        </Field>
      </div>
      <Loading {...state}>
        <div className="grid">
          {state.data?.items.map((m) => (
            <MaintenanceCard key={m.id} item={m} />
          ))}
        </div>
        {!state.data?.total && <Empty>Nenhuma manutenção neste filtro.</Empty>}
        <Pager page={page} total={state.data?.total || 0} onChange={setPage} />
      </Loading>
    </>
  );
}
export function MaintenanceDetail() {
  const { id } = useParams();
  const [revision, setRevision] = useState(0),
    [error, setError] = useState("");
  const state = useLoad<Maintenance>(`/maintenance/${id}`, revision);
  const m = state.data;
  const admin = useUser().role === "ADMIN";
  async function cancel() {
    if (
      !confirm(
        "Cancelar esta manutenção? O registro permanecerá no histórico e os custos e prazos serão recalculados.",
      )
    )
      return;
    try {
      await api(`/maintenance/${id}`, { method: "DELETE" });
      setRevision(revision + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <Link className="back" to="/manutencoes">
        ← Manutenções
      </Link>
      <Loading {...state}>
        {m && (
          <>
            <Title
              title={m.description}
              subtitle={`${m.plate} · ${dateBR(m.date)} · ${km(m.mileage)} km`}
              action={<Badge value={m.status} />}
            />
            <div className="card">
              <div className="details-grid">
                <div>
                  <small>Tipo / categoria</small>
                  <p>
                    {labels[m.type]} · {m.category}
                  </p>
                </div>
                <div>
                  <small>Oficina</small>
                  <p>{m.workshop_name || "Não informada"}</p>
                </div>
                <div>
                  <small>Caminhão</small>
                  <p>
                    <Link to={`/frota/${m.truck_id}`}>{m.plate} →</Link>
                  </p>
                </div>
                <div>
                  <small>Plano preventivo</small>
                  <p>
                    {m.plan_id ? (
                      <Link to={`/frota/${m.truck_id}?tab=preventivas`}>
                        Ver plano #{m.plan_id}
                      </Link>
                    ) : (
                      "Sem vínculo"
                    )}
                  </p>
                </div>
              </div>
              <h2>Serviços realizados</h2>
              {m.services.length ? (
                m.services.map((s, i) => (
                  <div className="detail-line" key={i}>
                    <span>{s.description}</span>
                    <strong>{brl(s.value)}</strong>
                  </div>
                ))
              ) : (
                <p className="muted">Nenhum serviço informado.</p>
              )}
              <h2>Peças utilizadas</h2>
              {m.parts.length ? (
                m.parts.map((p, i) => (
                  <div className="detail-line" key={i}>
                    <div>
                      {p.name}
                      <small>
                        {p.reference || "Sem referência"} ·{" "}
                        {p.manufacturer || "Fabricante não informado"}
                        <br />
                        {p.quantity} × {brl(p.unit_price)}
                      </small>
                    </div>
                    <strong>{brl(p.total || 0)}</strong>
                  </div>
                ))
              ) : (
                <p className="muted">Nenhuma peça informada.</p>
              )}
              <div className="cost-breakdown">
                <div>
                  Peças <b>{brl(m.parts_cost)}</b>
                </div>
                <div>
                  Mão de obra <b>{brl(m.labor_cost)}</b>
                </div>
                <div>
                  Outros <b>{brl(m.other_cost)}</b>
                </div>
                <div className="total">
                  Total <b>{brl(m.total_cost)}</b>
                </div>
              </div>
              {m.notes && <p>{m.notes}</p>}
              {error && <p className="error">{error}</p>}
              {admin && (
                <div className="actions">
                  {!["CONCLUIDA", "CANCELADA"].includes(m.status) && (
                    <Link
                      className="primary button"
                      to={`/manutencoes/${id}/editar`}
                    >
                      Editar / concluir manutenção
                    </Link>
                  )}
                  {m.status !== "CANCELADA" && (
                    <button className="danger" onClick={cancel}>
                      Cancelar manutenção
                    </button>
                  )}
                </div>
              )}
            </div>
            <Documents id={m.truck_id} maintenanceId={m.id} />
          </>
        )}
      </Loading>
    </>
  );
}

export function AlertsPage() {
  const [params] = useSearchParams();
  const [filter, setFilter] = useState(params.get("state") || "");
  const state = useLoad<Plan[]>("/alerts");
  const items = state.data?.filter((p) => !filter || p.state === filter) || [];
  return (
    <>
      <Title
        title="Alertas da frota"
        subtitle="Antecipe os cuidados. Evite paradas inesperadas."
      />
      <div className="tabs">
        {[
          ["", "Todos"],
          ["VERMELHO", "Vencidos"],
          ["AMARELO", "Próximos"],
          ["VERDE", "Em dia"],
        ].map(([v, label]) => (
          <button
            key={v}
            className={filter === v ? "active" : ""}
            onClick={() => setFilter(v)}
          >
            {label}
          </button>
        ))}
      </div>
      <Loading {...state}>
        <div className="stack">
          {items.map((p) => (
            <AlertCard key={p.id} plan={p} />
          ))}
        </div>
        {!items.length && <Empty>Nenhum plano neste estado.</Empty>}
      </Loading>
    </>
  );
}
export function WorkshopsPage() {
  const [q, setQ] = useState(""),
    [page, setPage] = useState(1);
  const state = useLoad<Page<Workshop>>(
    `/workshops?q=${encodeURIComponent(q)}&page=${page}`,
  );
  const admin = useUser().role === "ADMIN";
  return (
    <>
      <Title
        title="Oficinas"
        subtitle="Quem cuida dos seus caminhões."
        action={<AddLink to="/oficinas/nova">Nova oficina</AddLink>}
      />
      <label className="search">
        <Search size={19} />
        <input
          aria-label="Buscar oficina"
          placeholder="Buscar oficina pelo nome"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </label>
      <Loading {...state}>
        <div className="grid">
          {state.data?.items.map((w) => (
            <div className="card" key={w.id}>
              <Building2 size={24} />
              <h3>{w.name}</h3>
              <p>{w.phone || "Telefone não informado"}</p>
              <p>{w.address || "Endereço não informado"}</p>
              <small>{w.active ? "Ativa" : "Inativa"}</small>
              <div className="actions">
                <Link to={`/manutencoes?workshop=${w.id}`}>
                  Histórico de serviços →
                </Link>
                {admin && <Link to={`/oficinas/${w.id}/editar`}>Editar</Link>}
              </div>
            </div>
          ))}
        </div>
        {!state.data?.total && <Empty>Nenhuma oficina encontrada.</Empty>}
        <Pager page={page} total={state.data?.total || 0} onChange={setPage} />
      </Loading>
    </>
  );
}

function CostReport({ truckId }: { truckId?: number }) {
  const [start, setStart] = useState(""),
    [end, setEnd] = useState("");
  const params = new URLSearchParams();
  if (truckId) params.set("truck_id", String(truckId));
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const state = useLoad<Costs>(`/reports/costs?${params}`);
  const c = state.data;
  return (
    <>
      <div className="filters">
        <Field label="De">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="Até">
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
        <a className="button" href={`/api/reports/export.xlsx?${params}`}>
          <Download size={17} />
          Exportar manutenções XLSX
        </a>
      </div>
      <Loading {...state}>
        {c && (
          <>
            <div className="stats">
              {[
                [c.total, "Gasto total"],
                [c.parts, "Peças"],
                [c.labor, "Mão de obra"],
                [c.other, "Outros custos"],
              ].map(([v, label]) => (
                <div className="card stat" key={label}>
                  <span>{label}</span>
                  <strong className="money">{brl(v)}</strong>
                </div>
              ))}
            </div>
            <p className="muted">
              Valores de manutenções concluídas no período selecionado.
            </p>
            <div className="grid">
              {[
                [c.by_truck, "Por caminhão"],
                [c.by_workshop, "Por oficina"],
                [c.by_month, "Por mês"],
              ].map(([group, title]) => (
                <div className="card" key={String(title)}>
                  <h2>{String(title)}</h2>
                  {Object.entries(group).length ? (
                    Object.entries(group).map(([key, v]) => (
                      <div className="detail-line" key={key}>
                        <span>{key}</span>
                        <strong>{brl(v)}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="muted">Sem gastos neste período.</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Loading>
    </>
  );
}
export function ReportsPage() {
  return (
    <>
      <Title
        title="Custos e relatórios"
        subtitle="Clareza para decidir. Controle para economizar."
      />
      <CostReport />
      <div className="section-heading">
        <h2>Relatórios operacionais</h2>
      </div>
      <div className="grid">
        {[
          ["/frota", "Histórico por caminhão"],
          ["/manutencoes", "Manutenções por período"],
          ["/alertas?state=AMARELO", "Próximas manutenções"],
          ["/alertas?state=VERMELHO", "Manutenções atrasadas"],
        ].map(([to, title]) => (
          <Link className="card row" to={to} key={to}>
            <FileText size={22} />
            {title}
            <ArrowUpRight size={18} />
          </Link>
        ))}
      </div>
    </>
  );
}

function Documents({
  id,
  maintenanceId,
}: {
  id: number;
  maintenanceId?: number;
}) {
  const [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const state = useLoad<Attachment[]>(`/trucks/${id}/attachments${maintenanceId ? `?maintenance_id=${maintenanceId}` : ''}`, revision);
  const admin = useUser().role === "ADMIN";
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (maintenanceId) data.set("maintenance_id", String(maintenanceId));
    setBusy(true);
    setError("");
    try {
      await api(`/trucks/${id}/attachments`, { method: "POST", body: data });
      form.reset();
      setRevision(revision + 1);
      window.dispatchEvent(new Event('attachments-changed'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h2 className="section-heading">Documentos e anexos</h2>
      {admin && (
        <form onSubmit={upload} className="card upload-form">
          <Field label="Tipo de arquivo">
            <select name="kind">
              <option value="DOCUMENTO">Documento / comprovante</option>
              <option value="FOTO">Foto do caminhão</option>
            </select>
          </Field>
          <Field label="Arquivo (até 10 MB)">
            <input
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              required
            />
          </Field>
          <p className="muted">
            Selecione PDF ou imagem. No Android, o seletor permite usar a
            câmera/galeria quando disponível.
          </p>
          <button className="primary" disabled={busy}>
            {busy ? "Enviando…" : "Anexar arquivo"}
          </button>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </form>
      )}
      <Loading {...state}>
        <div className="grid">
          {state.data?.map((a) => (
            <a
              className="card row"
              key={a.id}
              href={`/api/attachments/${a.id}/download`}
              target="_blank"
              rel="noreferrer"
            >
              <FileText size={24} />
              <div>
                <strong>{a.filename}</strong>
                <small>
                  {dateBR(a.created_at)} · {Math.ceil(a.size / 1024)} KB
                </small>
              </div>
              <Download size={18} />
            </a>
          ))}
        </div>
        {!state.data?.length && <Empty>Nenhum documento anexado.</Empty>}
      </Loading>
    </>
  );
}

export function MorePage() {
  const admin = useUser().role === "ADMIN";
  return (
    <>
      <Title
        title="Mais ferramentas"
        subtitle="Tudo o que sua operação precisa."
      />
      <div className="grid">
        {[
          ["/oficinas", "Oficinas", Building2],
          ["/relatorios", "Custos e relatórios", FileText],
          ...(admin
            ? [
                ["/usuarios", "Usuários", Users],
                ["/auditoria", "Auditoria", Shield],
              ]
            : []),
        ].map(([to, title, Icon]) => {
          const I = Icon as typeof TruckIcon;
          return (
            <Link className="card row" to={String(to)} key={String(to)}>
              <I size={24} />
              <strong>{String(title)}</strong>
              <ArrowUpRight size={20} />
            </Link>
          );
        })}
      </div>
      <div className="card install-guide">
        <h2>FrotaGest no Android</h2>
        <p>
          No Chrome, abra o menu e selecione “Instalar aplicativo” ou “Adicionar
          à tela inicial”. A instalação exige acesso por HTTPS (ou localhost
          neste computador).
        </p>
        <p className="muted">
          O aplicativo precisa de conexão para consultar e registrar dados da
          frota.
        </p>
      </div>
    </>
  );
}
export function UsersPage() {
  const [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const state = useLoad<User[]>("/users", revision);
  const admin = useUser().role === "ADMIN";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      await send("/users", Object.fromEntries(new FormData(form)));
      form.reset();
      setRevision(revision + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!admin)
    return <p className="error">Acesso reservado ao administrador.</p>;
  return (
    <>
      <Title title="Usuários" subtitle="Acesso seguro para sua equipe." />
      <form className="card form" onSubmit={submit}>
        <h2>Adicionar usuário</h2>
        <div className="form-grid">
          <Field label="Nome">
            <input name="name" required maxLength={120} />
          </Field>
          <Field label="E-mail">
            <input name="email" type="email" required />
          </Field>
          <Field label="Senha inicial (mínimo 8 caracteres)">
            <input
              name="password"
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Perfil">
            <select name="role">
              <option value="USUARIO">Usuário · consulta</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </Field>
        </div>
        <button className="primary" disabled={busy}>
          {busy ? "Criando…" : "Criar usuário"}
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </form>
      <Loading {...state}>
        <div className="grid">
          {state.data?.map((u) => (
            <div className="card" key={u.id}>
              <h3>{u.name}</h3>
              <p>{u.email}</p>
              <Badge value={u.role} />
            </div>
          ))}
        </div>
      </Loading>
    </>
  );
}
export function AuditPage() {
  const [page, setPage] = useState(1);
  const state = useLoad<
    Page<{
      id: number;
      action: string;
      entity: string;
      entity_id: number;
      user_id: number;
      created_at: string;
    }>
  >(`/audit?page=${page}`);
  if (useUser().role !== "ADMIN")
    return <p className="error">Acesso reservado ao administrador.</p>;
  return (
    <>
      <Title
        title="Auditoria"
        subtitle="Rastreabilidade das operações da frota."
      />
      <Loading {...state}>
        <div className="stack">
          {state.data?.items.map((a) => (
            <div className="card" key={a.id}>
              <strong>{a.action.replaceAll("_", " ")}</strong>
              <p className="muted">
                {dateBR(a.created_at)} · Usuário #{a.user_id} · {a.entity} #
                {a.entity_id}
              </p>
            </div>
          ))}
        </div>
        <Pager page={page} total={state.data?.total || 0} onChange={setPage} />
      </Loading>
    </>
  );
}
