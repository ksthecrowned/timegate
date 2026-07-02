import { SetMetadata } from '@nestjs/common';

export const ALLOW_BLOCKED_SUBSCRIPTION_KEY = 'allowBlockedSubscription';
export const AllowBlockedSubscription = () => SetMetadata(ALLOW_BLOCKED_SUBSCRIPTION_KEY, true);
