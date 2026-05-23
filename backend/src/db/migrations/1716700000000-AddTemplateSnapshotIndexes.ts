import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateSnapshotIndexes1716700000000 implements MigrationInterface {
  name = 'AddTemplateSnapshotIndexes1716700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('alter table sports_templates add column if not exists event_start_at bigint');
    await queryRunner.query('alter table sports_templates add column if not exists betting_close_at bigint');
    await queryRunner.query('alter table sports_templates add column if not exists resolution_deadline bigint');
    await queryRunner.query("alter table sports_templates add column if not exists search_text text not null default ''");
    await queryRunner.query('alter table sports_templates add column if not exists last_seen_at timestamptz');
    await queryRunner.query('alter table sports_templates add column if not exists last_discovery_run_id text');
    await queryRunner.query(`
      update sports_templates
      set
        event_start_at = coalesce(event_start_at, (template->>'eventStartAt')::bigint),
        betting_close_at = coalesce(betting_close_at, (template->>'bettingCloseAt')::bigint),
        resolution_deadline = coalesce(resolution_deadline, (template->>'resolutionDeadline')::bigint),
        last_seen_at = coalesce(last_seen_at, accepted_at)
      where
        event_start_at is null
        or betting_close_at is null
        or resolution_deadline is null
        or last_seen_at is null
    `);
    await queryRunner.query('alter table sports_templates alter column event_start_at set not null');
    await queryRunner.query('alter table sports_templates alter column betting_close_at set not null');
    await queryRunner.query('alter table sports_templates alter column resolution_deadline set not null');
    await queryRunner.query('alter table sports_templates alter column last_seen_at set not null');
    await queryRunner.query('create index if not exists idx_sports_templates_template_id on sports_templates (template_id)');
    await queryRunner.query('create index if not exists idx_sports_templates_template_hash_lower on sports_templates (lower(template_hash))');
    await queryRunner.query('create index if not exists idx_sports_templates_sport_start_id on sports_templates (sport, event_start_at, template_id)');
    await queryRunner.query('create index if not exists idx_sports_templates_last_discovery_run on sports_templates (last_discovery_run_id)');
    await queryRunner.query('create index if not exists idx_sports_templates_search_text on sports_templates (search_text)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop index if exists idx_sports_templates_search_text');
    await queryRunner.query('drop index if exists idx_sports_templates_last_discovery_run');
    await queryRunner.query('drop index if exists idx_sports_templates_sport_start_id');
    await queryRunner.query('drop index if exists idx_sports_templates_template_hash_lower');
    await queryRunner.query('drop index if exists idx_sports_templates_template_id');
    await queryRunner.query('alter table sports_templates drop column if exists last_discovery_run_id');
    await queryRunner.query('alter table sports_templates drop column if exists last_seen_at');
    await queryRunner.query('alter table sports_templates drop column if exists search_text');
    await queryRunner.query('alter table sports_templates drop column if exists resolution_deadline');
    await queryRunner.query('alter table sports_templates drop column if exists betting_close_at');
    await queryRunner.query('alter table sports_templates drop column if exists event_start_at');
  }
}
