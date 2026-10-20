
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('time_slots')
@Index('IDX_time_slots_starts_at', ['startsAt'])
@Check('CHK_time_slots_duration_positive', '"duration_minutes" > 0')
export class TimeSlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'starts_at',
    type: 'timestamptz',
  })
  startsAt!: Date;

  @Column({
    name: 'duration_minutes',
    type: 'integer',
  })
  durationMinutes!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;
}
