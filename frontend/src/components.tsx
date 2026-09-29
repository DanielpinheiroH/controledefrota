import { useEffect, useState, useId, cloneElement, type ReactNode, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Truck as TruckIcon, AlertTriangle } from "lucide-react";
import { api, brl, km, dateBR, labels, alertText } from "./api";
import type { Maintenance, Plan, Truck } from "./types";

export function useLoad<T>(path: string, revision = 0) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<T>(path)
      .then((v) => {
        if (active) setData(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  return { data, error, loading };
}
export function Loading({
  error,
  loading,
  children,
}: {
  error: string;
  loading: boolean;
  children: ReactNode;
}) {
  return error ? (
    <div role="alert" className="error">
      {error}
    </div>
  ) : loading ? (
    <div className="empty">Carregando…</div>
  ) : (
    <>{children}</>
  );
}
export function Title({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">{eyebrow || "GESTÃO DA FROTA"}</span>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ${value.toLowerCase()}`}>
      {labels[value] || value}
    </span>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <TruckIcon size={32} />
      <p>{children}</p>
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{id?: string}>;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {id})}
    </div>
  );
}
export function Pager({
  page,
  total,
  size = 30,
  onChange,
}: {
  page: number;
  total: number;
  size?: number;
  onChange: (v: number) => void;
}) {
  return total > size ? (
    <div className="pager">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      <span>
        {page} / {Math.ceil(total / size)}
      </span>
      <button
        disabled={page * size >= total}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </button>
    </div>
  ) : null;
}
export function TruckCard({ truck }: { truck: Truck }) {
  return (
    <Link to={`/frota/${truck.id}`} className="card truck-card">
      <div className="row">
        <span className="truck-symbol">
          <TruckIcon size={30} />
        </span>
        <Badge value={truck.status} />
      </div>
      <h3>
        {truck.brand} {truck.model}
      </h3>
      <span className="plate">{truck.plate}</span>
      <div className="card-footer">
        <span>
          {km(truck.mileage)} <small>km</small>
        </span>
        <ChevronRight size={19} />
      </div>
    </Link>
  );
}
export function AlertCard({ plan }: { plan: Plan }) {
  return (
    <Link
      className={`card alert-card ${plan.state.toLowerCase()}`}
      to={`/frota/${plan.truck_id}?tab=preventivas`}
    >
      <AlertTriangle size={21} />
      <div>
        <strong>
          {plan.truck_label} <small>· {plan.plate}</small>
        </strong>
        <p>{plan.name}</p>
        <span>{alertText(plan)}</span>
      </div>
      <ChevronRight size={18} />
    </Link>
  );
}
export function MaintenanceCard({ item }: { item: Maintenance }) {
  return (
    <Link className="card maintenance-card" to={`/manutencoes/${item.id}`}>
      <div className="row">
        <span className="muted">
          {dateBR(item.date)} · {item.plate}
        </span>
        <Badge value={item.status} />
      </div>
      <h3>{item.description}</h3>
      <p>
        {labels[item.type]} · {km(item.mileage)} km
        {item.workshop_name ? ` · ${item.workshop_name}` : ""}
      </p>
      <div className="row">
        <strong>{brl(item.total_cost)}</strong>
        <ChevronRight size={18} />
      </div>
    </Link>
  );
}
