import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import type { EmailMessage, EmailSendResult, EmailTransport } from '../email.types.js';

function slugifySubject(subject: string): string {
  const slug = subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return slug || 'notification';
}

export class FileEmailTransport implements EmailTransport {
  readonly name = 'file';

  constructor(private readonly outputDir: string) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    await mkdir(this.outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${timestamp}-${slugifySubject(message.subject)}.json`;
    const filePath = path.join(this.outputDir, fileName);

    const record = {
      savedAt: new Date().toISOString(),
      ...message,
    };

    await writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');

    return {
      delivered: true,
      transport: this.name,
      referenceId: filePath,
    };
  }
}

