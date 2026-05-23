import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeploymentScopedOrchestration1716600000000 implements MigrationInterface {
  name = 'AddDeploymentScopedOrchestration1716600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('alter table bet_invites add column if not exists deployment_key text');
    await queryRunner.query("alter table relayer_attempts add column if not exists deployment_key text not null default 'legacy'");
    await queryRunner.query('alter table relayer_attempts add column if not exists locked_at timestamptz');
    await queryRunner.query("alter table indexed_chain_events add column if not exists deployment_key text not null default 'legacy'");
    await queryRunner.query("alter table indexed_bets add column if not exists deployment_key text not null default 'legacy'");
    await queryRunner.query("alter table indexer_cursors add column if not exists deployment_key text not null default 'legacy'");
    await queryRunner.query("alter table resolution_attempts add column if not exists deployment_key text not null default 'legacy'");
    await queryRunner.query('alter table relayer_attempts alter column deployment_key drop default');
    await queryRunner.query('alter table indexed_chain_events alter column deployment_key drop default');
    await queryRunner.query('alter table indexed_bets alter column deployment_key drop default');
    await queryRunner.query('alter table indexer_cursors alter column deployment_key drop default');
    await queryRunner.query('alter table resolution_attempts alter column deployment_key drop default');

    await queryRunner.query('drop index if exists idx_indexed_chain_events_unique');
    await queryRunner.query('drop index if exists idx_relayer_attempts_request_id');
    await queryRunner.query('alter table indexed_bets drop constraint if exists indexed_bets_pkey');
    await queryRunner.query('alter table indexed_bets add constraint indexed_bets_pkey primary key (deployment_key, bet_id)');

    await queryRunner.query('create index if not exists idx_bet_invites_deployment_key on bet_invites (deployment_key)');
    await queryRunner.query('create index if not exists idx_relayer_attempts_request_id on relayer_attempts (deployment_key, request_id)');
    await queryRunner.query('create index if not exists idx_relayer_attempts_pending on relayer_attempts (deployment_key, action, status, locked_at, created_at)');
    await queryRunner.query('create index if not exists idx_relayer_attempts_invite_action on relayer_attempts (deployment_key, invite_id, action, created_at)');
    await queryRunner.query('create index if not exists idx_relayer_attempts_tx on relayer_attempts (deployment_key, transaction_hash)');
    await queryRunner.query('create unique index if not exists idx_indexed_chain_events_unique on indexed_chain_events (deployment_key, transaction_hash, log_index)');
    await queryRunner.query('create index if not exists idx_indexed_bets_invite_deployment on indexed_bets (deployment_key, invite_id)');
    await queryRunner.query('create index if not exists idx_resolution_attempts_bet_deployment on resolution_attempts (deployment_key, bet_id, created_at)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop index if exists idx_resolution_attempts_bet_deployment');
    await queryRunner.query('drop index if exists idx_indexed_bets_invite_deployment');
    await queryRunner.query('drop index if exists idx_indexed_chain_events_unique');
    await queryRunner.query('drop index if exists idx_relayer_attempts_tx');
    await queryRunner.query('drop index if exists idx_relayer_attempts_invite_action');
    await queryRunner.query('drop index if exists idx_relayer_attempts_pending');
    await queryRunner.query('drop index if exists idx_relayer_attempts_request_id');
    await queryRunner.query('drop index if exists idx_bet_invites_deployment_key');
    await queryRunner.query('alter table indexed_bets drop constraint if exists indexed_bets_pkey');
    await queryRunner.query('alter table indexed_bets add constraint indexed_bets_pkey primary key (bet_id)');
    await queryRunner.query('create unique index if not exists idx_indexed_chain_events_unique on indexed_chain_events (transaction_hash, log_index)');
    await queryRunner.query('create index if not exists idx_relayer_attempts_request_id on relayer_attempts (request_id)');
    await queryRunner.query('alter table resolution_attempts drop column if exists deployment_key');
    await queryRunner.query('alter table indexer_cursors drop column if exists deployment_key');
    await queryRunner.query('alter table indexed_bets drop column if exists deployment_key');
    await queryRunner.query('alter table indexed_chain_events drop column if exists deployment_key');
    await queryRunner.query('alter table relayer_attempts drop column if exists locked_at');
    await queryRunner.query('alter table relayer_attempts drop column if exists deployment_key');
    await queryRunner.query('alter table bet_invites drop column if exists deployment_key');
  }
}
