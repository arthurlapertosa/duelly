import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInviteAuthorizations1716300000000 implements MigrationInterface {
  name = 'AddInviteAuthorizations1716300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('alter table bet_invites add column if not exists offer_signature text');
    await queryRunner.query('alter table bet_invites add column if not exists maker_permit jsonb');
    await queryRunner.query('alter table bet_invites add column if not exists maker_authorized_at timestamptz');
    await queryRunner.query('alter table bet_invites add column if not exists acceptance_signature text');
    await queryRunner.query('alter table bet_invites add column if not exists taker_permit jsonb');
    await queryRunner.query('alter table bet_invites add column if not exists taker_authorized_at timestamptz');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('alter table bet_invites drop column if exists taker_authorized_at');
    await queryRunner.query('alter table bet_invites drop column if exists taker_permit');
    await queryRunner.query('alter table bet_invites drop column if exists acceptance_signature');
    await queryRunner.query('alter table bet_invites drop column if exists maker_authorized_at');
    await queryRunner.query('alter table bet_invites drop column if exists maker_permit');
    await queryRunner.query('alter table bet_invites drop column if exists offer_signature');
  }
}
