
import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class PreventOverlappingSlots1792570000000
  implements MigrationInterface
{
  name = 'PreventOverlappingSlots1792570000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "time_slots"
      ADD CONSTRAINT "EX_time_slots_no_overlap"
      EXCLUDE USING gist (
        (
          tsrange(
            "starts_at" AT TIME ZONE 'UTC',
            ("starts_at" AT TIME ZONE 'UTC') +
              ("duration_minutes" * INTERVAL '1 minute'),
            '[)'
          )
        ) WITH &&
      )
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "time_slots"
      DROP CONSTRAINT "EX_time_slots_no_overlap"
    `);
  }
}
