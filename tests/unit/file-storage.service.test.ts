import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileStorageService, type FileStorageLocation } from '../../src/shared/services/file-storage.service.js';

describe('FileStorageService - Path Traversal Protection', () => {
  let tmpDir: string;
  let location: FileStorageLocation;

  beforeAll(async () => {
    tmpDir = path.join(os.tmpdir(), `sqm-test-uploads-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });

    location = {
      uploadPath: tmpDir,
    };
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should reject stored path that escapes upload root via traversal', () => {
    const maliciousPath = path.join(tmpDir, '..', '..', 'etc', 'passwd');
    const isSafe = fileStorageService.validateStoredPathIsSafe(maliciousPath, tmpDir);
    expect(isSafe).toBe(false);
  });

  it('should reject stored path outside upload root', () => {
    const outsidePath = '/etc/passwd';
    const isSafe = fileStorageService.validateStoredPathIsSafe(outsidePath, tmpDir);
    expect(isSafe).toBe(false);
  });

  it('should accept stored path within upload root', () => {
    const safePath = path.join(tmpDir, 'legacy-file.pdf');
    const isSafe = fileStorageService.validateStoredPathIsSafe(safePath, tmpDir);
    expect(isSafe).toBe(true);
  });

  it('should not find file when stored path escapes upload root', async () => {
    const maliciousPath = path.join(tmpDir, '..', 'etc', 'passwd');
    const result = await fileStorageService.findFirstExistingFile(
      location,
      'test.txt',
      maliciousPath,
    );
    expect(result).toBeNull();
  });

  it('should find file when stored path is within upload root', async () => {
    const safeFile = path.join(tmpDir, 'safe-file.txt');
    await fs.writeFile(safeFile, 'test content');

    const result = await fileStorageService.findFirstExistingFile(
      location,
      'safe-file.txt',
      safeFile,
    );
    expect(result).toBe(safeFile);

    await fs.unlink(safeFile);
  });

  it('should filter out malicious stored paths from candidates', () => {
    const maliciousPath = '/etc/hostname';
    const candidates = fileStorageService.getStorageCandidates(
      location,
      'test.txt',
      maliciousPath,
    );
    expect(candidates).not.toContain(maliciousPath);
    expect(candidates.every((c) => c.startsWith(tmpDir))).toBe(true);
  });

  it('should use only basename of fileName to prevent directory traversal in name', () => {
    const candidates = fileStorageService.getStorageCandidates(
      location,
      '../../../etc/malicious.txt',
    );
    expect(candidates.every((c) => !c.includes('..'))).toBe(true);
    expect(candidates.every((c) => c.endsWith('malicious.txt'))).toBe(true);
  });
});
