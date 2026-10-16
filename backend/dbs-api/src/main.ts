import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const internalPort = parseInt(process.env.PORT || '3001', 10);
  const swaggerHost = process.env.SWAGGER_HOST || 'http://localhost:3002';
  const corsOrigins = (
    process.env.CORS_ORIGINS ||
    'http://localhost:3000,http://localhost:3001,http://localhost:3005'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api');
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ============================================================
  // 📚 SWAGGER CONFIGURATION
  // ============================================================
  const config = new DocumentBuilder()
    .setTitle('DBS GUI API')
    .setDescription(
      `
      API de gestion de tests industriels ATP.
      
      ## Fonctionnalités
      - Gestion des Steps (CRUD + paramètres typés)
      - Gestion des Séquences (CRUD + pipeline)
      - Gestion des Produits (CRUD + pipeline PREUUT/SEQUENCE/POSTUUT)
      - Gestion des Utilisateurs (CRUD + login)
      - Gestion des Roles et des droits
      - Historique des actions
      
      ## Authentification
      Utilisez le token JWT obtenu via \`/api/auth/login\` dans l'en-tête:
      \`Authorization: Bearer <votre_token>\`
    `,
    )
    .setVersion('1.0')
    .addServer(`${swaggerHost}`)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Entrez votre token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentification')
    .addTag('steps', 'Gestion des steps de test')
    .addTag('sequences', 'Gestion des séquences')
    .addTag('products', 'Gestion des produits')
    .addTag('product-counter', 'Gestion des compteurs produits')
    .addTag('product-status', 'Gestion des statuts produits')
    .addTag('status', 'Gestion des status')
    .addTag('step-status', 'Gestion des step status')
    .addTag('execution-mode', "Gestion des modes d'execution")
    .addTag('step', 'Gestion des steps normalises')
    .addTag('step-param', 'Gestion des parametres de steps normalises')
    .addTag('step-limit', 'Gestion des limites de steps')
    .addTag('sequence', 'Gestion des sequences normalisees')
    .addTag('sequence-step', 'Gestion des steps de sequence normalises')
    .addTag('product-sequence', 'Gestion des sequences par produit')
    .addTag('product-step-param', 'Gestion des parametres step par produit')
    .addTag(
      'product-execution-config',
      "Gestion des configurations d'execution produit",
    )
    .addTag('users', 'Gestion des utilisateurs')
    .addTag('roles', 'Gestion des roles')
    .addTag('rights', 'Catalogue des droits')
    .addTag('uploads', 'Gestion des avatars utilisateurs')
    .addTag('history', 'Historique des actions')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'DBS GUI API Documentation',
  });

  await app.listen(internalPort, '0.0.0.0');
  console.log(`API accessible sur le port ${internalPort}`);
  console.log(`Swagger disponible sur /api/docs pour le port ${internalPort}`);
  console.log(`🚀 DBS API démarrée sur http://localhost:${internalPort}`);
  console.log(`📚 Swagger disponible sur ${swaggerHost}/api/docs`);
}
void bootstrap();
