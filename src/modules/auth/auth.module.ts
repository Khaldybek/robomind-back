import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { School } from '../../database/entities/school.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { PasswordResetToken } from '../../database/entities/password-reset-token.entity';
import { DeviceModule } from '../device/device.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    forwardRef(() => DeviceModule),
    TypeOrmModule.forFeature([User, School, RefreshToken, PasswordResetToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_ACCESS_SECRET');
        if (!secret?.trim()) {
          throw new Error(
            'Задайте JWT_ACCESS_SECRET в .env (длинная случайная строка)',
          );
        }
        const expiresIn = config.get<string>('JWT_ACCESS_EXPIRES', '15m');
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as `${number}m` | `${number}h` | `${number}d` | `${number}s`,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, RolesGuard, PassportModule],
})
export class AuthModule {}
