import { Module } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service';
import { ExpoPushService } from './expo-push.service';
import { PushDeliveryService } from './push-delivery.service';

@Module({
  providers: [FirebaseAdminService, ExpoPushService, PushDeliveryService],
  exports: [PushDeliveryService, FirebaseAdminService],
})
export class PushModule {}
