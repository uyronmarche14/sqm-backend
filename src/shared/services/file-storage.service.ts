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

export class FileStorageService {
  getStorageCandidates(
    location: FileStorageLocation,
    fileName: string,
    storedPath?: string | null,
  ): string[] {
    const candidatePaths = [
      storedPath ? path.resolve(storedPath) : null,
      location.subFolder ? path.join(location.uploadPath, location.subFolder, fileName) : null,
      path.join(location.uploadPath, fileName),
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
        return path.resolve(candidate);
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
}

export const fileStorageService = new FileStorageService();
