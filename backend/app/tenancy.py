"""The company comes only from the authenticated session, never request filters."""
from sqlalchemy import select


def tenant_id(db):
    ident = db.info.get('tenant_id')
    if not isinstance(ident, int) or ident < 1:
        raise RuntimeError('Tenant context is required')
    return ident


def scoped(db, model):
    query = select(model).where(model.tenant_id == tenant_id(db))
    if model.__tablename__ in ('maintenance', 'maintenance_plans'):
        query = query.where(model.deleted.is_(False))
    elif model.__tablename__ == 'attachments':
        from .models import Maintenance
        visible = select(Maintenance.id).where(
            Maintenance.id == model.maintenance_id,
            Maintenance.tenant_id == model.tenant_id,
            Maintenance.deleted.is_(False)).exists()
        query = query.where(model.maintenance_id.is_(None) | visible)
    return query
