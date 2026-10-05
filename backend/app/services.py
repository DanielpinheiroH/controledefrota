from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from dateutil.relativedelta import relativedelta
from fastapi import HTTPException
from sqlalchemy import select
from .tenancy import scoped, tenant_id
from .models import AuditLog, MileageHistory, Maintenance, MaintenancePart, MaintenanceService, Truck, now

def audit(db, user, action, entity, entity_id, details=None):
    db.add(AuditLog(tenant_id=tenant_id(db), user_id=user.id if user else None, action=action, entity=entity, entity_id=entity_id, details=details or {}))

def get_or_404(db, model, ident, lock=False):
    query = scoped(db, model).where(model.id == ident)
    if lock:
        query = query.with_for_update()
    obj = db.scalar(query)
    if obj is None:
        raise HTTPException(404, 'Registro não encontrado')
    return obj

def record_mileage(db, truck, km, user, notes=None, source='MANUAL'):
    if km < truck.mileage:
        raise HTTPException(422, 'A quilometragem não pode ser menor que a atual')
    truck.mileage = km
    truck.mileage_updated_at = now()
    db.add(MileageHistory(tenant_id=tenant_id(db), truck_id=truck.id, mileage=km, user_id=user.id, notes=notes, source=source))
    audit(db, user, 'KM_ATUALIZADO', 'truck', truck.id, {'mileage': km, 'source': source})

def plan_state(db, plan, truck, today=None):
    latest = db.scalar(scoped(db, Maintenance).where(Maintenance.plan_id == plan.id, Maintenance.status == 'CONCLUIDA').order_by(Maintenance.date.desc(), Maintenance.mileage.desc(), Maintenance.id.desc()))
    base_km, base_date = plan.baseline_km, plan.baseline_date
    if latest and latest.date >= base_date:
        base_km, base_date = latest.mileage, latest.date
    next_km = base_km + plan.interval_km if plan.interval_km else None
    next_date = base_date + relativedelta(months=plan.interval_months) if plan.interval_months else None
    km_left = next_km - truck.mileage if next_km is not None else None
    days_left = (next_date - (today or date.today())).days if next_date else None
    state = 'VERDE'
    if (km_left is not None and km_left <= 0) or (days_left is not None and days_left <= 0):
        state = 'VERMELHO'
    elif (km_left is not None and km_left <= plan.warning_km) or (days_left is not None and days_left <= plan.warning_days):
        state = 'AMARELO'
    return {'state': state, 'next_km': next_km, 'next_date': next_date, 'km_left': km_left, 'days_left': days_left, 'last_km': base_km, 'last_date': base_date, 'plate': truck.plate, 'truck_label': f'{truck.brand} {truck.model}'}

def money(value):
    return value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def add_items(db, maintenance, data):
    maintenance.labor_cost = sum((s.value for s in data.services), Decimal('0'))
    maintenance.parts_cost = sum((money(p.quantity * p.unit_price) for p in data.parts), Decimal('0'))
    maintenance.other_cost = data.other_cost
    maintenance.total_cost = maintenance.labor_cost + maintenance.parts_cost + maintenance.other_cost
    if maintenance.total_cost > Decimal('999999999999.99'):
        raise HTTPException(422, 'Custo total excede o limite permitido')
    db.flush()
    for service in data.services:
        db.add(MaintenanceService(tenant_id=tenant_id(db), maintenance_id=maintenance.id, **service.model_dump()))
    for part in data.parts:
        db.add(MaintenancePart(tenant_id=tenant_id(db), maintenance_id=maintenance.id, **part.model_dump(), total=money(part.quantity * part.unit_price)))
