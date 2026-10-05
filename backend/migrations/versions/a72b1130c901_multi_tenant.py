"""Isolate companies; preserve every existing record in company 3."""
from alembic import op
import sqlalchemy as sa

revision = 'a72b1130c901'
down_revision = 'd0460406f62d'
branch_labels = None
depends_on = None

TABLES = ('users', 'trucks', 'workshops', 'mileage_history', 'maintenance_plans',
          'maintenance', 'maintenance_services', 'maintenance_parts', 'attachments', 'audit_logs')


def upgrade():
    tenants = op.create_table('tenants',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False))
    op.bulk_insert(tenants, [dict(id=1, name='Teste', active=True),
                             dict(id=3, name='Operação principal', active=True)])
    inspector = sa.inspect(op.get_bind())
    links = {table: inspector.get_foreign_keys(table) for table in TABLES}
    for table in TABLES:
        op.add_column(table, sa.Column('tenant_id', sa.Integer(), nullable=False, server_default='3'))
        op.create_foreign_key(f'fk_{table}_tenant', table, 'tenants', ['tenant_id'], ['id'])
        op.create_index(f'ix_{table}_tenant_id', table, ['tenant_id'])
        op.create_unique_constraint(f'uq_{table}_tenant_id', table, ['tenant_id', 'id'])
        op.alter_column(table, 'tenant_id', server_default=None)
    for table, fks in links.items():
        for fk in fks:
            column = fk['constrained_columns'][0]
            op.create_foreign_key(f'fk_{table}_{column}_tenant', table, fk['referred_table'],
                                  ['tenant_id', column], ['tenant_id', 'id'])
    for table, columns in [('users', ['email']), ('trucks', ['plate', 'chassis', 'renavam'])]:
        for constraint in inspector.get_unique_constraints(table):
            if constraint['column_names'] in [[column] for column in columns]:
                op.drop_constraint(constraint['name'], table, type_='unique')
        for column in columns:
            op.create_unique_constraint(f'uq_{table}_tenant_{column}', table, ['tenant_id', column])


def downgrade():
    # Global uniqueness cannot safely be restored after different tenants reuse an email/plate.
    raise RuntimeError('Restore the verified pre-migration backup; automatic tenant merging is unsafe.')
