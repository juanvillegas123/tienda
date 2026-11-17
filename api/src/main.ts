import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  await app.register(helmet);
  app.enableCors({ origin: 'http://localhost:4200', credentials: true });
  await app.listen(3000, '0.0.0.0');
}
void bootstrap();
