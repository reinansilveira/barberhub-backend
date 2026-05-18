import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS',
      useFactory: () => {
        return new Redis(process.env.REDIS_URL as string);
      },
    },
  ],
  exports: ['REDIS'],
})
export class RedisModule {}