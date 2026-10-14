"""Upgrade a populated legacy database without changing records/password hashes."""
import os
import pytest
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
                if table == 'mileage_history':
                    assert after.pop('reverted') is False
                    assert after.pop('maintenance_id') is None
                assert after == before
            assert connection.execute(text('SELECT id FROM tenants ORDER BY id')).scalars().all() == [1,3]
    finally:
        engine.dispose()
        with base.begin() as connection:
            connection.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        base.dispose()


@pytest.mark.parametrize('audit_offset', [1, -0.001])
def test_existing_maintenance_km_is_linked_to_its_completion(audit_offset):
    schema = 'legacy_km_' + uuid4().hex
    base = create_engine(os.environ['DATABASE_URL'])
    with base.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA {schema}'))
    engine = create_engine(os.environ['DATABASE_URL'], connect_args={'options':f'-csearch_path={schema}'})
    try:
        with engine.begin() as connection:
            cfg = Config('alembic.ini')
            cfg.attributes['connection'] = connection
            command.upgrade(cfg, 'a72b1130c901')
            connection.execute(text("INSERT INTO users (id,tenant_id,name,email,password_hash,role,active) VALUES (7,3,'Legacy','legacy@example.test','unchanged-hash','ADMIN',true)"))
            connection.execute(text("INSERT INTO trucks (id,tenant_id,plate,brand,model,mileage,mileage_updated_at,status,active,created_at) VALUES (9,3,'ABC1D23','Scania','R450',220000,now(),'DISPONIVEL',true,now())"))
            for ident, mileage, seconds in [(1,210000,1),(2,210000,4),(3,220000,6)]:
                connection.execute(text("""INSERT INTO maintenance
                    (id,tenant_id,truck_id,type,category,description,date,mileage,status,parts_cost,labor_cost,other_cost,total_cost,created_by,created_at)
                    VALUES (:id,3,9,'PREVENTIVA','Motor','Legacy',current_date,:km,'CONCLUIDA',0,0,0,0,7,now())"""), {'id':ident,'km':mileage})
                connection.execute(text("""INSERT INTO audit_logs
                    (tenant_id,user_id,action,entity,entity_id,created_at,details)
                    VALUES (3,7,'MANUTENCAO_CONCLUIDA','maintenance',:id,now()+make_interval(secs=>:seconds),'{}')"""),{'id':ident,'seconds':seconds+audit_offset})
                if ident != 2:  # Equal-KM maintenance did not change the odometer.
                    connection.execute(text("""INSERT INTO mileage_history
                        (id,tenant_id,truck_id,mileage,user_id,source,recorded_at)
                        VALUES (:id,3,9,:km,7,'MANUTENCAO',now()+make_interval(secs=>:seconds))"""),{'id':ident,'km':mileage,'seconds':seconds})
            command.upgrade(cfg, 'head')
            assert connection.execute(text('SELECT id,maintenance_id,reverted FROM mileage_history ORDER BY id')).all() == [(1,1,False),(3,3,False)]
    finally:
        engine.dispose()
        with base.begin() as connection:
            connection.execute(text(f'DROP SCHEMA {schema} CASCADE'))
        base.dispose()
