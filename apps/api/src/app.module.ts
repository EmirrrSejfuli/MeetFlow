
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SlotsModule } from './slots/slots.module';
import { BookingsModule } from './bookings/bookings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: '127.0.0.1',
        port: 5433,

        username:
          configService.getOrThrow<string>('POSTGRES_USER'),

        password:
          configService.getOrThrow<string>('POSTGRES_PASSWORD'),

        database:
          configService.getOrThrow<string>('POSTGRES_DB'),

        autoLoadEntities: true,
        synchronize: false,
      }),
    }),

    SlotsModule,
    BookingsModule,
  ],
})
export class AppModule {}
