import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const credentials=JSON.parse(readFileSync(resolve(process.env.E2E_CREDENTIALS || '../.validation/e2e-credentials.json'),'utf8'));

test('latest five, truck/date filters, mobile layout and deletion restore previous KM',async({page},info)=>{
  await page.goto('/');
  await page.getByLabel('ID da empresa',{exact:true}).fill(String(credentials.tenant_id || 3));
  await page.getByLabel('E-mail',{exact:true}).fill(credentials.email);
  await page.getByLabel('Senha',{exact:true}).fill(credentials.password);
  await page.getByRole('button',{name:'Entrar no FrotaGest'}).click();
  await expect(page.getByRole('heading',{name:'Visão geral',exact:true})).toBeVisible();
  const suffix=String(Date.now()).slice(-4);
  const plate=`EX${info.project.name==='mobile'?'M':'D'}${suffix}`;
  const headers={'X-Requested-With':'FrotaGest'};
  const response=await page.request.post('/api/trucks',{headers,data:{plate,brand:'Teste exclusão',model:'R450',mileage:200000}});
  expect(response.status()).toBe(201);
  const truck=await response.json();
  const records=[];
  for(let index=0;index<7;index++) {
    const result=await page.request.post('/api/maintenance',{headers,data:{truck_id:truck.id,type:'PREVENTIVA',category:'Teste',description:`${plate} revisão ${index+1}`,date:`2025-01-${String(index+1).padStart(2,'0')}`,mileage:201000+index*1000,status:'CONCLUIDA'}});
    expect(result.status()).toBe(201);
    records.push(await result.json());
  }
  await page.goto(`/frota/${truck.id}?tab=manutencoes`);
  await expect(page.locator('.maintenance-card')).toHaveCount(5);
  await expect(page.getByText(`${plate} revisão 1`,{exact:true})).toHaveCount(0);
  await page.getByRole('link',{name:'Ver todas as manutenções (7)'}).click();
  await expect(page.getByLabel('Caminhão',{exact:true})).toHaveValue(String(truck.id));
  await expect(page.locator('.maintenance-card')).toHaveCount(7);
  await page.getByLabel('Caminhão',{exact:true}).selectOption('');
  await expect(page).not.toHaveURL(new RegExp(`truck=${truck.id}(?:&|$)`));
  await page.getByLabel('Caminhão',{exact:true}).selectOption(String(truck.id));
  await expect(page.locator('.maintenance-card')).toHaveCount(7);
  const widths=info.project.name==='mobile'?[320,390,540,768]:[1440];
  for(const width of widths) {
    await page.setViewportSize({width,height:900});
    const boxes=await page.locator('.maintenance-filters input, .maintenance-filters select').evaluateAll(elements=>elements.map(element=>{
      const r=element.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
    }));
    for(let i=0;i<boxes.length;i++) {
      expect(boxes[i].left).toBeGreaterThanOrEqual(0);
      expect(boxes[i].right).toBeLessThanOrEqual(width);
      for(let j=i+1;j<boxes.length;j++) {
        const a=boxes[i],b=boxes[j];
        expect(a.right<=b.left || b.right<=a.left || a.bottom<=b.top || b.bottom<=a.top).toBe(true);
      }
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if (width===390) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({path:'../.validation/maintenance-filters-mobile.png'});
    }
  }
  await page.getByLabel('De',{exact:true}).fill('2025-01-02');
  await page.getByLabel('Até',{exact:true}).fill('2025-01-04');
  await expect(page.locator('.maintenance-card')).toHaveCount(3);
  await expect(page.getByText(`${plate} revisão 2`,{exact:true})).toBeVisible();
  await expect(page.getByText(`${plate} revisão 4`,{exact:true})).toBeVisible();
  await page.goto(`/manutencoes?truck=${truck.id}`);
  await expect(page.locator('.maintenance-card')).toHaveCount(5);
  await page.getByRole('button',{name:'Ver todas as manutenções (7)'}).click();
  await expect(page.locator('.maintenance-card')).toHaveCount(7);
  await page.goto(`/manutencoes/${records[0].id}`);
  await expect(page.getByRole('heading',{name:records[0].description,exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Excluir última manutenção'})).toHaveCount(0);
  await page.goto(`/manutencoes/${records[6].id}`);
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Excluir última manutenção'}).click();
  await expect(page).toHaveURL(new RegExp(`/frota/${truck.id}\\?tab=manutencoes`));
  await expect(page.getByRole('heading',{name:'206.000 km'})).toBeVisible();
  await expect(page.locator('.maintenance-card')).toHaveCount(5);
  expect((await page.request.get(`/api/maintenance/${records[6].id}`)).status()).toBe(404);
  await page.reload();
  await expect(page.getByRole('heading',{name:'206.000 km'})).toBeVisible();
});
