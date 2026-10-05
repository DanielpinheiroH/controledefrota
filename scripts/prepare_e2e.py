"""Create isolated test schema and disposable credentials, never real fleet data."""
import json
import os
import secrets
import sys
from pathlib import Path
sys.path.insert(0, '/app')
from sqlalchemy import create_engine,text
from sqlalchemy.orm import Session
from alembic import command
from alembic.config import Config
from app.models import User
from app.auth import password_hash

url=os.environ['DATABASE_URL']
base=create_engine(url)
with base.begin() as connection:
    connection.execute(text('CREATE SCHEMA IF NOT EXISTS e2e'))
engine=create_engine(url,connect_args={'options':'-csearch_path=e2e'})
with engine.begin() as connection:
    cfg=Config('alembic.ini');cfg.attributes['connection']=connection
    command.upgrade(cfg,'head')
password=secrets.token_urlsafe(24)
email=f'e2e-{secrets.token_hex(5)}@example.test'
with Session(engine) as db:
    db.add(User(tenant_id=3,name='Validação E2E',email=email,role='ADMIN',password_hash=password_hash.hash(password)))
    db.commit()
output=Path('/validation/e2e-credentials.json')
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps({'email':email,'password':password}))
print('Usuário de teste criado no esquema e2e. Credenciais temporárias em arquivo ignorado pelo Git.')
