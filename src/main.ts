import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672'],
      queue: 'barberhub_queue',
      queueOptions: { durable: true },
      noAck: false,
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const reflector = app.get(Reflector);
  const jwtService = app.get(JwtService);

  app.useGlobalGuards(new JwtAuthGuard(reflector, jwtService));

  const config = new DocumentBuilder()
    .setTitle('BarberHub API')
    .setDescription('API para gerenciar clientes e serviços do BarberHub')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.startAllMicroservices().catch((err) => {
    console.error('Microservice error:', err);
  });

  await app.listen(process.env.PORT ?? 3000);

  console.log('HTTP server started');
}

bootstrap();
