import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

import {
  ClientModule,
  ClientAccountModule,
  ProfessionalModule,
  ServicesModule,
  AppointmentsModule,
  ScheduleModule,
  ProfessionalServicesModule,
  PaymentsModule,
  NotificationsModule,
  UsersModule,
  ReviewsModule,
  ConfigurationsModule,
  AuthModule,
  RedisModule,
  QueuesModule,
  SlotsModule,
} from './modules';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: ['REDIS'],
      useFactory: (redis: Redis) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 20 }],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
    ClientModule,
    ClientAccountModule,
    ProfessionalModule,
    ServicesModule,
    AppointmentsModule,
    ScheduleModule,
    ProfessionalServicesModule,
    PaymentsModule,
    NotificationsModule,
    UsersModule,
    ReviewsModule,
    ConfigurationsModule,
    AuthModule,
    RedisModule,
    QueuesModule,
    SlotsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
