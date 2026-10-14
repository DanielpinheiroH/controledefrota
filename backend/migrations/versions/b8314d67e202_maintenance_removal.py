"""Track maintenance mileage changes and retain an audit trail for removals."""
from alembic import op
import sqlalchemy as sa

revision = 'b8314d67e202'
down_revision = 'a72b1130c901'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('maintenance', sa.Column('deleted', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('mileage_history', sa.Column('reverted', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('mileage_history', sa.Column('maintenance_id', sa.Integer(), nullable=True))
    op.create_index('ix_mileage_history_maintenance_id', 'mileage_history', ['maintenance_id'])
    op.create_foreign_key('fk_mileage_history_maintenance_id', 'mileage_history', 'maintenance', ['maintenance_id'], ['id'])
    op.create_foreign_key('fk_mileage_history_maintenance_id_tenant', 'mileage_history', 'maintenance', ['tenant_id','maintenance_id'], ['tenant_id','id'])
    # Legacy completions wrote a KM event and completion audit in the same
    # transaction; ORM flush order can timestamp the audit first. Match the
    # company/truck/KM/operator and first completion in this short time window.
    # Equal-KM completions never emitted a new mileage event.
    op.execute("""
        UPDATE mileage_history h SET maintenance_id = (
            SELECT m.id FROM maintenance m
            JOIN audit_logs a ON a.entity_id = m.id AND a.tenant_id = m.tenant_id
            WHERE m.tenant_id = h.tenant_id AND m.truck_id = h.truck_id
              AND m.mileage = h.mileage AND m.created_at <= h.recorded_at
              AND a.entity = 'maintenance' AND a.action = 'MANUTENCAO_CONCLUIDA'
              AND a.user_id = h.user_id AND a.created_at >= h.recorded_at - interval '30 seconds'
              AND a.created_at <= h.recorded_at + interval '30 seconds'
            ORDER BY a.created_at, a.id LIMIT 1
        ) WHERE h.source = 'MANUTENCAO'
    """)
    op.alter_column('maintenance', 'deleted', server_default=None)
    op.alter_column('mileage_history', 'reverted', server_default=None)


def downgrade():
    raise RuntimeError('Restore the pre-migration backup; dropping removal markers would revive deleted records.')
