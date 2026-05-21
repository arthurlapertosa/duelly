import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrchestrationTables1716200000000 implements MigrationInterface {
  name = 'CreateOrchestrationTables1716200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      create table if not exists user_accounts (
        id text primary key,
        email text not null unique,
        display_identifier text not null,
        password_hash text not null,
        created_at timestamptz not null,
        updated_at timestamptz not null
      )
    `);
    await queryRunner.query(`
      create table if not exists auth_sessions (
        id text primary key,
        user_id text not null,
        token_hash text not null unique,
        expires_at timestamptz not null,
        created_at timestamptz not null,
        revoked_at timestamptz
      )
    `);
    await queryRunner.query(`
      create table if not exists wallet_challenges (
        id text primary key,
        user_id text not null,
        address text not null,
        chain_id integer not null,
        nonce text not null,
        message text not null,
        expires_at timestamptz not null,
        created_at timestamptz not null,
        used_at timestamptz
      )
    `);
    await queryRunner.query(`
      create table if not exists linked_wallets (
        id text primary key,
        user_id text not null,
        address text not null unique,
        chain_id integer not null,
        active boolean not null,
        verified_at timestamptz not null,
        created_at timestamptz not null
      )
    `);
    await queryRunner.query(`
      create table if not exists bet_invites (
        id text primary key,
        maker_user_id text not null,
        taker_user_id text,
        template_hash text not null,
        condition_id text not null,
        maker_address text not null,
        taker_address text,
        maker_outcome_index integer not null,
        taker_outcome_index integer,
        stake text not null,
        loser_fee text not null,
        offer_nonce text not null,
        acceptance_nonce text,
        offer_hash text not null,
        offer_payload jsonb not null,
        acceptance_payload jsonb,
        status text not null,
        bet_id text,
        expires_at timestamptz not null,
        created_at timestamptz not null,
        updated_at timestamptz not null
      )
    `);
    await queryRunner.query(`
      create table if not exists relayer_attempts (
        id text primary key,
        request_id text not null,
        invite_id text,
        action text not null,
        status text not null,
        transaction_hash text,
        bet_id text,
        error text,
        payload jsonb,
        created_at timestamptz not null
      )
    `);
    await queryRunner.query(`
      create table if not exists indexed_chain_events (
        id text primary key,
        event_name text not null,
        transaction_hash text not null,
        log_index integer not null,
        block_number text not null,
        args jsonb not null,
        created_at timestamptz not null
      )
    `);
    await queryRunner.query(`
      create table if not exists indexed_bets (
        bet_id text primary key,
        invite_id text,
        template_hash text not null,
        condition_id text not null,
        player_a text not null,
        player_b text not null,
        player_a_outcome_index integer not null,
        player_b_outcome_index integer not null,
        stake text not null,
        loser_fee text not null,
        status text not null,
        winner text,
        winner_payout text,
        treasury_payout text,
        source_transaction_hash text not null,
        source_block_number text not null,
        updated_at timestamptz not null
      )
    `);
    await queryRunner.query(`
      create table if not exists indexer_cursors (
        id text primary key,
        last_block_number text not null,
        updated_at timestamptz not null
      )
    `);
    await queryRunner.query(`
      create table if not exists resolution_attempts (
        id text primary key,
        bet_id text not null,
        status text not null,
        transaction_hash text,
        block_number text,
        error text,
        created_at timestamptz not null
      )
    `);
    await queryRunner.query('create index if not exists idx_bet_invites_template_hash on bet_invites (template_hash)');
    await queryRunner.query('create index if not exists idx_bet_invites_bet_id on bet_invites (bet_id)');
    await queryRunner.query('create index if not exists idx_relayer_attempts_request_id on relayer_attempts (request_id)');
    await queryRunner.query('create unique index if not exists idx_indexed_chain_events_unique on indexed_chain_events (transaction_hash, log_index)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop table if exists resolution_attempts');
    await queryRunner.query('drop table if exists indexer_cursors');
    await queryRunner.query('drop table if exists indexed_bets');
    await queryRunner.query('drop table if exists indexed_chain_events');
    await queryRunner.query('drop table if exists relayer_attempts');
    await queryRunner.query('drop table if exists bet_invites');
    await queryRunner.query('drop table if exists linked_wallets');
    await queryRunner.query('drop table if exists wallet_challenges');
    await queryRunner.query('drop table if exists auth_sessions');
    await queryRunner.query('drop table if exists user_accounts');
  }
}
