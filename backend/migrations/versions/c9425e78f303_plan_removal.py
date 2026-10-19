"""Retain deleted preventive plans for maintenance history."""
from alembic import op
import sqlalchemy as sa

revision = 'c9425e78f303'
down_revision = 'b8314d67e202'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('maintenance_plans', sa.Column('deleted', sa.Boolean(), nullable=False, server_default=sa.false()))

def downgrade():
    op.drop_column('maintenance_plans', 'deleted')
