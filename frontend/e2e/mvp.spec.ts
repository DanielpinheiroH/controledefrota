import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const credentials = JSON.parse(
  readFileSync(resolve("../.validation/e2e-credentials.json"), "utf8"),
);
async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("E-mail", { exact: true }).fill(credentials.email);
  await page.getByLabel("Senha", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Entrar no FrotaGest" }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
}
async function save(page: Page) {
  await page.getByRole("button", { name: "Salvar registro" }).click();
}
async function setMileage(page: Page, id: string, value: string) {
  await page.goto(`/quilometragem?truck=${id}`);
  await expect(
    page.getByText("Quilometragem atual:", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Nova quilometragem").fill(value);
  await save(page);
  await expect(page).toHaveURL(new RegExp(`/frota/${id}\\?tab=historico`));
  await expect(
    page.getByRole("heading", {
      name: new RegExp(value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")),
    }),
  ).toBeVisible();
}

test("complete preventive flow, forms, documents, costs and persistent history", async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  const code = String(Date.now()).slice(-4);
  const plate = `TST${code[0]}${testInfo.project.name === "mobile" ? "M" : "D"}${code.slice(2)}`;
  await page.goto("/frota/novo");
  await page.getByLabel("Placa *", { exact: true }).fill(plate);
  await page.getByLabel("Marca *", { exact: true }).fill("Scania");
  await page.getByLabel("Modelo *", { exact: true }).fill("R450");
  await page.getByLabel("Quilometragem inicial").fill("325000");
  await save(page);
  await expect(page).toHaveURL(/\/frota\/\d+$/);
  const id = page.url().split("/").at(-1)!;
  await expect(page.getByRole("heading", { name: "325.000 km" })).toBeVisible();
  await page.getByRole("link", { name: "Editar caminhão" }).click();
  await page.getByLabel("Motorista responsável").fill("Motorista de validação");
  await save(page);
  await expect(
    page.getByText("Motorista de validação", { exact: true }),
  ).toBeVisible();
  await setMileage(page, id, "330000");
  await page.goto("/oficinas/nova");
  const workshop = `Oficina E2E ${plate}`;
  await page.getByLabel("Nome *", { exact: true }).fill(workshop);
  await page.getByLabel("Telefone", { exact: true }).fill("11999990000");
  await save(page);
  await expect(page.getByRole("heading", { name: workshop })).toBeVisible();
  await page.goto(`/manutencoes/nova?truck=${id}`);
  await page.getByLabel("Descrição *", { exact: true }).fill("Troca de óleo");
  await page.getByLabel("Descrição do serviço").fill("Troca de óleo e filtro");
  await page.getByLabel("Mão de obra (R$)").fill("500,00");
  await page
    .getByLabel("Oficina", { exact: true })
    .fill(workshop);
  await page.getByRole("button", { name: "Peça", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Óleo 15W40");
  await page.getByLabel("Quantidade", { exact: true }).fill("20");
  await page.getByLabel("Valor unitário (R$)").fill("35");
  await expect(page.getByRole('region',{name:'Resumo de custos'})).toContainText('R$ 1.200,00');
  await page.getByLabel("Status", { exact: true }).selectOption("ABERTA");
  await save(page);
  await expect(page).toHaveURL(/\/manutencoes\/\d+$/);
  await expect(page.getByText("R$ 1.200,00", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Editar / concluir manutenção" })
    .click();
  await page.getByLabel("Status", { exact: true }).selectOption("CONCLUIDA");
  await save(page);
  await expect(page.getByText("Concluída", { exact: true })).toBeVisible();
  const firstId = page.url().split("/").at(-1)!;
  await page.goto(`/preventivas/nova?truck=${id}`);
  await expect(page.getByLabel("Caminhão *")).toHaveValue(id);
  await page.getByLabel("KM da última realização").fill("330000");
  await page.getByLabel("Intervalo em KM").fill("15000");
  await page
    .getByLabel("Vincular manutenção já realizada")
    .selectOption(firstId);
  await save(page);
  await expect(page.getByText("345.000 km", { exact: true })).toBeVisible();
  await setMileage(page, id, "343500");
  await page.getByRole("button", { name: "Preventivas", exact: true }).click();
  await expect(page.getByText("Próxima", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Faltam 1.500 km", { exact: true }),
  ).toBeVisible();
  await setMileage(page, id, "345500");
  await page.getByRole("button", { name: "Preventivas", exact: true }).click();
  await expect(page.getByText("Vencida", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Vencida em 500 km", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `../.validation/${testInfo.project.name}-overdue.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Registrar realização" }).click();
  await page
    .getByLabel("Descrição *", { exact: true })
    .fill("Segunda troca de óleo");
  await page.getByLabel("Descrição do serviço").fill("Troca de óleo");
  await page.getByLabel("Mão de obra (R$)").fill("1.200,00");
  await save(page);
  await expect(page.getByText("Concluída", { exact: true })).toBeVisible();
  await page.goto(`/frota/${id}?tab=preventivas`);
  await expect(page.getByText("360.500 km", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("360.500 km", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Troca de óleo", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Segunda troca de óleo", exact: true }),
  ).toBeVisible();
  for (const value of ["325.000 km", "330.000 km", "343.500 km"])
    await expect(page.getByText(value, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Custos", exact: true }).click();
  await expect(
    page.getByText("R$ 2.400,00", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Documentos", exact: true }).click();
  await expect(page.getByText("Nenhum documento anexado.")).toBeVisible();
  await page
    .getByLabel("Arquivo (até 10 MB)")
    .setInputFiles(resolve("public/icon-192.png"));
  await page.getByRole("button", { name: "Anexar arquivo" }).click();
  await expect(page.getByText("icon-192.png", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("icon-192.png", { exact: true })).toBeVisible();
  await page.goto("/alertas");
  await expect(
    page.getByRole("heading", { name: "Alertas da frota" }),
  ).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await expect(page.locator(".bottom-nav")).toBeVisible();
    await page
      .locator(".bottom-nav")
      .getByRole("link", { name: "Frota", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Minha frota" }),
    ).toBeVisible();
  }
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `../.validation/${testInfo.project.name}-dashboard.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("empty search, server validation, protected routes and PWA", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/trucks");
  expect(response.status()).toBe(401);
  await page.goto("/usuarios");
  await expect(
    page.getByRole("button", { name: "Entrar no FrotaGest" }),
  ).toBeVisible();
  await login(page);
  await page.goto("/frota");
  await page.getByLabel("Buscar caminhão").fill("NO-SUCH-TRUCK-XYZ");
  await expect(
    page.getByText("Nenhum caminhão encontrado. Cadastre o primeiro veículo."),
  ).toBeVisible();
  await page.goto("/frota/novo");
  await page.getByLabel("Placa *", { exact: true }).fill("INVALIDA");
  await page.getByLabel("Marca *", { exact: true }).fill("Teste");
  await page.getByLabel("Modelo *", { exact: true }).fill("Teste");
  await save(page);
  await expect(page.getByRole("alert")).toContainText("Placa inválida");
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe("FrotaGest");
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    const image = await request.get(icon.src);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/png");
  }
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    const urls: string[] = [];
    for (const key of keys) {
      const cache = await caches.open(key);
      for (const req of await cache.keys()) urls.push(req.url);
    }
    return urls;
  });
  expect(cached.some((url) => new URL(url).pathname.startsWith("/api/"))).toBe(
    false,
  );
  const session = await page.context().cookies();
  expect(session.find((c) => c.name === "frotagest_session")?.httpOnly).toBe(
    true,
  );
  await page.getByRole('button', {name:'Sair', exact:true}).click();
  await expect(page.getByRole('button',{name:'Entrar no FrotaGest'})).toBeVisible();
  expect((await page.request.get('/api/trucks')).status()).toBe(401);
});

test('reader account can consult but cannot write from UI or API', async ({page}) => {
  await login(page);
  const created = await page.request.post('/api/trucks',{headers:{'X-Requested-With':'FrotaGest'},data:{plate:`PRM${String(Date.now()).slice(-4)}`,brand:'Teste',model:'Permissões',mileage:0}});
  expect(created.ok()).toBeTruthy();
  const truck = await created.json();
  await page.goto('/usuarios');
  const email=`reader-${randomUUID()}@example.test`;
  const password=randomUUID();
  await page.getByLabel('Nome',{exact:true}).fill('Consulta de validação');
  await page.getByLabel('E-mail',{exact:true}).fill(email);
  await page.getByLabel('Senha inicial (mínimo 12 caracteres)').fill(password);
  await page.getByRole('button',{name:'Criar usuário'}).click();
  await expect(page.getByText(email,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Sair',exact:true}).click();
  await page.getByLabel('E-mail',{exact:true}).fill(email);
  await page.getByLabel('Senha',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Entrar no FrotaGest'}).click();
  await expect(page.getByRole('heading',{name:'Visão geral',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Ações rápidas'})).toHaveCount(0);
  await page.goto(`/frota/${truck.id}`);
  await expect(page.getByRole('button',{name:'Excluir caminhão',exact:true})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Editar caminhão',exact:true})).toHaveCount(0);
  const deletion=await page.request.delete(`/api/trucks/${truck.id}`,{headers:{'X-Requested-With':'FrotaGest'}});
  expect(deletion.status()).toBe(403);
  await page.goto('/frota/novo');
  await expect(page.getByText('Acesso reservado ao administrador.')).toBeVisible();
  const response=await page.request.post('/api/trucks',{headers:{'X-Requested-With':'FrotaGest'},data:{plate:'XXX1A23',brand:'Não permitido',model:'Teste'}});
  expect(response.status()).toBe(403);
});

test('local API documentation works with content security policy',async ({page}) => {
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/api/docs');
  await expect(page.getByRole('heading',{name:'FrotaGest API',exact:false})).toBeVisible();
  await expect(page.getByText('/api/trucks',{exact:true}).first()).toBeVisible();
  expect(errors).toEqual([]);
});
