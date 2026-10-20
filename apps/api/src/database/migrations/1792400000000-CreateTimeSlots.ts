
import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class CreateTimeSlots1792400000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "time_slots" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "starts_at" timestamptz NOT NULL,
        "duration_minutes" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "CHK_time_slots_duration_positive"
          CHECK ("duration_minutes" > 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_time_slots_starts_at"
      ON "time_slots" ("starts_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "time_slots"
    `);
  }
}
