import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDevice } from '../../database/entities/user-device.entity';
import { DeviceAccessViolation } from '../../database/entities/device-access-violation.entity';
import { AdminNotification } from '../../database/entities/admin-notification.entity';
import { User } from '../../database/entities/user.entity';
import { DeviceLimitService } from './device-limit.service';
import { AdminDevicesController } from './admin-devices.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([
      UserDevice,
      DeviceAccessViolation,
      AdminNotification,
      User,
    ]),
  ],
  controllers: [AdminDevicesController],
  providers: [DeviceLimitService],
  exports: [DeviceLimitService],
})
export class DeviceModule {}
