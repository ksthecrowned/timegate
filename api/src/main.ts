import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function registerStdIoGuards() {
  const isIgnorableWriteError = (error: NodeJS.ErrnoException) =>
    (error?.code === 'EPIPE' || error?.code === 'EOF') &&
    (error?.syscall === 'write' || !error?.syscall);

  const handleStreamError = (error: NodeJS.ErrnoException) => {
    // On Windows + watch terminals, stdout/stderr can be closed unexpectedly.
    // Ignore these transport-level errors to avoid killing the API process.
    if (isIgnorableWriteError(error)) {
      return;
    }
    throw error;
  };

  process.on('uncaughtException', (error: unknown) => {
    const errnoError = error as NodeJS.ErrnoException;
    if (isIgnorableWriteError(errnoError)) {
      return;
    }
    throw error;
  });

  process.stdout.on('error', handleStreamError);
  process.stderr.on('error', handleStreamError);
}

async function bootstrap() {
  registerStdIoGuards();
  const app = await NestFactory.create(AppModule);
  const corsOriginEnv = process.env.CORS_ORIGIN ?? '';
  const allowedOrigins = corsOriginEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin:
      allowedOrigins.length > 0
        ? allowedOrigins
        : [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://172.20.10.2:3000',
          ],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const port = Number(process.env.PORT) || 4001;
  await app.listen(port);
}

bootstrap();
