import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Plus, Trash2, Save } from "lucide-react";
import { api, send, today, labels, brl } from "./api";
import { KmInput } from './KmInput';
import { MoneyInput } from './MoneyInput';
import { maintenanceTotals } from './maintenanceTotals';
import { Field, Title } from "./components";
import { useUser } from "./main";
import type {
  Truck,
  Workshop,
  Maintenance,
  Plan,
  Page,
  Service,
  Part,
} from "./types";

function FormShell({
  title,
  children,
  onSubmit,
  busy,
  error,
}: {
  title: string;
  children: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
  error: string;
}) {
  const user = useUser();
  const navigate = useNavigate();
  return user.role !== "ADMIN" ? (
    <p className="error">Acesso reservado ao administrador.</p>
  ) : (
    <>
      <Title
        title={title}
        subtitle="Informações organizadas para manter sua frota em dia."
      />
      <form className="card form" onSubmit={onSubmit}>
        {children}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button"
            onClick={() => navigate(-1)}
          >
            Voltar
          </button>
          <button className="primary" disabled={busy}>
            <Save size={18} />
            {busy ? "Salvando…" : "Salvar registro"}
          </button>
        </div>
      </form>
    </>
  );
}
function values(form: HTMLFormElement) {
  const result = Object.fromEntries(new FormData(form).entries()) as Record<
    string,
    string
  >;
  for (const key of ['mileage','baseline_km','interval_km','warning_km']) {
    if (key in result) result[key] = result[key].replaceAll('.', '');
  }
  return result;
}
function nullable(v: string) {
  return v.trim() || null;
}
function optionalNumber(v: string) {
  return v === "" ? null : Number(v);
}
function useSave() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate();
  async function run(task: () => Promise<string>) {
    setBusy(true);
    setError("");
    try {
      navigate(await task());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run, setError };
}
function Input({
  label,
  name,
  value = "",
  type = "text",
  required = false,
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  value?: string | number | null;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
}) {
  const [current, setCurrent] = useState(String(value ?? ""));
  useEffect(() => setCurrent(String(value ?? "")), [value]);
  if (['mileage','baseline_km','interval_km','warning_km'].includes(name)) {
    return <Field label={label}><KmInput name={name} value={value ?? ''} min={min} max={max} required={required}/></Field>;
  }
  return (
    <Field label={label}>
      <input
        name={name}
        value={current}
        onChange={e => setCurrent(e.target.value)}
        type={type}
        required={required}
        min={min}
        max={max}
        step={step}
        maxLength={type === "text" ? 500 : undefined}
      />
    </Field>
  );
}
function Select({
  label,
  name,
  value,
  items,
  required = false,
  onChange,
}: {
  label: string;
  name: string;
  value?: string | number;
  items: [string | number, string][];
  required?: boolean;
  onChange?: (v: string) => void;
}) {
  const [selected, setSelected] = useState(String(value ?? ""));
  useEffect(() => setSelected(String(value ?? "")), [value]);
  return (
    <Field label={label}>
      <select
        name={name}
        value={selected}
        required={required}
        onChange={(e) => {
          setSelected(e.target.value);
          onChange?.(e.target.value);
        }}
      >
        {items.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </Field>
  );
}
async function all<T>(path: string): Promise<T[]> {
  let page = 1,
    items: T[] = [];
  while (true) {
    const data = await api<Page<T>>(
      `${path}${path.includes("?") ? "&" : "?"}size=100&page=${page}`,
    );
    items = items.concat(data.items);
    if (items.length >= data.total) return items;
    page++;
  }
}

export function TruckForm() {
  const { id } = useParams();
  const [truck, setTruck] = useState<Truck | null>(null);
  const save = useSave();
  useEffect(() => {
    if (id)
      api<Truck>(`/trucks/${id}`)
        .then(setTruck)
        .catch((e) => save.setError(e.message));
  }, [id]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = values(e.currentTarget);
    await save.run(async () => {
      const data = {
        ...v,
        manufacture_year: optionalNumber(v.manufacture_year),
        model_year: optionalNumber(v.model_year),
        chassis: nullable(v.chassis),
        renavam: nullable(v.renavam),
        active: v.status !== "INATIVO",
        ...(id ? {} : { mileage: Number(v.mileage) }),
      };
      const result = await send<Truck>(
        id ? `/trucks/${id}` : "/trucks",
        data,
        id ? "PUT" : "POST",
      );
      return `/frota/${result.id}`;
    });
  }
  if (id && !truck) return <p>{save.error || "Carregando caminhão…"}</p>;
  return (
    <FormShell
      title={id ? "Editar caminhão" : "Novo caminhão"}
      onSubmit={submit}
      {...save}
    >
      <h2>Identificação do veículo</h2>
      <div className="form-grid">
        <Input label="Placa *" name="plate" value={truck?.plate} required />
        <Input label="Marca *" name="brand" value={truck?.brand} required />
        <Input label="Modelo *" name="model" value={truck?.model} required />
        <Input label="Versão" name="version" value={truck?.version} />
        <Input
          label="Ano de fabricação"
          name="manufacture_year"
          type="number"
          value={truck?.manufacture_year}
          min={1900}
          max={2100}
        />
        <Input
          label="Ano modelo"
          name="model_year"
          type="number"
          value={truck?.model_year}
          min={1900}
          max={2100}
        />
        <Input label="Chassi" name="chassis" value={truck?.chassis} />
        <Input label="RENAVAM" name="renavam" value={truck?.renavam} />
        <Input label="Cor" name="color" value={truck?.color} />
        <Input
          label="Motorista responsável"
          name="driver"
          value={truck?.driver}
        />
        {!id && (
          <Input
            label="Quilometragem inicial *"
            name="mileage"
            type="number"
            value={0}
            min={0}
            required
          />
        )}
        <Select
          label="Status"
          name="status"
          value={truck?.status || "DISPONIVEL"}
          items={["DISPONIVEL", "EM_MANUTENCAO", "PARADO", "INATIVO"].map(
            (v) => [v, labels[v]],
          )}
        />
      </div>
      <Field label="Observações">
        <textarea name="notes" defaultValue={truck?.notes || ""} />
      </Field>
    </FormShell>
  );
}

export function MileageForm() {
  const [query] = useSearchParams();
  const [trucks, setTrucks] = useState<Truck[]>([]),
    [selected, setSelected] = useState(query.get("truck") || "");
  const save = useSave();
  useEffect(() => {
    all<Truck>("/trucks")
      .then(setTrucks)
      .catch((e) => save.setError(e.message));
  }, []);
  const truck = trucks.find((t) => String(t.id) === selected);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = values(e.currentTarget);
    await save.run(async () => {
      await send(`/trucks/${v.truck_id}/mileage`, {
        mileage: Number(v.mileage),
        notes: v.notes,
      });
      return `/frota/${v.truck_id}?tab=historico`;
    });
  }
  return (
    <FormShell title="Atualizar quilometragem" onSubmit={submit} {...save}>
      <Select
        label="Caminhão *"
        name="truck_id"
        value={selected}
        required
        onChange={setSelected}
        items={[
          ["", "Selecione um caminhão"],
          ...trucks.map(
            (t) =>
              [t.id, `${t.plate} · ${t.brand} ${t.model}`] as [number, string],
          ),
        ]}
      />
      {truck && (
        <p className="info">
          Quilometragem atual: {truck.mileage.toLocaleString("pt-BR")} km. O
          registro anterior será preservado.
        </p>
      )}
      <Input
        key={selected}
        label="Nova quilometragem *"
        name="mileage"
        type="number"
        value={truck?.mileage}
        min={truck?.mileage || 0}
        required
      />
      <Field label="Observação">
        <textarea name="notes" />
      </Field>
    </FormShell>
  );
}

export function WorkshopForm() {
  const { id } = useParams();
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const save = useSave();
  useEffect(() => {
    if (id)
      all<Workshop>("/workshops")
        .then((items) =>
          setWorkshop(items.find((w) => String(w.id) === id) || null),
        )
        .catch((e) => save.setError(e.message));
  }, [id]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = values(e.currentTarget);
    await save.run(async () => {
      await send(
        id ? `/workshops/${id}` : "/workshops",
        { ...v, active: v.active === "true" },
        id ? "PUT" : "POST",
      );
      return "/oficinas";
    });
  }
  if (id && !workshop) return <p>{save.error || "Carregando…"}</p>;
  return (
    <FormShell
      title={id ? "Editar oficina" : "Nova oficina"}
      onSubmit={submit}
      {...save}
    >
      <div className="form-grid">
        {[
          ["name", "Nome *"],
          ["document", "CNPJ / CPF"],
          ["phone", "Telefone"],
          ["whatsapp", "WhatsApp"],
          ["address", "Endereço"],
          ["contact", "Contato"],
        ].map(([key, label]) => (
          <Input
            key={key}
            label={label}
            name={key}
            value={workshop?.[key as keyof Workshop] as string}
            required={key === "name"}
          />
        ))}
        <Select
          label="Situação"
          name="active"
          value={String(workshop?.active ?? true)}
          items={[
            ["true", "Ativa"],
            ["false", "Inativa"],
          ]}
        />
      </div>
      <Field label="Observações">
        <textarea name="notes" defaultValue={workshop?.notes || ""} />
      </Field>
    </FormShell>
  );
}

export function MaintenanceForm() {
  const { id } = useParams();
  const [query] = useSearchParams();
  const [trucks, setTrucks] = useState<Truck[]>([]),
    [workshops, setWorkshops] = useState<Workshop[]>([]),
    [plans, setPlans] = useState<Plan[]>([]),
    [item, setItem] = useState<Maintenance | null>(null),
    [selected, setSelected] = useState(query.get("truck") || ""),
    [workshopName, setWorkshopName] = useState(''),
    [otherCost, setOtherCost] = useState('0.00'),
    [services, setServices] = useState<Service[]>([
      { description: "", value: "0.00" },
    ]),
    [parts, setParts] = useState<Part[]>([]);
  const save = useSave();
  useEffect(() => {
    Promise.all([
      all<Truck>("/trucks"),
      all<Workshop>("/workshops"),
      api<Plan[]>("/maintenance-plans"),
    ])
      .then(([t, w, p]) => {
        setTrucks(t);
        setWorkshops(w);
        setPlans(p);
      })
      .catch((e) => save.setError(e.message));
    if (id)
      api<Maintenance>(`/maintenance/${id}`)
        .then((m) => {
          setItem(m);
          setSelected(String(m.truck_id));
          setServices(m.services);
          setParts(m.parts);
          setWorkshopName(m.workshop_name || '');
          setOtherCost(String(m.other_cost));
        })
        .catch((e) => save.setError(e.message));
  }, [id]);
  const truck = trucks.find((t) => String(t.id) === selected);
  const totals = maintenanceTotals(services,parts,otherCost);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = values(e.currentTarget);
    await save.run(async () => {
      const result = await send<Maintenance>(
        id ? `/maintenance/${id}` : "/maintenance",
        {
          ...v,
          truck_id: Number(v.truck_id),
          workshop_name: workshopName.trim() || null,
          other_cost: otherCost,
          plan_id: optionalNumber(v.plan_id),
          mileage: Number(v.mileage),
          services: services.map((s) => ({
            description: s.description,
            value: s.value,
          })),
          parts: parts.map((p) => ({
            name: p.name,
            reference: p.reference || null,
            manufacturer: p.manufacturer || null,
            quantity: p.quantity,
            unit_price: p.unit_price,
          })),
        },
        id ? "PUT" : "POST",
      );
      return `/manutencoes/${result.id}`;
    });
  }
  if (id && !item) return <p>{save.error || "Carregando…"}</p>;
  return (
    <FormShell
      title={id ? "Editar manutenção" : "Nova manutenção"}
      onSubmit={submit}
      {...save}
    >
      <h2>Dados da manutenção</h2>
      <div className="form-grid">
        <Select
          label="Caminhão *"
          name="truck_id"
          value={selected}
          required
          onChange={setSelected}
          items={[
            ["", "Selecione"],
            ...trucks.map(
              (t) => [t.id, `${t.plate} · ${t.model}`] as [number, string],
            ),
          ]}
        />
        <Select
          label="Tipo"
          name="type"
          value={item?.type || "PREVENTIVA"}
          items={["PREVENTIVA", "CORRETIVA"].map((v) => [v, labels[v]])}
        />
        <Input
          label="Descrição *"
          name="description"
          value={item?.description}
          required
        />
        <Input
          label="Categoria *"
          name="category"
          value={item?.category || "Motor"}
          required
        />
        <Input
          label="Data *"
          name="date"
          type="date"
          value={item?.date || today()}
          required
        />
        <Input
          key={selected}
          label="Quilometragem *"
          name="mileage"
          type="number"
          value={item?.mileage ?? truck?.mileage ?? 0}
          min={0}
          required
        />
        <Field label="Oficina"><input name="workshop_name" type="text" list="workshop-names" placeholder="Digite o nome da oficina" maxLength={160} value={workshopName} onChange={e=>setWorkshopName(e.target.value)}/></Field>
        <datalist id="workshop-names">{workshops.map(w=><option key={w.id} value={w.name}/>)}</datalist>
        <Select
          label="Status"
          name="status"
          value={item?.status || "CONCLUIDA"}
          items={[
            "ABERTA",
            "AGENDADA",
            "EM_ANDAMENTO",
            "CONCLUIDA",
            "CANCELADA",
          ].map((v) => [v, labels[v]])}
        />
        <Select
          key={`plan-${selected}-${plans.length}`}
          label="Plano preventivo relacionado"
          name="plan_id"
          value={item?.plan_id ?? query.get("plan") ?? ""}
          items={[
            ["", "Sem plano"],
            ...plans
              .filter((p) => String(p.truck_id) === selected)
              .map((p) => [p.id, p.name] as [number, string]),
          ]}
        />
      </div>
      <p className="info">
        Selecione o plano correspondente para atualizar automaticamente a
        próxima manutenção ao concluir.
      </p>
      <div className="section-heading">
        <h2>Serviços e mão de obra</h2>
        <button
          type="button"
          onClick={() =>
            setServices([...services, { description: "", value: "0.00" }])
          }
        >
          <Plus size={16} /> Serviço
        </button>
      </div>
      {services.map((s, i) => (
        <div className="line-item" key={i}>
          <Field label="Descrição do serviço">
            <input
              required
              value={s.description}
              onChange={(e) =>
                setServices(
                  services.map((x, j) =>
                    j === i ? { ...x, description: e.target.value } : x,
                  ),
                )
              }
            />
          </Field>
          <Field label="Mão de obra (R$)">
            <MoneyInput
              required
              value={s.value}
              onChange={(value) =>
                setServices(
                  services.map((x, j) =>
                    j === i ? { ...x, value } : x,
                  ),
                )
              }
            />
          </Field>
          <button
            type="button"
            aria-label="Remover serviço"
            onClick={() => setServices(services.filter((_, j) => j !== i))}
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <div className="section-heading">
        <h2>Peças utilizadas</h2>
        <button
          type="button"
          onClick={() =>
            setParts([
              ...parts,
              { name: "", quantity: "1", unit_price: "0.00" },
            ])
          }
        >
          <Plus size={16} /> Peça
        </button>
      </div>
      {parts.map((p, i) => (
        <div className="part-item" key={i}>
          {[
            ["name", "Nome"],
            ["reference", "Referência"],
            ["manufacturer", "Fabricante"],
            ["quantity", "Quantidade"],
            ["unit_price", "Valor unitário (R$)"],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type={
                  ["quantity", "unit_price"].includes(key) ? "number" : "text"
                }
                min={key === "quantity" ? "0.001" : "0"}
                step={key === "quantity" ? "0.001" : "0.01"}
                required={!["reference", "manufacturer"].includes(key)}
                value={p[key as keyof Part] || ""}
                onChange={(e) =>
                  setParts(
                    parts.map((x, j) =>
                      j === i ? { ...x, [key]: e.target.value } : x,
                    ),
                  )
                }
              />
            </Field>
          ))}
          <button
            type="button"
            aria-label="Remover peça"
            onClick={() => setParts(parts.filter((_, j) => j !== i))}
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <Field label="Outros custos (R$)"><MoneyInput required value={otherCost} onChange={setOtherCost}/></Field>
      <Field label="Observações">
        <textarea name="notes" defaultValue={item?.notes || ""} />
      </Field>
      <section className="cost-breakdown" aria-label="Resumo de custos" aria-live="polite">
        <div>Peças <b>{brl(totals.parts)}</b></div>
        <div>Mão de obra <b>{brl(totals.labor)}</b></div>
        <div>Outros custos <b>{brl(totals.other)}</b></div>
        <div className="total">Total da manutenção <b>{brl(totals.total)}</b></div>
      </section>
    </FormShell>
  );
}

export function PlanForm() {
  const { id } = useParams();
  const [query] = useSearchParams();
  const [trucks, setTrucks] = useState<Truck[]>([]),
    [plan, setPlan] = useState<Plan | null>(null),
    [selected, setSelected] = useState(query.get("truck") || ""),
    [history, setHistory] = useState<Maintenance[]>([]);
  const save = useSave();
  useEffect(() => {
    all<Truck>("/trucks")
      .then(setTrucks)
      .catch((e) => save.setError(e.message));
    if (id)
      api<Plan[]>(
        "/maintenance-plans" +
          (query.get("truck") ? `?truck_id=${query.get("truck")}` : ""),
      )
        .then((p) => {
          const v = p.find((x) => String(x.id) === id);
          if (v) {
            setPlan(v);
            setSelected(String(v.truck_id));
          }
        })
        .catch((e) => save.setError(e.message));
  }, [id]);
  useEffect(() => {
    if (selected)
      all<Maintenance>(`/maintenance?truck_id=${selected}&status=CONCLUIDA`)
        .then(setHistory)
        .catch((e) => save.setError(e.message));
  }, [selected]);
  const truck = trucks.find((t) => String(t.id) === selected);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = values(e.currentTarget);
    await save.run(async () => {
      await send(
        id ? `/maintenance-plans/${id}` : "/maintenance-plans",
        {
          ...v,
          truck_id: Number(v.truck_id),
          interval_km: optionalNumber(v.interval_km),
          interval_months: optionalNumber(v.interval_months),
          baseline_km: Number(v.baseline_km),
          warning_km: Number(v.warning_km),
          warning_days: Number(v.warning_days),
          last_maintenance_id: optionalNumber(v.last_maintenance_id),
          active: v.active === "true",
        },
        id ? "PUT" : "POST",
      );
      return `/frota/${v.truck_id}?tab=preventivas`;
    });
  }
  if (id && !plan) return <p>{save.error || "Carregando plano…"}</p>;
  return (
    <FormShell
      title={id ? "Editar plano preventivo" : "Novo plano preventivo"}
      onSubmit={submit}
      {...save}
    >
      <div className="form-grid">
        <Select
          label="Caminhão *"
          name="truck_id"
          value={selected}
          required
          onChange={setSelected}
          items={[
            ["", "Selecione"],
            ...trucks.map(
              (t) => [t.id, `${t.plate} · ${t.model}`] as [number, string],
            ),
          ]}
        />
        <Input
          label="Nome do plano *"
          name="name"
          value={plan?.name || "Troca de óleo"}
          required
        />
        <Input
          label="Intervalo em KM"
          name="interval_km"
          type="number"
          value={plan?.interval_km ?? 15000}
          min={1}
        />
        <Input
          label="Intervalo em meses"
          name="interval_months"
          type="number"
          value={plan?.interval_months}
          min={1}
          max={120}
        />
        <Input
          key={selected}
          label="KM da última realização *"
          name="baseline_km"
          type="number"
          value={plan?.baseline_km ?? truck?.mileage ?? 0}
          min={0}
          required
        />
        <Input
          label="Data da última realização *"
          name="baseline_date"
          type="date"
          value={plan?.baseline_date || today()}
          required
        />
        <Input
          label="Avisar com antecedência de (KM)"
          name="warning_km"
          type="number"
          value={plan?.warning_km ?? 2000}
          min={0}
          required
        />
        <Input
          label="Avisar com antecedência de (dias)"
          name="warning_days"
          type="number"
          value={plan?.warning_days ?? 15}
          min={0}
          required
        />
        <Select
          label="Vincular manutenção já realizada"
          name="last_maintenance_id"
          items={[
            ["", "Usar KM e data informados"],
            ...history
              .filter(
                (m) =>
                  m.type === "PREVENTIVA" &&
                  (!m.plan_id || m.plan_id === plan?.id),
              )
              .map(
                (m) =>
                  [m.id, `${m.description} · ${m.date} · ${m.mileage} km`] as [
                    number,
                    string,
                  ],
              ),
          ]}
        />
        <Select
          label="Situação"
          name="active"
          value={String(plan?.active ?? true)}
          items={[
            ["true", "Ativo"],
            ["false", "Inativo"],
          ]}
        />
      </div>
      <p className="info">
        Informe KM, meses ou ambos. Com os dois intervalos, vence pelo primeiro
        limite atingido. Vincule as próximas manutenções a este plano para
        renovar os prazos.
      </p>
    </FormShell>
  );
}
