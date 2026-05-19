import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateM1TemplateTables1716100000000 implements MigrationInterface {
  name = 'CreateM1TemplateTables1716100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      create table if not exists discovery_runs (
        id text primary key,
        mode text not null,
        sport text,
        provider text not null,
        status text not null,
        gamma_base_url text,
        started_at timestamptz not null,
        finished_at timestamptz,
        error text
      )
    `);
    await queryRunner.query(`
      create table if not exists candidate_snapshots (
        id text primary key,
        discovery_run_id text,
        fixture_id text,
        provider_market_id text not null,
        sport text,
        candidate jsonb not null,
        raw_provider_payload_hash text not null,
        created_at timestamptz not null
      )
    `);
    await queryRunner.query(`
      create table if not exists sports_templates (
        template_hash text primary key,
        template_id text not null,
        provider_market_id text not null,
        sport text not null,
        competition text not null,
        event_type text not null,
        binary_market_type text not null,
        condition_id text not null,
        question_id_hash text not null,
        template jsonb not null,
        active boolean not null,
        accepted_at timestamptz not null
      )
    `);
    await queryRunner.query(`
      create table if not exists rejected_candidates (
        id text primary key,
        candidate_id text,
        fixture_id text,
        provider_market_id text,
        sport text,
        reasons text[] not null,
        candidate jsonb not null,
        rejected_at timestamptz not null
      )
    `);
    await queryRunner.query(`
      create table if not exists template_publish_audits (
        id text primary key,
        template_hash text not null,
        template_id text not null,
        status text not null,
        published_by text not null,
        payload jsonb not null,
        audit jsonb not null,
        created_at timestamptz not null
      )
    `);
    await queryRunner.query('create index if not exists idx_candidate_snapshots_sport on candidate_snapshots (sport)');
    await queryRunner.query('create index if not exists idx_rejected_candidates_sport on rejected_candidates (sport)');
    await queryRunner.query('create index if not exists idx_template_publish_audits_template_hash on template_publish_audits (template_hash)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop table if exists template_publish_audits');
    await queryRunner.query('drop table if exists rejected_candidates');
    await queryRunner.query('drop table if exists sports_templates');
    await queryRunner.query('drop table if exists candidate_snapshots');
    await queryRunner.query('drop table if exists discovery_runs');
  }
}
