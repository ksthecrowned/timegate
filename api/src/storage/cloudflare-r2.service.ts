import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';

@Injectable()
export class CloudflareR2Service {
  private readonly logger = new Logger(CloudflareR2Service.name);
  private readonly client: S3Client | null;
  private readonly bucket: string | null;
  private readonly publicBaseUrl: string | null;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('CLOUDFLARE_R2_ENDPOINT')?.trim();
    const accessKeyId = this.config.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID')?.trim();
    const secretAccessKey = this.config.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY')?.trim();
    const bucket = this.config.get<string>('CLOUDFLARE_R2_BUCKET')?.trim();
    const publicBaseUrl = this.config.get<string>('CLOUDFLARE_R2_PUBLIC_BASE_URL')?.trim();

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
      this.client = null;
      this.bucket = null;
      this.publicBaseUrl = null;
      this.logger.warn('R2 config missing; recognition image upload disabled');
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.bucket = bucket;
    this.publicBaseUrl = publicBaseUrl.replace(/\/+$/, '');
  }

  async uploadRecognitionImage(params: {
    organizationId: string;
    deviceId: string;
    contentType?: string;
    buffer: Buffer;
  }): Promise<string | null> {
    return this.upload({
      folder: `recognition-logs/${params.organizationId}/${params.deviceId}`,
      contentType: params.contentType,
      buffer: params.buffer,
    });
  }

  async uploadEmployeePhoto(params: {
    organizationId: string;
    employeeId: string;
    contentType?: string;
    buffer: Buffer;
  }): Promise<string | null> {
    return this.upload({
      folder: `employees/${params.organizationId}/${params.employeeId}`,
      contentType: params.contentType,
      buffer: params.buffer,
    });
  }

  async uploadEmployeeContract(params: {
    organizationId: string;
    employeeId: string;
    contentType?: string;
    buffer: Buffer;
  }): Promise<string | null> {
    return this.upload({
      folder: `employee-contracts/${params.organizationId}/${params.employeeId}`,
      contentType: params.contentType,
      buffer: params.buffer,
    });
  }

  private async upload(params: { folder: string; contentType?: string; buffer: Buffer }): Promise<string | null> {
    if (!this.client || !this.bucket || !this.publicBaseUrl) {
      return null;
    }
    const ext = this.resolveExtension(params.contentType);
    const key = `${params.folder}/${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.contentType || 'application/octet-stream',
      }),
    );
    return `${this.publicBaseUrl}/${key}`;
  }

  private resolveExtension(contentType?: string): string {
    switch ((contentType || '').toLowerCase()) {
      case 'image/jpeg':
      case 'image/jpg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      default:
        return 'bin';
    }
  }
}
