import fs from 'fs/promises';
import path from 'path';

export interface FileStorageLocation {
  uploadPath: string;
  subFolder?: string;
}

export const ATTACHMENT_TYPE_FOLDERS: Record<string, string> = {
  'qmqa-plan': 'schedules',
  'qmqa-record': 'records',
  'qmqa-response-initial': 'response-initial',
  'qmqa-response-final': 'response-final',
  'qmqa-response-verification': 'response-verification',
  'sqmp-document': 'documents',
  'sqmp-appendix': 'appendix',
  'sqmp-response-document': 'response-documents',
  'sqmp-response-appendix': 'response-appendix',
  'sqmp-response-closure': 'response-closure',
  'mnr-main': 'main',
  'mnr-response': 'response',
  'npi': 'attachments',
  'npi-main': 'attachments',
  'sqpr': 'attachments',
  'sqpr-main': 'attachments',
  'ogi': 'attachments',
  'ogi-main': 'attachments',
};

function getUploadRoot(): string {
  const configured = process.env.UPLOAD_ROOT;
  if (configured) {
    return path.resolve(configured);
  }
  return path.resolve(process.cwd(), 'uploads');
}

export class FileStorageService {
  /**
   * Resolve a stored path and verify it stays within the given base boundary.
   * Returns the resolved absolute path if safe, or null if it escapes the base.
   */
  private resolveSafePath(candidate: string, base: string): string | null {
    const resolved = path.resolve(candidate);

    if (!resolved.startsWith(base + path.sep) && resolved !== base) {
      return null;
    }

    return resolved;
  }

  /**
   * Resolve the upload base path, ensuring it's within the upload root.
   */
  private resolveUploadBase(location: FileStorageLocation): string {
    const root = getUploadRoot();
    const base = location.subFolder
      ? path.resolve(root, location.uploadPath, location.subFolder)
      : path.resolve(root, location.uploadPath);
    return base;
  }

  getStorageCandidates(
    location: FileStorageLocation,
    fileName: string,
    storedPath?: string | null,
  ): string[] {
    const uploadBase = this.resolveUploadBase(location);
    const safeFileName = path.basename(fileName);

    const candidatePaths = [
      storedPath ? this.resolveSafePath(storedPath, uploadBase) : null,
      location.subFolder ? path.join(uploadBase, safeFileName) : null,
      path.join(uploadBase, safeFileName),
    ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

    return candidatePaths;
  }

  async findFirstExistingFile(
    location: FileStorageLocation,
    fileName: string,
    storedPath?: string | null,
  ): Promise<string | null> {
    const candidates = this.getStorageCandidates(location, fileName, storedPath);

    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // Try the next candidate.
      }
    }

    return null;
  }

  async deleteStoredFile(
    location: FileStorageLocation,
    fileName: string,
    storedPath?: string | null,
  ): Promise<boolean> {
    const existingPath = await this.findFirstExistingFile(location, fileName, storedPath);
    if (!existingPath) {
      return false;
    }

    try {
      await fs.unlink(existingPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Explicit safety check: rejects a stored path if it escapes the upload root.
   * Use this before any direct file read/delete from DB-stored paths.
   */
  validateStoredPathIsSafe(storedPath: string, basePath?: string): boolean {
    const base = basePath ? path.resolve(basePath) : getUploadRoot();
    return this.resolveSafePath(storedPath, base) !== null;
  }
}

export const fileStorageService = new FileStorageService();
