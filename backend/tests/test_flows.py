from datetime import date, timedelta
from decimal import Decimal
import io
import pytest
from PIL import Image
from pypdf import PdfWriter
from app.main import attempts

def truck(client, plate='ABC1D23', mileage=325000):
    response = client.post('/api/trucks',json={'plate':plate,'brand':'Scania','model':'R450','mileage':mileage})
    assert response.status_code == 201, response.text
    return response.json()

def maintenance(client, truck_id, mileage=330000, **extra):
    data = {'truck_id':truck_id,'type':'PREVENTIVA','category':'Motor','description':'Troca de óleo','date':str(date.today()),'mileage':mileage,'status':'CONCLUIDA','services':[{'description':'Troca de óleo','value':'1200.00'}]}
    data.update(extra)
    response=client.post('/api/maintenance',json=data)
    assert response.status_code == 201,response.text
    return response.json()

def plan(client, truck_id, **extra):
    data={'truck_id':truck_id,'name':'Troca de óleo','interval_km':15000,'baseline_km':330000,'baseline_date':str(date.today()),'warning_km':2000}
    data.update(extra)
    response=client.post('/api/maintenance-plans',json=data)
    assert response.status_code == 201,response.text
    return response.json()

def test_critical_preventive_flow_and_history(admin):
    t=truck(admin)
    assert t['mileage']==325000
    assert admin.post(f"/api/trucks/{t['id']}/mileage",json={'mileage':330000}).status_code==201
    first=maintenance(admin,t['id'])
    assert Decimal(str(first['total_cost']))==Decimal('1200.00')
    p=plan(admin,t['id'],last_maintenance_id=first['id'])
    assert p['next_km']==345000
    for value,state,remaining in [(343500,'AMARELO',1500),(345500,'VERMELHO',-500)]:
        assert admin.post(f"/api/trucks/{t['id']}/mileage",json={'mileage':value}).status_code==201
        alert=admin.get('/api/alerts').json()[0]
        assert (alert['state'],alert['km_left'])==(state,remaining)
    second=maintenance(admin,t['id'],345500,plan_id=p['id'])
    renewed=admin.get('/api/alerts').json()[0]
    assert renewed['next_km']==360500
    assert renewed['state']=='VERDE'
    history=admin.get(f"/api/maintenance?truck_id={t['id']}").json()
    assert {x['id'] for x in history['items']}=={first['id'],second['id']}
    mileage_history=admin.get(f"/api/trucks/{t['id']}/mileage").json()
    assert [x['mileage'] for x in mileage_history['items']]==[345500,343500,330000,325000]
    assert admin.get('/api/reports/costs').json()['total']==2400
    assert admin.get('/api/dashboard').json()['overdue']==0
    assert admin.get('/api/auth/me').status_code==200

def test_auth_login_cookie_logout(client):
    assert client.get('/api/trucks').status_code==401
    assert client.post('/api/auth/login',json={'email':'admin@example.test','password':'wrong'}).status_code==401
    response=client.post('/api/auth/login',json={'email':'admin@example.test','password':'TestingPassword123!'})
    assert response.status_code==200
    assert 'HttpOnly' in response.headers['set-cookie']
    assert 'SameSite=strict' in response.headers['set-cookie']
    assert 'password_hash' not in response.text
    assert client.post('/api/auth/logout').status_code==200
    assert client.get('/api/auth/me').status_code==401

def test_reader_permissions(client):
    assert client.post('/api/auth/login',json={'email':'reader@example.test','password':'TestingPassword123!'}).status_code==200
    for path in ['/api/trucks','/api/maintenance','/api/alerts','/api/reports/costs','/api/dashboard','/api/workshops']:
        assert client.get(path).status_code==200
    for path in ['/api/trucks','/api/maintenance','/api/workshops','/api/maintenance-plans','/api/users']:
        assert client.post(path,json={}).status_code==403
    assert client.get('/api/users').status_code==403
    assert client.get('/api/audit').status_code==403

def test_csrf_and_security_headers(admin):
    assert admin.post('/api/auth/logout',headers={'Origin':'https://evil.test'}).status_code==403
    assert admin.post('/api/auth/logout',headers={'X-Requested-With':''}).status_code==403
    response=admin.get('/api/trucks')
    assert response.headers['cache-control']=='no-store'
    assert response.headers['x-content-type-options']=='nosniff'

def test_login_rate_limit(client):
    for _ in range(10):
        assert client.post('/api/auth/login',json={'email':'none','password':'wrong'}).status_code==401
    assert client.post('/api/auth/login',json={'email':'none','password':'wrong'}).status_code==429

def test_truck_duplicate_edit_inactivation(admin):
    t=truck(admin)
    assert admin.post('/api/trucks',json={'plate':'ABC-1D23','brand':'Volvo','model':'FH'}).status_code==409
    edited=admin.put(f"/api/trucks/{t['id']}",json={'plate':'ABC1D23','brand':'Scania','model':'R450 Plus','status':'PARADO'})
    assert edited.status_code==200
    assert edited.json()['mileage']==325000
    assert admin.get('/api/trucks?q=Plus').json()['total']==1
    assert admin.delete(f"/api/trucks/{t['id']}").status_code==200
    assert admin.get(f"/api/trucks/{t['id']}").json()['active'] is False
    assert admin.get(f"/api/trucks/{t['id']}/mileage").json()['total']==1

@pytest.mark.parametrize('payload',[{'mileage':-1},{'mileage':324999},{'mileage':330000.5}])
def test_invalid_mileage_rejected(admin,payload):
    t=truck(admin)
    assert admin.post(f"/api/trucks/{t['id']}/mileage",json=payload).status_code==422
    assert admin.get(f"/api/trucks/{t['id']}").json()['mileage']==325000

def test_decimal_parts_services_completion_cancel(admin):
    t=truck(admin)
    workshop=admin.post('/api/workshops',json={'name':'Oficina Exemplo'}).json()
    m=maintenance(admin,t['id'],status='ABERTA',workshop_id=workshop['id'],services=[{'description':'Serviço','value':'0.10'}],parts=[{'name':'Óleo','quantity':'3.333','unit_price':'0.10'}],other_cost='0.20')
    assert Decimal(str(m['total_cost']))==Decimal('0.63')
    assert admin.get('/api/reports/costs').json()['total']==0
    payload={k:m[k] for k in ['truck_id','type','category','description','date','mileage','workshop_id','other_cost']}
    payload.update(status='CONCLUIDA',services=[{'description':'Serviço','value':'0.10'}],parts=[{'name':'Óleo','quantity':'3.333','unit_price':'0.10'}])
    assert admin.put(f"/api/maintenance/{m['id']}",json=payload).status_code==200
    assert admin.get('/api/reports/costs').json()['total']==.63
    assert admin.put(f"/api/maintenance/{m['id']}",json=payload).status_code==409
    assert admin.delete(f"/api/maintenance/{m['id']}").status_code==200
    assert admin.get('/api/reports/costs').json()['total']==0
    assert len(admin.get(f"/api/maintenance/{m['id']}").json()['parts'])==1

def test_cancel_recalculates_without_removing_history(admin):
    t=truck(admin,mileage=345500)
    p=plan(admin,t['id'])
    m=maintenance(admin,t['id'],345500,plan_id=p['id'])
    assert admin.get('/api/alerts').json()[0]['next_km']==360500
    admin.delete(f"/api/maintenance/{m['id']}")
    assert admin.get('/api/alerts').json()[0]['next_km']==345000
    assert admin.get('/api/maintenance').json()['total']==1

def test_time_or_km_first_limit(admin):
    t=truck(admin,mileage=330000)
    p=plan(admin,t['id'],interval_months=1,baseline_date=str(date.today()-timedelta(days=40)))
    assert p['state']=='VERMELHO'
    assert p['km_left']==15000
    assert p['days_left']<0

def test_plan_requires_interval_and_valid_truck(admin):
    t=truck(admin)
    data={'truck_id':t['id'],'name':'Revisão','baseline_km':325000,'baseline_date':str(date.today())}
    assert admin.post('/api/maintenance-plans',json=data).status_code==422
    data.update(interval_km=15000,baseline_km=999999)
    assert admin.post('/api/maintenance-plans',json=data).status_code==422

def test_plan_cannot_link_other_truck(admin):
    first=truck(admin,mileage=330000)
    second=truck(admin,'DEF4G56',330000)
    p=plan(admin,first['id'])
    response=admin.post('/api/maintenance',json={'truck_id':second['id'],'plan_id':p['id'],'type':'PREVENTIVA','category':'Motor','description':'Troca','date':str(date.today()),'mileage':330000})
    assert response.status_code==422

def test_workshop_history_and_edit(admin):
    t=truck(admin)
    w=admin.post('/api/workshops',json={'name':'Mecânica','phone':'11999999999'}).json()
    maintenance(admin,t['id'],workshop_id=w['id'])
    assert admin.get(f"/api/maintenance?workshop_id={w['id']}").json()['total']==1
    assert admin.put(f"/api/workshops/{w['id']}",json={'name':'Mecânica Revisada','active':False}).status_code==200
    assert admin.get('/api/workshops?q=Revisada').json()['total']==1

def test_upload_image_and_authenticated_download(admin):
    t=truck(admin)
    image=io.BytesIO();Image.new('RGB',(20,20),'green').save(image,'PNG')
    response=admin.post(f"/api/trucks/{t['id']}/attachments",data={'kind':'FOTO'},files={'file':('photo.png',image.getvalue(),'image/png')})
    assert response.status_code==201,response.text
    a=response.json()
    assert 'storage_key' not in a
    assert admin.get(f"/api/attachments/{a['id']}/download").headers['content-type']=='image/jpeg'
    admin.post('/api/auth/logout')
    assert admin.get(f"/api/attachments/{a['id']}/download").status_code==401

def test_upload_pdf_and_invalid_file(admin):
    t=truck(admin)
    writer=PdfWriter();writer.add_blank_page(width=200,height=200);buffer=io.BytesIO();writer.write(buffer)
    assert admin.post(f"/api/trucks/{t['id']}/attachments",files={'file':('nota.pdf',buffer.getvalue(),'application/pdf')}).status_code==201
    assert admin.post(f"/api/trucks/{t['id']}/attachments",files={'file':('fake.png',b'<script>bad</script>','image/png')}).status_code==422
    assert admin.post(f"/api/trucks/{t['id']}/attachments",files={'file':('large.png',b'x'*(10*1024*1024+1),'image/png')}).status_code==413

def test_reports_export_and_period(admin):
    t=truck(admin)
    maintenance(admin,t['id'])
    response=admin.get('/api/reports/export.xlsx')
    assert response.status_code==200
    assert response.content[:2]==b'PK'
    assert admin.get('/api/reports/costs?start=2026-12-31&end=2026-01-01').status_code==422
    assert admin.get('/api/maintenance?start=2000-01-01&end=2000-12-31').json()['total']==0

def test_user_creation_and_audit(admin):
    response=admin.post('/api/users',json={'name':'Novo usuário','email':'new@example.test','password':'StrongTestPassword!','role':'USUARIO'})
    assert response.status_code==201
    assert 'password_hash' not in response.text
    assert admin.post('/api/users',json={'name':'Fraco','email':'weak@example.test','password':'123','role':'ADMIN'}).status_code==422
    assert 'USUARIO_CRIADO' in [a['action'] for a in admin.get('/api/audit').json()['items']]
