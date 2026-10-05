"""The company comes only from the authenticated session, never request filters."""
from sqlalchemy import select


def tenant_id(db):
    ident = db.info.get('tenant_id')
    if not isinstance(ident, int) or ident < 1:
        raise RuntimeError('Tenant context is required')
    return ident


def scoped(db, model):
    return select(model).where(model.tenant_id == tenant_id(db))
