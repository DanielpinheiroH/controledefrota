import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AlertCard, Loading, Pager, useLoad, TruckCard, Field } from "./components";
import { alertText, api, brl, dateBR } from "./api";
import type { Plan, Truck } from "./types";

afterEach(() => vi.unstubAllGlobals());
describe("preventive alerts", () => {
  it("shows remaining 1500 km", () =>
    expect(alertText({ km_left: 1500, days_left: null })).toBe(
      "Faltam 1.500 km",
    ));
  it("shows overdue by 500 km", () =>
    expect(alertText({ km_left: -500, days_left: null })).toBe(
      "Vencida em 500 km",
    ));
  it("handles limits reached and dates", () =>
    expect(alertText({ km_left: 0, days_left: 0 })).toBe(
      "Vence agora por KM · Vence hoje",
    ));
  it("links the alert to the truck preventive tab", () => {
    render(
      <MemoryRouter>
        <AlertCard
          plan={
            {
              truck_id: 4,
              truck_label: "Scania R450",
              plate: "ABC1D23",
              name: "Troca de óleo",
              state: "AMARELO",
              km_left: 1500,
              days_left: null,
            } as Plan
          }
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/frota/4?tab=preventivas",
    );
    expect(screen.getByText("Faltam 1.500 km")).toBeInTheDocument();
  });
});
describe("critical UI states", () => {
  it("associates select labels without including option text", () => {
    render(<Field label="Oficina"><select><option>Sem oficina</option><option>Mecânica</option></select></Field>);
    expect(screen.getByLabelText('Oficina', {exact: true})).toHaveRole('combobox');
  });
  it("shows loading before data", () => {
    render(
      <Loading error="" loading>
        <p>Data</p>
      </Loading>,
    );
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
    expect(screen.queryByText("Data")).not.toBeInTheDocument();
  });
  it("shows actionable API error", () => {
    render(
      <Loading error="Faça login para continuar" loading={false}>
        <p>Data</p>
      </Loading>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Faça login");
  });
  it("paginates without enabling previous on first page", () => {
    const changed = vi.fn();
    render(<Pager page={1} total={61} onChange={changed} />);
    expect(screen.getByText("Anterior")).toBeDisabled();
    fireEvent.click(screen.getByText("Próxima"));
    expect(changed).toHaveBeenCalledWith(2);
  });
  it("opens truck card with persisted mileage", () => {
    render(
      <MemoryRouter>
        <TruckCard
          truck={
            {
              id: 2,
              plate: "ABC1D23",
              brand: "Scania",
              model: "R450",
              mileage: 345500,
              status: "DISPONIVEL",
            } as Truck
          }
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/frota/2");
    expect(screen.getByText("345.500")).toBeInTheDocument();
  });
  it("loads data from the API and resolves loading", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({ value: "Real response" }),
        }),
    );
    function Probe() {
      const state = useLoad<{ value: string }>("/test");
      return <Loading {...state}>{state.data?.value}</Loading>;
    }
    render(<Probe />);
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Real response")).toBeInTheDocument(),
    );
  });
});
describe("API client and locale", () => {
  it("sends session credentials and CSRF header", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetch);
    await api("/trucks");
    expect(fetch).toHaveBeenCalledWith(
      "/api/trucks",
      expect.objectContaining({
        credentials: "same-origin",
        headers: expect.objectContaining({ "X-Requested-With": "FrotaGest" }),
      }),
    );
  });
  it("surfaces validation messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 422,
          json: async () => ({
            detail: [{ loc: ["body", "mileage"], msg: "Invalid mileage" }],
          }),
        }),
    );
    await expect(api("/trucks")).rejects.toThrow("mileage: Invalid mileage");
  });
  it("expires authenticated UI on a 401", async () => {
    const expired = vi.fn();
    window.addEventListener("session-expired", expired);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({ detail: "Faça login" }),
        }),
    );
    await expect(api("/trucks")).rejects.toThrow("Faça login");
    expect(expired).toHaveBeenCalled();
    window.removeEventListener("session-expired", expired);
  });
  it("formats dates without UTC day shifting", () =>
    expect(dateBR("2026-09-28")).toBe("28/09/2026"));
  it("formats BRL", () =>
    expect(brl("1200.00").replace(/\s/g, " ")).toBe("R$ 1.200,00"));
});
