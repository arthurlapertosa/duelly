import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInviteRecipientEmail1716400000000 implements MigrationInterface {
  name = 'AddInviteRecipientEmail1716400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('alter table bet_invites add column if not exists recipient_email text');
    await queryRunner.query('create index if not exists idx_bet_invites_recipient_email on bet_invites (recipient_email)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop index if exists idx_bet_invites_recipient_email');
    await queryRunner.query('alter table bet_invites drop column if exists recipient_email');
  }
}
