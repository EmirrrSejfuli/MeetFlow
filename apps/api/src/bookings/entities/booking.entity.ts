
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { TimeSlot } from '../../slots/entities/time-slot.entity';

@Entity('bookings')
@Unique('UQ_bookings_slot_id', ['slotId'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'slot_id',
    type: 'uuid',
  })
  slotId!: string;

  @OneToOne(() => TimeSlot, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'slot_id' })
  slot!: TimeSlot;

  @Column({
    name: 'guest_name',
    type: 'varchar',
    length: 100,
  })
  guestName!: string;

  @Column({
    name: 'guest_email',
    type: 'varchar',
    length: 254,
  })
  guestEmail!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;
}
