"""Upgrade a populated legacy database without changing records/password hashes."""
import os
from uuid import uuid4
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text


def test_legacy_data_preserved():
    schema = 'migration_' + uuid4().hex
    base = create_engine(os.environ['DATABASE_URL'])
    with base.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA {schema}'))
    engine = create_engine(os.environ['DATABASE_URL'], connect_args={'options':f'-csearch_path={schema}'})
    try:
        with engine.begin() as connection:
            cfg = Config('alembic.ini')
            cfg.attributes['connection'] = connection
            command.upgrade(cfg, 'd0460406f62d')
            connection.execute(text("INSERT INTO users (id,name,email,password_hash,role,active) VALUES (7,'Legacy','legacy@example.test','unchanged-hash','ADMIN',true)"))
            connection.execute(text("INSERT INTO trucks (id,plate,brand,model,mileage,mileage_updated_at,status,active,created_at) VALUES (9,'ABC1D23','Scania','R450',200000,now(),'DISPONIVEL',true,now())"))
            connection.execute(text("INSERT INTO mileage_history (truck_id,mileage,recorded_at,user_id,source) VALUES (9,200000,now(),7,'MANUAL')"))
            connection.execute(text("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ('unchanged-token',7,now()+interval '1 hour')"))
            snapshots = {table: connection.execute(text(f'SELECT row_to_json(t) FROM {table} t')).scalar_one()
                         for table in ('users','trucks','mileage_history','sessions')}
            command.upgrade(cfg, 'head')
            command.check(cfg)
            for table, before in snapshots.items():
                after = connection.execute(text(f'SELECT row_to_json(t) FROM {table} t')).scalar_one()
                if table != 'sessions':
                    assert after.pop('tenant_id') == 3
                assert after == before
            assert connection.execute(text('SELECT id FROM tenants ORDER BY id')).scalars().all() == [1,3]
    finally:
        engine.dispose()
        with base.begin() as connection:
            connection.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        base.dispose()
