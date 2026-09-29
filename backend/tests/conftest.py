import os
from uuid import uuid4
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.db import get_db
from app.main import app, attempts
from app.models import User
from app.auth import password_hash

@pytest.fixture(scope='session')
def test_engine():
    # Separate schema, real PostgreSQL and real migrations; no production tables touched.
    schema = 'test_' + uuid4().hex
    url = os.environ['DATABASE_URL']
    admin_engine = create_engine(url)
    with admin_engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA {schema}'))
    engine = create_engine(url, connect_args={'options': f'-csearch_path={schema}'})
    with engine.begin() as connection:
        config = Config('alembic.ini')
        config.attributes['connection'] = connection
        command.upgrade(config, 'head')
    yield engine
    engine.dispose()
    with admin_engine.begin() as connection:
        connection.execute(text(f'DROP SCHEMA {schema} CASCADE'))
    admin_engine.dispose()

@pytest.fixture
def client(test_engine):
    connection = test_engine.connect()
    transaction = connection.begin()
    factory = sessionmaker(bind=connection, join_transaction_mode='create_savepoint', expire_on_commit=False)
    with factory() as db:
        db.add(User(name='Admin Teste',email='admin@example.test',role='ADMIN',password_hash=password_hash.hash('TestingPassword123!')))
        db.add(User(name='Consulta',email='reader@example.test',role='USUARIO',password_hash=password_hash.hash('TestingPassword123!')))
        db.commit()
    def override():
        with factory() as db:
            yield db
    app.dependency_overrides[get_db] = override
    attempts.clear()
    with TestClient(app, headers={'X-Requested-With':'FrotaGest'}) as client:
        yield client
    app.dependency_overrides.clear()
    transaction.rollback()
    connection.close()

@pytest.fixture
def admin(client):
    assert client.post('/api/auth/login', json={'email':'admin@example.test','password':'TestingPassword123!'}).status_code == 200
    return client
