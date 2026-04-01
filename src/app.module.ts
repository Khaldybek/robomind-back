import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppApiModule } from './modules/app-api/app-api.module';
import { AdminApiModule } from './modules/admin-api/admin-api.module';
import { AiModule } from './modules/ai/ai.module';
import { GamificationModule } from './modules/gamification/gamification.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    AuthModule,
    AppApiModule,
    AdminApiModule,
    AiModule,
    GamificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
