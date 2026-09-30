import argparse
import getpass
from datetime import date
from decimal import Decimal
from sqlalchemy import select
from .db import SessionLocal
from .models import User, Truck, Workshop, MaintenancePlan
from .auth import password_hash
from .schemas import TruckCreate, MaintenanceInput, PlanInput
from .main import create_truck, create_maintenance, create_plan

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['create-admin','seed'])
    parser.add_argument('--email')
    parser.add_argument('--name', default='Administrador')
    args = parser.parse_args()
    with SessionLocal() as db:
        if args.command == 'create-admin':
            email = (args.email or input('E-mail: ')).strip().lower()
            if '@' not in email or db.scalar(select(User).where(User.email == email)):
                raise SystemExit('E-mail inválido ou já cadastrado')
            password = getpass.getpass('Senha (mínimo 8 caracteres): ')
            if len(password) < 8 or len(password) > 128 or password != getpass.getpass('Confirme a senha: '):
                raise SystemExit('Senha inválida ou confirmação diferente')
            db.add(User(name=args.name, email=email, password_hash=password_hash.hash(password), role='ADMIN'))
            db.commit()
            print('Administrador criado.')
        else:
            admin = db.scalar(select(User).where(User.role == 'ADMIN'))
            if not admin:
                raise SystemExit('Crie um administrador primeiro.')
            if db.scalar(select(Truck).where(Truck.plate == 'ABC1D23')):
                raise SystemExit('Caminhão demonstrativo já existe; nenhum dado alterado.')
            truck = create_truck(TruckCreate(plate='ABC1D23', brand='Scania', model='R450', mileage=337850, manufacture_year=2020, model_year=2021, color='Branco'), db, admin)
            workshop = Workshop(name='Oficina Demonstração', phone='(11) 99999-0000')
            db.add(workshop)
            db.commit()
            maintenance = create_maintenance(MaintenanceInput(truck_id=truck['id'], workshop_id=workshop.id, type='PREVENTIVA', category='Motor', description='Troca de óleo', date=date.today(), mileage=325400, status='CONCLUIDA', services=[{'description':'Troca e revisão','value':'600.00'}], parts=[{'name':'Óleo 15W40','quantity':'20','unit_price':'34.00'}]), db, admin)
            create_plan(PlanInput(truck_id=truck['id'], name='Troca de óleo', interval_km=15000, baseline_km=325400, baseline_date=date.today(), warning_km=3000, last_maintenance_id=maintenance['id']), db, admin)
            print('Dados fictícios criados. Seed nunca é executado automaticamente.')

if __name__ == '__main__':
    main()
