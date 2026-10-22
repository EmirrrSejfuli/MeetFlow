
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SlotsModule } from './slots/slots.module';
import { BookingsModule } from './bookings/bookings.module';

import { CreateTimeSlots1792400000000 } from './database/migrations/1792400000000-CreateTimeSlots';
import { CreateBookings1792490000000 } from './database/migrations/1792490000000-CreateBookings';
import { PreventOverlappingSlots1792570000000 } from './database/migrations/1792570000000-PreventOverlappingSlots';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl =
          configService.get<string>('DATABASE_URL');

        return {
          type: 'postgres' as const,

          ...(databaseUrl
            ? {
                url: databaseUrl,
              }
            : {
                host: '127.0.0.1',
                port: 5433,
                username:
                  configService.getOrThrow<string>(
                    'POSTGRES_USER',
                  ),
                password:
                  configService.getOrThrow<string>(
                    'POSTGRES_PASSWORD',
                  ),
                database:
                  configService.getOrThrow<string>(
                    'POSTGRES_DB',
                  ),
              }),

          autoLoadEntities: true,
          synchronize: false,

          migrations: [
            CreateTimeSlots1792400000000,
            CreateBookings1792490000000,
            PreventOverlappingSlots1792570000000,
          ],

          migrationsRun: Boolean(databaseUrl),
        };
      },
    }),

    SlotsModule,
    BookingsModule,
  ],
})
export class AppModule {}
