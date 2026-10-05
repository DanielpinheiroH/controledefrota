from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, UniqueConstraint, ForeignKeyConstraint, Numeric, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

def now():
    return datetime.now(timezone.utc)

class Tenant(Base):
    __tablename__ = 'tenants'
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(120))
    active: Mapped[bool] = mapped_column(default=True)

class TenantOwned:
    tenant_id: Mapped[int] = mapped_column(ForeignKey('tenants.id'), index=True)

class User(TenantOwned, Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default='USUARIO')
    active: Mapped[bool] = mapped_column(default=True)
    __table_args__ = (CheckConstraint("role IN ('ADMIN', 'USUARIO')"),)

class Session(Base):
    __tablename__ = 'sessions'
    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

class Truck(TenantOwned, Base):
    __tablename__ = 'trucks'
    id: Mapped[int] = mapped_column(primary_key=True)
    plate: Mapped[str] = mapped_column(String(7))
    brand: Mapped[str] = mapped_column(String(80))
    model: Mapped[str] = mapped_column(String(100))
    version: Mapped[str | None] = mapped_column(String(100))
    manufacture_year: Mapped[int | None]
    model_year: Mapped[int | None]
    chassis: Mapped[str | None] = mapped_column(String(40))
    renavam: Mapped[str | None] = mapped_column(String(20))
    color: Mapped[str | None] = mapped_column(String(60))
    mileage: Mapped[int] = mapped_column(default=0)
    mileage_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    driver: Mapped[str | None] = mapped_column(String(120))
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default='DISPONIVEL')
    active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (CheckConstraint('mileage >= 0'), CheckConstraint("status IN ('DISPONIVEL','EM_MANUTENCAO','PARADO','INATIVO')"))

class MileageHistory(TenantOwned, Base):
    __tablename__ = 'mileage_history'
    id: Mapped[int] = mapped_column(primary_key=True)
    truck_id: Mapped[int] = mapped_column(ForeignKey('trucks.id'), index=True)
    mileage: Mapped[int]
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    source: Mapped[str] = mapped_column(String(30), default='MANUAL')
    notes: Mapped[str | None] = mapped_column(Text)
    __table_args__ = (CheckConstraint('mileage >= 0'),)

class Workshop(TenantOwned, Base):
    __tablename__ = 'workshops'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    document: Mapped[str | None] = mapped_column(String(20))
    phone: Mapped[str | None] = mapped_column(String(30))
    whatsapp: Mapped[str | None] = mapped_column(String(30))
    address: Mapped[str | None] = mapped_column(String(300))
    contact: Mapped[str | None] = mapped_column(String(120))
    notes: Mapped[str | None] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(default=True)

class MaintenancePlan(TenantOwned, Base):
    __tablename__ = 'maintenance_plans'
    id: Mapped[int] = mapped_column(primary_key=True)
    truck_id: Mapped[int] = mapped_column(ForeignKey('trucks.id'), index=True)
    name: Mapped[str] = mapped_column(String(160))
    interval_km: Mapped[int | None]
    interval_months: Mapped[int | None]
    baseline_km: Mapped[int]
    baseline_date: Mapped[datetime] = mapped_column(Date)
    warning_km: Mapped[int] = mapped_column(default=2000)
    warning_days: Mapped[int] = mapped_column(default=15)
    active: Mapped[bool] = mapped_column(default=True)
    __table_args__ = (CheckConstraint('interval_km > 0 OR interval_months > 0'), CheckConstraint('interval_km IS NULL OR interval_km > 0'), CheckConstraint('interval_months IS NULL OR interval_months > 0'), CheckConstraint('baseline_km >= 0 AND warning_km >= 0 AND warning_days >= 0'))

class Maintenance(TenantOwned, Base):
    __tablename__ = 'maintenance'
    id: Mapped[int] = mapped_column(primary_key=True)
    truck_id: Mapped[int] = mapped_column(ForeignKey('trucks.id'), index=True)
    workshop_id: Mapped[int | None] = mapped_column(ForeignKey('workshops.id'))
    plan_id: Mapped[int | None] = mapped_column(ForeignKey('maintenance_plans.id'), index=True)
    type: Mapped[str] = mapped_column(String(20))
    category: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(500))
    date: Mapped[datetime] = mapped_column(Date, index=True)
    mileage: Mapped[int]
    status: Mapped[str] = mapped_column(String(25), default='ABERTA')
    notes: Mapped[str | None] = mapped_column(Text)
    parts_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    labor_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    other_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    created_by: Mapped[int] = mapped_column(ForeignKey('users.id'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (CheckConstraint('mileage >= 0'), CheckConstraint('parts_cost >= 0 AND labor_cost >= 0 AND other_cost >= 0 AND total_cost = parts_cost + labor_cost + other_cost'), CheckConstraint("type IN ('PREVENTIVA','CORRETIVA')"), CheckConstraint("status IN ('ABERTA','AGENDADA','EM_ANDAMENTO','CONCLUIDA','CANCELADA')"))

class MaintenanceService(TenantOwned, Base):
    __tablename__ = 'maintenance_services'
    id: Mapped[int] = mapped_column(primary_key=True)
    maintenance_id: Mapped[int] = mapped_column(ForeignKey('maintenance.id'), index=True)
    description: Mapped[str] = mapped_column(String(300))
    value: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    __table_args__ = (CheckConstraint('value >= 0'),)

class MaintenancePart(TenantOwned, Base):
    __tablename__ = 'maintenance_parts'
    id: Mapped[int] = mapped_column(primary_key=True)
    maintenance_id: Mapped[int] = mapped_column(ForeignKey('maintenance.id'), index=True)
    name: Mapped[str] = mapped_column(String(160))
    reference: Mapped[str | None] = mapped_column(String(120))
    manufacturer: Mapped[str | None] = mapped_column(String(120))
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    __table_args__ = (CheckConstraint('quantity > 0 AND unit_price >= 0 AND total >= 0'),)

class Attachment(TenantOwned, Base):
    __tablename__ = 'attachments'
    id: Mapped[int] = mapped_column(primary_key=True)
    truck_id: Mapped[int] = mapped_column(ForeignKey('trucks.id'), index=True)
    maintenance_id: Mapped[int | None] = mapped_column(ForeignKey('maintenance.id'))
    filename: Mapped[str] = mapped_column(String(200))
    storage_key: Mapped[str] = mapped_column(String(80), unique=True)
    mime: Mapped[str] = mapped_column(String(80))
    kind: Mapped[str] = mapped_column(String(30), default='DOCUMENTO')
    size: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class AuditLog(TenantOwned, Base):
    __tablename__ = 'audit_logs'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'))
    action: Mapped[str] = mapped_column(String(80))
    entity: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[int | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    details: Mapped[dict] = mapped_column(JSON, default=dict)

# Composite constraints also reject cross-company references at database level.
for model in (User, Truck, MileageHistory, Workshop, MaintenancePlan, Maintenance,
              MaintenanceService, MaintenancePart, Attachment, AuditLog):
    table = model.__table__
    table.append_constraint(UniqueConstraint('tenant_id', 'id', name=f'uq_{table.name}_tenant_id'))
    for column in list(table.columns):
        if column.name == 'tenant_id':
            continue
        for fk in list(column.foreign_keys):
            parent = fk.target_fullname.split('.')[0]
            table.append_constraint(ForeignKeyConstraint(
                ['tenant_id', column.name], [f'{parent}.tenant_id', f'{parent}.id'],
                name=f'fk_{table.name}_{column.name}_tenant'))
for model, columns in ((User, ['email']), (Truck, ['plate', 'chassis', 'renavam'])):
    for column in columns:
        model.__table__.append_constraint(UniqueConstraint('tenant_id', column,
            name=f'uq_{model.__tablename__}_tenant_{column}'))
