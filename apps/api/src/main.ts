import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({ origin: config.get<string>("WEB_URL"), credentials: true });
  app.setGlobalPrefix("api");

  const port = config.get<number>("API_PORT")!;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Petrus Licitação API rodando em http://localhost:${port}/api`);
}

bootstrap();
