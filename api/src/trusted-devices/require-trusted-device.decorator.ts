import { SetMetadata } from '@nestjs/common';

export const REQUIRE_TRUSTED_DEVICE_KEY = 'require_trusted_device';
export const RequireTrustedDevice = () => SetMetadata(REQUIRE_TRUSTED_DEVICE_KEY, true);
