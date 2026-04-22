import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const LUXAND_BASE = 'https://api.luxand.cloud';

export type LuxandPhotoInput =
  | { kind: 'buffer'; buffer: Buffer; filename: string; contentType?: string }
  | { kind: 'url'; url: string };

@Injectable()
export class LuxandCloudService {
  constructor(private readonly config: ConfigService) {}

  private token(): string {
    const t = this.config.get<string>('LUXAND_API_TOKEN');
    if (!t?.trim()) {
      throw new ServiceUnavailableException('Luxand is not configured: set LUXAND_API_TOKEN');
    }
    return t.trim();
  }

  private collections(): string {
    return this.config.get<string>('LUXAND_COLLECTION') ?? '';
  }

  async addPerson(name: string, photo: LuxandPhotoInput): Promise<Record<string, unknown>> {
    const form = new FormData();
    form.append('name', name);
    form.append('store', '1');
    form.append('collections', this.collections());
    this.appendImageField(form, 'photos', photo);

    return this.postJson(`${LUXAND_BASE}/v2/person`, form);
  }

  async addFace(luxandPersonUuid: string, photo: LuxandPhotoInput): Promise<Record<string, unknown>> {
    const form = new FormData();
    form.append('store', '1');
    this.appendImageField(form, 'photos', photo);

    return this.postJson(`${LUXAND_BASE}/v2/person/${encodeURIComponent(luxandPersonUuid)}`, form);
  }

  async verifyPhoto(luxandPersonUuid: string, photo: LuxandPhotoInput): Promise<Record<string, unknown>> {
    const form = new FormData();
    this.appendImageField(form, 'photo', photo);

    return this.postJson(`${LUXAND_BASE}/photo/verify/${encodeURIComponent(luxandPersonUuid)}`, form);
  }

  async getPerson(luxandPersonUuid: string): Promise<Record<string, unknown>> {
    return this.getJson(`${LUXAND_BASE}/v2/person/${encodeURIComponent(luxandPersonUuid)}`);
  }

  private appendImageField(form: FormData, field: 'photos' | 'photo', photo: LuxandPhotoInput) {
    if (photo.kind === 'url') {
      form.append(field, photo.url);
      return;
    }
    const type = photo.contentType || 'application/octet-stream';
    const blob = new Blob([new Uint8Array(photo.buffer)], { type });
    form.append(field, blob, photo.filename || 'photo.jpg');
  }

  private async postJson(url: string, form: FormData): Promise<Record<string, unknown>> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { token: this.token() },
      body: form,
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new ServiceUnavailableException(`Luxand returned non-JSON (HTTP ${res.status})`);
    }
    if (!res.ok) {
      const msg =
        typeof (data as Record<string, unknown>).message === 'string'
          ? (data as Record<string, unknown>).message
          : `HTTP ${res.status}`;
      throw new ServiceUnavailableException(`Luxand request failed: ${msg}`);
    }
    return data as Record<string, unknown>;
  }

  private async getJson(url: string): Promise<Record<string, unknown>> {
    const res = await fetch(url, {
      method: 'GET',
      headers: { token: this.token() },
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new ServiceUnavailableException(`Luxand returned non-JSON (HTTP ${res.status})`);
    }
    if (!res.ok) {
      const msg =
        typeof (data as Record<string, unknown>).message === 'string'
          ? (data as Record<string, unknown>).message
          : `HTTP ${res.status}`;
      throw new ServiceUnavailableException(`Luxand request failed: ${msg}`);
    }
    return data as Record<string, unknown>;
  }
}
