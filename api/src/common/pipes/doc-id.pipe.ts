import { BadRequestException, PipeTransform } from '@nestjs/common';

const DOC_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,139}$/;

export class DocIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const id = `${value ?? ''}`.trim();
    if (!DOC_ID_RE.test(id)) {
      throw new BadRequestException('Invalid document id');
    }
    return id;
  }
}
