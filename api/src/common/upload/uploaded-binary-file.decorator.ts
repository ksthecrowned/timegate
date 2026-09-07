import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UploadedFile } from './uploaded-file';

type RequestWithUpload = {
  uploadedFile?: UploadedFile;
};

/**
 * Fastify-safe replacement for `@UploadedFile()`.
 * (On Fastify + `@fastify/multipart`, `req.file` is a method — do not overwrite it.)
 */
export const UploadedBinaryFile = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UploadedFile | undefined => {
    const req = ctx.switchToHttp().getRequest<RequestWithUpload>();
    return req.uploadedFile;
  },
);
