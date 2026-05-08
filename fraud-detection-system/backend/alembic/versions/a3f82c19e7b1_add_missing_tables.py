"""add missing tables: alert_rules, alert_events, risk_rules, model_versions, model_feedback

Revision ID: a3f82c19e7b1
Revises: 7c9e2b1a4d5f
Create Date: 2026-05-07 23:50:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a3f82c19e7b1'
down_revision: Union[str, Sequence[str], None] = '7c9e2b1a4d5f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'alert_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('min_probability', sa.Float(), nullable=True),
        sa.Column('min_amount', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index(op.f('ix_alert_rules_id'), 'alert_rules', ['id'], unique=False)

    op.create_table(
        'risk_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('field', sa.String(length=64), nullable=False),
        sa.Column('operator', sa.String(length=16), nullable=False, server_default='gt'),
        sa.Column('value', sa.String(length=255), nullable=False),
        sa.Column('weight', sa.Float(), nullable=False, server_default='0.05'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index(op.f('ix_risk_rules_id'), 'risk_rules', ['id'], unique=False)

    op.create_table(
        'model_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('version', sa.String(length=64), nullable=False),
        sa.Column('model_type', sa.String(length=64), nullable=False, server_default='sklearn'),
        sa.Column('roc_auc', sa.Float(), nullable=True),
        sa.Column('pr_auc', sa.Float(), nullable=True),
        sa.Column('threshold', sa.Float(), nullable=True),
        sa.Column('feature_order_hash', sa.String(length=128), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('version'),
    )
    op.create_index(op.f('ix_model_versions_id'), 'model_versions', ['id'], unique=False)

    op.create_table(
        'alert_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rule_id', sa.Integer(), nullable=True),
        sa.Column('prediction_id', sa.Integer(), nullable=True),
        sa.Column('transaction_id', sa.Integer(), nullable=True),
        sa.Column('severity', sa.String(length=32), nullable=False, server_default='medium'),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('acknowledged', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['prediction_id'], ['fraud_predictions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['rule_id'], ['alert_rules.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_alert_events_id'), 'alert_events', ['id'], unique=False)
    op.create_index(op.f('ix_alert_events_created_at'), 'alert_events', ['created_at'], unique=False)

    op.create_table(
        'model_feedback',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('case_id', sa.Integer(), nullable=True),
        sa.Column('prediction_id', sa.Integer(), nullable=True),
        sa.Column('label', sa.String(length=32), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['case_id'], ['fraud_cases.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['prediction_id'], ['fraud_predictions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_model_feedback_id'), 'model_feedback', ['id'], unique=False)
    op.create_index(op.f('ix_model_feedback_created_at'), 'model_feedback', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('model_feedback')
    op.drop_table('alert_events')
    op.drop_table('model_versions')
    op.drop_table('risk_rules')
    op.drop_table('alert_rules')
