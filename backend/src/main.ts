// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure sessions
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 300000, // 5 minutes
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
      },
    }),
  );

  await app.listen(3000);
}
bootstrap();