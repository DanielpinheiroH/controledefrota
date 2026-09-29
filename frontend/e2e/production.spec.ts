import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

test('production HTTPS, cookies, reports, attachment downloads and cache',async({page,request})=>{
  test.skip(!process.env.E2E_PRODUCTION,'Explicit production verification only');
  const credentials=JSON.parse(readFileSync(resolve(process.env.E2E_CREDENTIALS!),'utf8'));
  const response=await page.goto('/');
  expect(response!.status()).toBe(200);
  expect(page.url()).toMatch(/^https:\/\/frotasguest\.duckdns\.org/);
  expect(response!.headers()['strict-transport-security']).toContain('max-age=');
  expect(response!.headers()['content-security-policy']).toContain("default-src 'self'");
  await page.getByLabel('E-mail',{exact:true}).fill(credentials.email);
  await page.getByLabel('Senha',{exact:true}).fill(credentials.password);
  await page.getByRole('button',{name:'Entrar no FrotaGest'}).click();
  await expect(page.getByRole('heading',{name:'Visão geral',exact:true})).toBeVisible();
  const cookie=(await page.context().cookies()).find(c=>c.name==='frotagest_session');
  expect(cookie).toMatchObject({secure:true,httpOnly:true,sameSite:'Strict',path:'/api'});
  await page.goto('/relatorios');
  await expect(page.getByRole('heading',{name:'Custos e relatórios',exact:true})).toBeVisible();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('link',{name:'Exportar manutenções XLSX'}).click();
  const download=await downloadPromise;
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toBe('frotagest.xlsx');
  const exported=await page.request.get('/api/reports/export.xlsx');
  expect(exported.status()).toBe(200);
  expect((await exported.body()).subarray(0,2).toString()).toBe('PK');
  const trucks=await (await page.request.get('/api/trucks?size=100')).json();
  let attachmentCount=0;
  for(const truck of trucks.items.filter((t:{brand:string})=>t.brand==='TESTE E2E Scania')) {
    const attachments=await (await page.request.get(`/api/trucks/${truck.id}/attachments`)).json();
    for(const attachment of attachments) {
      const file=await page.request.get(`/api/attachments/${attachment.id}/download`);
      expect(file.status()).toBe(200);
      expect((await file.body()).length).toBeGreaterThan(0);
      expect((await request.get(`/api/attachments/${attachment.id}/download`)).status()).toBe(401);
      attachmentCount++;
    }
  }
  expect(attachmentCount).toBeGreaterThan(0);
  const denied=await page.request.post('/api/trucks',{headers:{Origin:'https://invalid.example','X-Requested-With':'FrotaGest'},data:{}});
  expect(denied.status()).toBe(403);
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload();
  const urls=await page.evaluate(async()=>{
    const keys=await caches.keys();
    return (await Promise.all(keys.map(async key=>(await (await caches.open(key)).keys()).map(r=>r.url)))).flat();
  });
  expect(urls.some(url=>new URL(url).pathname.startsWith('/api/'))).toBe(false);
  await page.getByRole('button',{name:'Sair',exact:true}).click();
  await expect(page.getByRole('button',{name:'Entrar no FrotaGest'})).toBeVisible();
});
