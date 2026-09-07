/**
 * Platform-agnostic uploaded file shape (Multer-compatible fields we use).
 * Fastify multipart interceptor populates the same fields.
 */
export type UploadedFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};
