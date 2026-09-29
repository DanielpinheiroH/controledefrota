export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(!(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      "X-Requested-With": "FrotaGest",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ detail: "Não foi possível conectar ao servidor" }));
    if (
      response.status === 401 &&
      path !== "/auth/login" &&
      path !== "/auth/me"
    )
      window.dispatchEvent(new Event("session-expired"));
    throw new Error(
      Array.isArray(body.detail)
        ? body.detail
            .map(
              (e: { msg: string; loc: string[] }) =>
                `${e.loc.slice(1).join(".")}: ${e.msg}`,
            )
            .join("; ")
        : body.detail || "Erro na solicitação",
    );
  }
  return response.json();
}
export const send = <T>(path: string, data: unknown, method = "POST") =>
  api<T>(path, { method, body: JSON.stringify(data) });
export const brl = (v: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v),
  );
export const km = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
export const dateBR = (v: string) =>
  new Date(v.length === 10 ? v + "T12:00:00" : v).toLocaleDateString("pt-BR");
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const labels: Record<string, string> = {
  DISPONIVEL: "Disponível",
  EM_MANUTENCAO: "Em manutenção",
  PARADO: "Parado",
  INATIVO: "Inativo",
  ABERTA: "Aberta",
  AGENDADA: "Agendada",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
  PREVENTIVA: "Preventiva",
  CORRETIVA: "Corretiva",
  VERDE: "Em dia",
  AMARELO: "Próxima",
  VERMELHO: "Vencida",
};
export function alertText(p: {
  km_left: number | null;
  days_left: number | null;
}): string {
  const parts: string[] = [];
  if (p.km_left !== null)
    parts.push(
      p.km_left < 0
        ? `Vencida em ${km(-p.km_left)} km`
        : p.km_left === 0
          ? "Vence agora por KM"
          : `Faltam ${km(p.km_left)} km`,
    );
  if (p.days_left !== null)
    parts.push(
      p.days_left < 0
        ? `Vencida há ${-p.days_left} dias`
        : p.days_left === 0
          ? "Vence hoje"
          : `Faltam ${p.days_left} dias`,
    );
  return parts.join(" · ");
}
