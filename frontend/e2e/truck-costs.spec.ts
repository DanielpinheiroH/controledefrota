import {test,expect} from '@playwright/test';

test('truck costs stay scoped and date filters never overlap',async({page})=>{
  const requests:string[]=[];
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    let body:unknown={items:[],total:0};
    if(url.pathname==='/api/auth/me') body={id:1,tenant_id:1,name:'Teste',role:'ADMIN'};
    if(url.pathname==='/api/trucks/7') body={id:7,plate:'ABC1D23',brand:'Scania',model:'R450',mileage:200000,mileage_updated_at:'2026-10-15',active:true,status:'DISPONIVEL'};
    if(url.pathname==='/api/trucks/7/attachments') body=[];
    if(url.pathname==='/api/reports/costs') {
      requests.push(url.search);
      body={total:100,parts:100,labor:0,other:0,by_truck:{ABC1D23:100},by_workshop:{Teste:100},by_month:{'2026-10':100}};
    }
    await route.fulfill({json:body});
  });
  await page.goto('/frota/7?tab=custos');
  await expect(page.getByText('Custos somente deste caminhão:',{exact:false})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Por caminhão',exact:true})).toHaveCount(0);
  await page.getByLabel('De',{exact:true}).fill('2026-10-01');
  await page.getByLabel('Até',{exact:true}).fill('2026-10-15');
  await expect.poll(()=>requests.at(-1)).toContain('end=2026-10-15');
  expect(requests.every(query=>new URLSearchParams(query).get('truck_id')==='7')).toBe(true);
  await expect(page.getByRole('link',{name:'Exportar manutenções XLSX'})).toHaveAttribute('href','/api/reports/export.xlsx?truck_id=7&start=2026-10-01&end=2026-10-15');
  for(const width of [320,390,540,768,1440]) {
    await page.setViewportSize({width,height:900});
    const boxes=await page.locator('.cost-filters > *').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
    for(let i=0;i<boxes.length;i++) {
      expect(boxes[i].left).toBeGreaterThanOrEqual(0);
      expect(boxes[i].right).toBeLessThanOrEqual(width);
      for(let j=i+1;j<boxes.length;j++) expect(boxes[i].right<=boxes[j].left||boxes[j].right<=boxes[i].left||boxes[i].bottom<=boxes[j].top||boxes[j].bottom<=boxes[i].top).toBe(true);
    }
  }
  await page.goto('/relatorios');
  await expect(page.getByRole('heading',{name:'Por caminhão',exact:true})).toBeVisible();
  await expect.poll(()=>new URLSearchParams(requests.at(-1)).has('truck_id')).toBe(false);
});
