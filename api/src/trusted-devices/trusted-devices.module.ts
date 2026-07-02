import { Module } from '@nestjs/common';
import { TrustedDevicesController } from './trusted-devices.controller';
import { TrustedDevicesService } from './trusted-devices.service';
import { TrustedDeviceGuard } from './trusted-devices.guard';

@Module({
  controllers: [TrustedDevicesController],
  providers: [TrustedDevicesService, TrustedDeviceGuard],
  exports: [TrustedDevicesService, TrustedDeviceGuard],
})
export class TrustedDevicesModule {}
