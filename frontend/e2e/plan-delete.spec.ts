import {test,expect} from '@playwright/test';

test('admin can confirm deletion of a preventive plan; reader cannot',async({page})=>{
 let removed=false, role='ADMIN';
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let body:unknown=[];
  if(path==='/api/auth/me')body={id:1,tenant_id:1,name:'Teste',role};
  if(path==='/api/trucks/7')body={id:7,plate:'ABC1D23',brand:'Scania',model:'R450',mileage:200000,mileage_updated_at:'2026-10-19',active:true,status:'DISPONIVEL'};
  if(path==='/api/maintenance-plans')body=removed?[]:[{id:9,truck_id:7,name:'Troca de óleo',active:true,state:'VERDE',last_km:200000,last_date:'2026-10-19',next_km:210000,next_date:null,km_left:10000,days_left:null}];
  if(path==='/api/maintenance-plans/9'&&route.request().method()==='DELETE'){removed=true;body={deleted:true};}
  await route.fulfill({json:body});
 });
 await page.goto('/frota/7?tab=preventivas');
 page.once('dialog',dialog=>dialog.dismiss());
 await page.getByRole('button',{name:'Excluir plano',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Troca de óleo'})).toBeVisible();
 expect(removed).toBe(false);
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Excluir plano',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Troca de óleo'})).toHaveCount(0);
 expect(removed).toBe(true);
 removed=false;role='USUARIO';
 await page.reload();
 await expect(page.getByRole('heading',{name:'Troca de óleo'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Excluir plano',exact:true})).toHaveCount(0);
});
