import {test, expect} from '@playwright/test';

test('clear dates and reset all filters without leaving maintenance page', async({page}) => {
  const requests: string[] = [];
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    let body: unknown = {};
    if (url.pathname === '/api/auth/me') body = {id:1, tenant_id:1, name:'Teste', email:'test@example.test', role:'ADMIN'};
    if (url.pathname === '/api/trucks') body = {items:[{id:7, plate:'ABC1D23',brand:'Scania',model:'R450',active:true}], total:1};
    if (url.pathname === '/api/maintenance') {
      requests.push(url.search);
      body = {items:[], total:0, page:1, size:5};
    }
    await route.fulfill({json:body});
  });
  await page.goto('/manutencoes?truck=7&workshop=9');
  await expect(page.getByLabel('Caminhão',{exact:true})).toHaveValue('7');
  await page.getByLabel('Status',{exact:true}).selectOption('CONCLUIDA');
  await page.getByLabel('De',{exact:true}).fill('2026-01-01');
  await page.getByLabel('Até',{exact:true}).fill('2026-01-31');
  await expect.poll(() => requests.at(-1)).toContain('end=2026-01-31');
  await page.getByRole('button',{name:'Limpar período',exact:true}).click();
  await expect(page.getByLabel('De',{exact:true})).toHaveValue('');
  await expect(page.getByLabel('Até',{exact:true})).toHaveValue('');
  await expect.poll(() => new URLSearchParams(requests.at(-1)).has('end')).toBe(false);
  expect(new URLSearchParams(requests.at(-1)).has('start')).toBe(false);
  expect(new URLSearchParams(requests.at(-1)).get('truck_id')).toBe('7');
  expect(new URLSearchParams(requests.at(-1)).get('status')).toBe('CONCLUIDA');
  await page.getByLabel('De',{exact:true}).fill('2026-02-01');
  await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();
  await expect(page.getByLabel('De',{exact:true})).toHaveValue('');
  await expect(page.getByLabel('Até',{exact:true})).toHaveValue('');
  await expect(page.getByLabel('Caminhão',{exact:true})).toHaveValue('');
  await expect(page.getByLabel('Status',{exact:true})).toHaveValue('');
  await expect.poll(() => requests.at(-1)).toBe('?page=1&size=5');
  await expect(page).toHaveURL(/\/manutencoes$/);
  // Reset also works when the native controls are already empty.
  await page.getByRole('button',{name:'Limpar período',exact:true}).click();
  await expect(page.getByLabel('De',{exact:true})).toHaveValue('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
