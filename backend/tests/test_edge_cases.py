from datetime import date
from io import BytesIO
from pypdf import PdfWriter
from test_flows import truck, maintenance

def test_user_password_minimum_eight(admin):
    data={'email':'eight@example.test','name':'Eight','role':'ADMIN','password':'Test123'}
    assert admin.post('/api/users',json=data).status_code==422
    data['password']='Test1234'
    assert admin.post('/api/users',json=data).status_code==201
    admin.post('/api/auth/logout')
    result=admin.post('/api/auth/login',json={'email':data['email'],'password':data['password']})
    assert result.status_code==200
    assert result.json()['role']=='ADMIN'

def test_active_pdf_rejected(admin):
    t=truck(admin)
    pdf=PdfWriter();pdf.add_blank_page(width=100,height=100);pdf.add_js('app.alert("test")')
    content=BytesIO();pdf.write(content)
    result=admin.post(f"/api/trucks/{t['id']}/attachments",files={'file':('active.pdf',content.getvalue(),'application/pdf')})
    assert result.status_code==422

def test_password_whitespace_is_preserved(admin):
    password='  ExactPasswordWithSpaces!  '
    result=admin.post('/api/users',json={'email':'space@example.test','name':'Espaço','password':password})
    assert result.status_code==201
    admin.post('/api/auth/logout')
    assert admin.post('/api/auth/login',json={'email':'space@example.test','password':password.strip()}).status_code==401
    assert admin.post('/api/auth/login',json={'email':'space@example.test','password':password}).status_code==200

def test_future_completion_and_negative_cost_rejected(admin):
    t=truck(admin)
    payload={'truck_id':t['id'],'type':'PREVENTIVA','category':'Motor','description':'Revisão','date':'2099-01-01','mileage':325000,'status':'CONCLUIDA'}
    assert admin.post('/api/maintenance',json=payload).status_code==422
    payload.update(date=str(date.today()),other_cost='-1')
    assert admin.post('/api/maintenance',json=payload).status_code==422

def test_editing_other_cost_keeps_constraint_consistent(admin):
    t=truck(admin)
    m=maintenance(admin,t['id'],status='ABERTA',other_cost='100.00')
    payload={k:m[k] for k in ['truck_id','type','category','description','date','mileage','status']}
    payload.update(other_cost='200.00',services=[{'description':'Serviço','value':'300.00'}])
    result=admin.put(f"/api/maintenance/{m['id']}",json=payload)
    assert result.status_code==200,result.text
    assert result.json()['total_cost']==500

def test_truck_200000_is_persisted_exactly(admin):
    t=truck(admin,mileage=200000)
    assert t['mileage']==200000
    assert admin.get(f"/api/trucks/{t['id']}").json()['mileage']==200000
    assert admin.get(f"/api/trucks/{t['id']}/mileage").json()['items'][0]['mileage']==200000

def test_workshop_typed_name_created_and_reused(admin):
    t=truck(admin)
    first=maintenance(admin,t['id'],workshop_name='Oficina Digitada')
    assert first['workshop_name']=='Oficina Digitada'
    second=maintenance(admin,t['id'],workshop_name='  oficina digitada  ')
    assert second['workshop_id']==first['workshop_id']
    assert admin.get('/api/workshops').json()['total']==1

def test_workshop_not_created_for_invalid_maintenance(admin):
    t=truck(admin)
    data={'truck_id':t['id'],'type':'PREVENTIVA','category':'Motor','description':'Teste','date':'2099-01-01','mileage':200000,'status':'CONCLUIDA','workshop_name':'Não criar'}
    assert admin.post('/api/maintenance',json=data).status_code==422
    assert admin.get('/api/workshops').json()['total']==0

def test_delete_truck_filters_active_preserves_history_and_requires_admin(admin):
    t=truck(admin)
    m=maintenance(admin,t['id'])
    assert admin.delete(f"/api/trucks/{t['id']}").status_code==200
    assert admin.get('/api/trucks?active=true').json()['total']==0
    assert admin.get('/api/trucks?active=false').json()['total']==1
    assert admin.get('/api/trucks').json()['total']==1
    assert admin.get(f"/api/maintenance/{m['id']}").status_code==200
    assert admin.get(f"/api/trucks/{t['id']}/mileage").json()['total']>=1
    admin.post('/api/auth/logout')
    admin.post('/api/auth/login',json={'email':'reader@example.test','password':'TestingPassword123!'})
    assert admin.delete(f"/api/trucks/{t['id']}").status_code==403
