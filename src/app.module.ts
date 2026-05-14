import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import {
  ClientModule,
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
    ClientModule,
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
export class AppModule { }