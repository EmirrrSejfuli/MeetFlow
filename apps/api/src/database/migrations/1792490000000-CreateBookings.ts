
import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class CreateBookings1792490000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        "slot_id" uuid NOT NULL,

        "guest_name" varchar(100) NOT NULL,

        "guest_email" varchar(254) NOT NULL,

        "created_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "UQ_bookings_slot_id"
          UNIQUE ("slot_id"),

        CONSTRAINT "FK_bookings_slot_id"
          FOREIGN KEY ("slot_id")
          REFERENCES "time_slots" ("id")
          ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "bookings"
    `);
  }
}
