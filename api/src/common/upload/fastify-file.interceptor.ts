import {
  CallHandler,
  ExecutionContext,
  Injectable,
  mixin,
  NestInterceptor,
  PayloadTooLargeException,
  Type,
} from '@nestjs/common';
import type { MultipartFile, MultipartValue } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import type { UploadedFile } from './uploaded-file';

type FastifyMultipartRequest = FastifyRequest & {
  isMultipart: () => boolean;
  parts: (options?: { limits?: { fileSize?: number } }) => AsyncIterableIterator<
    MultipartFile | MultipartValue
  >;
  uploadedFile?: UploadedFile;
  body?: Record<string, unknown>;
};

export type FastifyFileInterceptorOptions = {
  /** Max file size in bytes (same semantics as Multer limits.fileSize). */
  limits?: { fileSize?: number };
};

async function partToUploadedFile(part: MultipartFile): Promise<UploadedFile> {
  const buffer = await part.toBuffer();
  return {
    fieldname: part.fieldname,
    originalname: part.filename,
    encoding: part.encoding,
    mimetype: part.mimetype,
    size: buffer.length,
    buffer,
  };
}

/**
 * Fastify replacement for `@nestjs/platform-express` FileInterceptor.
 * Sets `req.uploadedFile` (for `@UploadedBinaryFile()`) and merges text fields into `req.body`.
 * Note: do not set `req.file` — that name is reserved by `@fastify/multipart`.
 */
export function FastifyFileInterceptor(
  fieldName: string,
  options: FastifyFileInterceptorOptions = {},
): Type<NestInterceptor> {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<unknown>> {
      const req = context.switchToHttp().getRequest<FastifyMultipartRequest>();

      // Optional-file routes: JSON clients must still work (Express/Multer did).
      if (typeof req.isMultipart !== 'function' || !req.isMultipart()) {
        return next.handle();
      }

      const fileSize = options.limits?.fileSize;
      const body: Record<string, unknown> = {
        ...((req.body as Record<string, unknown> | undefined) ?? {}),
      };
      let matched: UploadedFile | undefined;

      try {
        for await (const part of req.parts(
          fileSize ? { limits: { fileSize } } : undefined,
        )) {
          if (part.type === 'file') {
            const uploaded = await partToUploadedFile(part);
            if (uploaded.fieldname === fieldName) {
              matched = uploaded;
            }
            continue;
          }
          body[part.fieldname] = part.value;
        }
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        if (
          err?.code === 'FST_REQ_FILE_TOO_LARGE' ||
          /file size/i.test(err?.message ?? '')
        ) {
          throw new PayloadTooLargeException('File too large');
        }
        throw error;
      }

      req.body = body;
      req.uploadedFile = matched;
      return next.handle();
    }
  }

  return mixin(MixinInterceptor);
}
