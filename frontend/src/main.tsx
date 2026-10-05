import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  Wrench,
  Bell,
  MoreHorizontal,
  Plus,
  LogOut,
  X,
  ArrowUpRight,
  Download,
} from "lucide-react";
import { api, send, setTenantContext } from "./api";
import type { User } from "./types";
import {
  DashboardPage,
  FleetPage,
  TruckPage,
  MaintenancePage,
  MaintenanceDetail,
  AlertsPage,
  WorkshopsPage,
  ReportsPage,
  MorePage,
  UsersPage,
  AuditPage,
} from "./pages";
import {
  TruckForm,
  MaintenanceForm,
  PlanForm,
  MileageForm,
  WorkshopForm,
} from "./forms";
import "./style.css";
import {readRememberedEmail, rememberEmail, offerPasswordSave, rememberedPassword, readRememberedTenant, rememberTenant} from './rememberLogin';

const Auth = createContext<User | null>(null);
export const useUser = () => useContext(Auth)!;
function App() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [quick, setQuick] = useState(false);
  const navigate = useNavigate();
  const [savedEmail, setSavedEmail] = useState(readRememberedEmail);
  const [tenantId, setTenantId] = useState(readRememberedTenant);
  const [remember, setRemember] = useState(() => Boolean(readRememberedEmail()));
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let cancelled = false;
    if (ready && !user && remember && savedEmail) {
      void rememberedPassword(savedEmail, tenantId).then(password => {
        if (!cancelled && password && emailInput.current?.value.toLowerCase() === savedEmail.toLowerCase() && passwordInput.current && !passwordInput.current.value) {
          passwordInput.current.value = password;
        }
      });
    }
    return () => { cancelled = true; };
  }, [ready, user, remember, savedEmail, tenantId]);
  useEffect(() => {
    api<User>("/auth/me")
      .then(authenticated => { setTenantContext(authenticated.tenant_id); setUser(authenticated); })
      .catch(() => {})
      .finally(() => setReady(true));
    const expire = () => { setTenantContext(null); setUser(null); };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError("");
    setBusy(true);
    try {
      const authenticated = await send<User>("/auth/login", {
          tenant_id: Number(tenantId),
          email: data.get("email"),
          password: data.get("password"),
        });
      rememberEmail(remember ? authenticated.email : '');
      rememberTenant(remember ? tenantId : '');
      setSavedEmail(remember ? authenticated.email : '');
      if (remember) void offerPasswordSave(authenticated.email, String(data.get('password') || ''), tenantId);
      setTenantContext(authenticated.tenant_id);
      setUser(authenticated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await send("/auth/logout", {});
      setTenantContext(null);
      setUser(null);
      setQuick(false);
      navigate("/");
    } catch (e) {
      alert((e as Error).message);
    }
  }
  if (!ready)
    return (
      <div className="splash">
        FrotaGest<span>Preparando sua frota…</span>
      </div>
    );
  if (!user)
    return (
      <main className="login">
        <div className="login-story">
          <div className="brand">
            <Truck /> FrotaGest<span>MANUTENÇÃO INTELIGENTE</span>
          </div>
          <h1>
            Sua frota em dia.
            <br />
            Seu caminho livre.
          </h1>
          <p>
            Mais controle sobre cada quilômetro, cada manutenção e cada decisão.
          </p>
          <div className="road-art">
            <Truck size={120} />
            <span />
          </div>
          <small>CONTROLE · HISTÓRICO · TRANQUILIDADE</small>
        </div>
        <div className="login-panel">
          <form onSubmit={login} autoComplete="on">
            <span className="eyebrow">BEM-VINDO AO FROTAGEST</span>
            <h2>Vamos cuidar da sua frota.</h2>
            <p>Entre com sua conta para continuar.</p>
            <label className="field">
              <span>ID da empresa</span>
              <input name="tenant_id" type="number" inputMode="numeric" min="1" max="2147483647" step="1" required value={tenantId} onChange={event => {
                setTenantId(event.target.value);
                if (passwordInput.current) passwordInput.current.value = '';
              }} />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input
                name="email"
                ref={emailInput}
                defaultValue={savedEmail}
                type="email"
                autoComplete="username"
                required
                placeholder="voce@empresa.com.br"
              />
            </label>
            <label className="field">
              <span>Senha</span>
              <input
                name="password"
                ref={passwordInput}
                type="password"
                autoComplete="current-password"
                required
                placeholder="Sua senha"
              />
            </label>
            <label className="remember-login">
              <input type="checkbox" checked={remember} onChange={event => {
                setRemember(event.target.checked);
                if (!event.target.checked) {
                  rememberEmail('');
                  rememberTenant('');
                  setSavedEmail('');
                }
              }} />
              <span>Lembrar de mim neste aparelho</span>
            </label>
            <small className="remember-hint">Para preencher a senha nas próximas vezes, aceite salvá-la quando o navegador perguntar.</small>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Entrando…" : "Entrar no FrotaGest"}
              <ArrowUpRight size={18} />
            </button>
            <small>
              Primeiro acesso? Solicite uma conta ao administrador da frota.
            </small>
          </form>
        </div>
      </main>
    );
  const links = [
    ["/", "Visão geral", LayoutDashboard],
    ["/frota", "Frota", Truck],
    ["/manutencoes", "Manutenção", Wrench],
    ["/alertas", "Alertas", Bell],
    ["/mais", "Mais", MoreHorizontal],
  ] as const;
  return (
    <Auth.Provider value={user}>
      <div className="app-shell" key={user.tenant_id}>
        <aside className="sidebar">
          <Link className="brand" to="/">
            <Truck /> FrotaGest<span>GESTÃO DE MANUTENÇÃO</span>
          </Link>
          <span className="nav-label">PRINCIPAL</span>
          <nav>
            {links.map(([to, label, Icon]) => (
              <NavLink key={to} to={to} end={to === "/"}>
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-note">
            <span className="status-dot" />
            Sua frota, conectada.<p>O cuidado de hoje move o amanhã.</p>
          </div>
          <div className="profile">
            <span className="avatar">{user.name[0]}</span>
            <div>
              <strong>{user.name}</strong>
              <small>
                {user.role === "ADMIN" ? "Administrador" : "Consulta"}
              </small>
            </div>
            <button
              aria-label="Sair"
              onClick={logout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <button className="mobile-logout" aria-label="Sair" onClick={logout}><LogOut size={18}/></button>
            <span>
              FrotaGest <span className="tenant-badge">Empresa ID {user.tenant_id}{user.tenant_id === 1 ? ' · Teste' : ''}</span>
            </span>
            <div>
              <span className="online-dot" /> Gestão de manutenção{" "}
              <Link to="/alertas" aria-label="Alertas">
                <Bell size={20} />
              </Link>
            </div>
          </header>
          <main className="content">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/frota" element={<FleetPage />} />
              <Route path="/frota/novo" element={<TruckForm />} />
              <Route path="/frota/:id" element={<TruckPage />} />
              <Route path="/frota/:id/editar" element={<TruckForm />} />
              <Route path="/quilometragem" element={<MileageForm />} />
              <Route path="/manutencoes" element={<MaintenancePage />} />
              <Route path="/manutencoes/nova" element={<MaintenanceForm />} />
              <Route path="/manutencoes/:id" element={<MaintenanceDetail />} />
              <Route
                path="/manutencoes/:id/editar"
                element={<MaintenanceForm />}
              />
              <Route path="/preventivas/nova" element={<PlanForm />} />
              <Route path="/preventivas/:id/editar" element={<PlanForm />} />
              <Route path="/alertas" element={<AlertsPage />} />
              <Route path="/oficinas" element={<WorkshopsPage />} />
              <Route path="/oficinas/nova" element={<WorkshopForm />} />
              <Route path="/oficinas/:id/editar" element={<WorkshopForm />} />
              <Route path="/relatorios" element={<ReportsPage />} />
              <Route path="/usuarios" element={<UsersPage />} />
              <Route path="/auditoria" element={<AuditPage />} />
              <Route path="/mais" element={<MorePage />} />
              <Route
                path="*"
                element={
                  <p>
                    Página não encontrada. <Link to="/">Voltar ao início</Link>
                  </p>
                }
              />
            </Routes>
            <InstallHint />
          </main>
        </div>
        <nav className="bottom-nav">
          {links.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon size={22} />
              <span>{label === "Visão geral" ? "Início" : label}</span>
            </NavLink>
          ))}
        </nav>
        {user.role === "ADMIN" && (
          <>
            <button
              className="fab"
              aria-label="Ações rápidas"
              onClick={() => setQuick(!quick)}
            >
              {quick ? <X /> : <Plus />}
            </button>
            {quick && (
              <div className="quick-menu">
                {[
                  ["/manutencoes/nova", "Nova manutenção"],
                  ["/quilometragem", "Atualizar KM"],
                  ["/frota/novo", "Novo caminhão"],
                ].map(([to, label]) => (
                  <Link to={to} key={to} onClick={() => setQuick(false)}>
                    {label}
                    <Plus size={16} />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Auth.Provider>
  );
}
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}
function InstallHint() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  return event ? (
    <button
      className="install"
      onClick={async () => {
        await event.prompt();
        setEvent(null);
      }}
    >
      <Download size={16} /> Instalar FrotaGest no dispositivo
    </button>
  ) : null;
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
