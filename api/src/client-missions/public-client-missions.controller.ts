import { Controller, Get, Param, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ClientMissionsService } from './client-missions.service';

/** Unauthenticated endpoints for the client QR display page. */
@Public()
@Controller('public/client-missions')
export class PublicClientMissionsController {
  constructor(private readonly missions: ClientMissionsService) {}

  @Get(':slug')
  meta(@Param('slug') slug: string) {
    return this.missions.getPublicMeta(slug);
  }

  @Post(':slug/qr-challenge')
  createChallenge(@Param('slug') slug: string) {
    return this.missions.createPublicQrChallenge(slug);
  }

  @Get(':slug/qr-challenge/:challengeId/result')
  challengeResult(
    @Param('slug') slug: string,
    @Param('challengeId') challengeId: string,
  ) {
    return this.missions.getPublicQrChallengeResult(slug, challengeId);
  }
}
