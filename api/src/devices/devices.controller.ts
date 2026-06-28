import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto, RemoveDeviceDto } from './dto/register-device.dto';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post('register')
  register(@CurrentUser() user: JwtUser, @Body() dto: RegisterDeviceDto) {
    return this.devices.register(user, dto.token.trim(), dto.platform);
  }

  @Post('remove')
  remove(@CurrentUser() user: JwtUser, @Body() dto: RemoveDeviceDto) {
    return this.devices.remove(user, dto.token.trim());
  }

  @Get()
  listMine(@CurrentUser() user: JwtUser) {
    return this.devices.listMine(user);
  }
}
