import * as express from 'express'
import { AppModule } from './app.module'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'

async function bootstrap() {
  const PORT: number = parseInt(process.env.PORT, 10) || 2002
  const app = await NestFactory.create(AppModule)
  const expressApp = app.getHttpAdapter().getInstance()

  app.enableCors({
    origin: [
      `http://localhost:3000`,
      `http://localhost:3001`,
      'https://quidate.finance',
      `http://localhost:${PORT}`,
      'https://quidate-staging.up.railway.app',
      'https://quidate-server-v2.up.railway.app'
    ],
    optionsSuccessStatus: 200,
    methods: 'GET,PATCH,POST,PUT,DELETE',
  })
  expressApp.set('trust proxy', true)
  app.use(express.json({ limit: 10 << 20 }))

  app.setGlobalPrefix('/api/v2')
  app.useGlobalPipes(new ValidationPipe({ transform: true }))

  const swaggerOptions = new DocumentBuilder()
    .setTitle('Quidate API')
    .setVersion('2.0')
    .addServer('https://quidate-server-v2.up.railway.app', 'Staging')
    .addServer(`http://localhost:${PORT}`, 'Local')
    .addBearerAuth()
    .build()

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerOptions)
  SwaggerModule.setup('docs', app, swaggerDocument)

  try {
    await app.listen(PORT)
    console.log(`http://localhost:${PORT}`)
  } catch (err) {
    console.error(err.message)
  }
}

bootstrap()