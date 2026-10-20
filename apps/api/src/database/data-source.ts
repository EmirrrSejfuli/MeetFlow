
import 'reflect-metadata';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import { TimeSlot } from '../slots/entities/time-slot.entity';

config({
  path: resolve(process.cwd(), '../../.env'),
});

function requiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

export default new DataSource({
  type: 'postgres',
  host: '127.0.0.1',
  port: 5433,

  username: requiredEnv('POSTGRES_USER'),
  password: requiredEnv('POSTGRES_PASSWORD'),
  database: requiredEnv('POSTGRES_DB'),

  entities: [TimeSlot],
  migrations: [
    resolve(__dirname, 'migrations/*{.ts,.js}'),
  ],

  synchronize: false,
});
