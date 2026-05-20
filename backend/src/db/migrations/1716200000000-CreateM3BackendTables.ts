import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateM3BackendTables1716200000000 implements MigrationInterface {
  name = 'CreateM3BackendTables1716200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      create table if not exists m3_users (
        id text primary key,
        email text not null unique,
        display_identifier text not null,
        password_hash text not null,
        created_at timestamptz not null,
        updated_at timestamptz not null
      )
    `);
    await queryRunner.query(`
      create table if not exists m3_sessions (
        id text primary key,
        user_id text not null,
        token_hash text not null unique,
        expires_at timestamptz not null,
        created_at timestamptz not null,
        revoked_at timestamptz
      )
    `);
    await queryRunner.query(`
      create table if not exists m3_wallet_challenges (
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
      create table if not exists m3_wallets (
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
      create table if not exists m3_invites (
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
      create table if not exists m3_relayer_attempts (
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
      create table if not exists m3_indexed_events (
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
      create table if not exists m3_indexed_bets (
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
      create table if not exists m3_indexer_cursors (
        id text primary key,
        last_block_number text not null,
        updated_at timestamptz not null
      )
    `);
    await queryRunner.query(`
      create table if not exists m3_resolution_attempts (
        id text primary key,
        bet_id text not null,
        status text not null,
        transaction_hash text,
        block_number text,
        error text,
        created_at timestamptz not null
      )
    `);
    await queryRunner.query('create index if not exists idx_m3_invites_template_hash on m3_invites (template_hash)');
    await queryRunner.query('create index if not exists idx_m3_invites_bet_id on m3_invites (bet_id)');
    await queryRunner.query('create index if not exists idx_m3_relayer_attempts_request_id on m3_relayer_attempts (request_id)');
    await queryRunner.query('create unique index if not exists idx_m3_indexed_events_unique on m3_indexed_events (transaction_hash, log_index)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop table if exists m3_resolution_attempts');
    await queryRunner.query('drop table if exists m3_indexer_cursors');
    await queryRunner.query('drop table if exists m3_indexed_bets');
    await queryRunner.query('drop table if exists m3_indexed_events');
    await queryRunner.query('drop table if exists m3_relayer_attempts');
    await queryRunner.query('drop table if exists m3_invites');
    await queryRunner.query('drop table if exists m3_wallets');
    await queryRunner.query('drop table if exists m3_wallet_challenges');
    await queryRunner.query('drop table if exists m3_sessions');
    await queryRunner.query('drop table if exists m3_users');
  }
}
