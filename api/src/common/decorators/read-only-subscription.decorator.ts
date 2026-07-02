import { SetMetadata } from '@nestjs/common';

/** Allows this mutating route while subscription is in GRACE_READ_ONLY. */
export const READ_ONLY_SUBSCRIPTION_KEY = 'readOnlySubscriptionBypass';
export const ReadOnlySubscriptionBypass = () => SetMetadata(READ_ONLY_SUBSCRIPTION_KEY, true);
