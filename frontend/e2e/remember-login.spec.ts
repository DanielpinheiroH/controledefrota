import {test,expect} from '@playwright/test';
test('remember email after successful login, reopen and clear on opt-out',async({page})=>{
  let authenticated=false;
  const user={id:999,name:'Remember test',email:'remember@example.test',role:'USUARIO'};
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    let status=200;let body:unknown={};
    if(path==='/api/auth/login') {
      if(route.request().postDataJSON().password==='ValidTest8') {authenticated=true;body=user;}
      else {status=401;body={detail:'E-mail ou senha inválidos'};}
    } else if(path==='/api/auth/logout') {authenticated=false;}
    else if(path==='/api/auth/me') {status=authenticated?200:401;body=authenticated?user:{detail:'Faça login'};}
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('/usuarios');
  const remember=page.getByRole('checkbox',{name:'Lembrar de mim neste aparelho'});
  await expect(remember).not.toBeChecked();
  await page.getByLabel('E-mail',{exact:true}).fill(user.email);
  await page.getByLabel('Senha',{exact:true}).fill('InvalidTest8');
  await remember.check();
  await page.getByRole('button',{name:'Entrar no FrotaGest'}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('frotagest.remembered-email'))).toBeNull();
  await page.getByLabel('Senha',{exact:true}).fill('ValidTest8');
  await page.getByRole('button',{name:'Entrar no FrotaGest'}).click();
  await expect(page.getByText('Acesso reservado ao administrador.')).toBeVisible();
  await page.getByRole('button',{name:'Sair',exact:true}).click();
  await expect(page.getByRole('button',{name:'Entrar no FrotaGest'})).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('E-mail',{exact:true})).toHaveValue(user.email);
  await expect(remember).toBeChecked();
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('ValidTest8');
  await remember.uncheck();
  await page.reload();
  await expect(remember).not.toBeChecked();
  await expect(page.getByLabel('E-mail',{exact:true})).toHaveValue('');
});
