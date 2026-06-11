import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const TEST_DIR = path.dirname(__filename);
const SERVICE_FILE = path.resolve(TEST_DIR, '../../src/modules/masterData/master-data.service.ts');

describe('Master data constraint registry', () => {
  const content = fs.readFileSync(SERVICE_FILE, 'utf-8');

  it('MASTER_DATA_CHILD_CHECKS registry exists', () => {
    expect(content).toContain('MASTER_DATA_CHILD_CHECKS');
  });

  it('MFG_SITES child checks are defined', () => {
    const siteSection = extractSection(content, 'MFG_SITES');
    expect(siteSection).toContain('MNR_LOTS');
    expect(siteSection).toContain('SUPPLIERS');
    expect(siteSection).toContain('USERS');
    expect(siteSection).toContain('SQMP');
    expect(siteSection).toContain('NPI_LOTS');
    expect(siteSection).toContain('OGI');
  });

  it('SUPPLIERS child checks are defined', () => {
    const supplierSection = extractSection(content, 'SUPPLIERS');
    expect(supplierSection).toContain('MNR_LOTS');
    expect(supplierSection).toContain('SQMP');
    expect(supplierSection).toContain('SUPPLIER_INFORMATION');
    expect(supplierSection).toContain('SUPPLIERSUSER');
  });

  it('PARTS child checks are defined', () => {
    const partsSection = extractSection(content, 'PARTS');
    expect(partsSection).toContain('MNR_DETAILS');
    expect(partsSection).toContain('NPI_LOTS');
    expect(partsSection).toContain('OGI');
    expect(partsSection).toContain('SPC');
    expect(partsSection).toContain('MATERIALCERTS');
  });

  it('ROLES child checks are defined', () => {
    const rolesSection = extractSection(content, 'ROLES');
    expect(rolesSection).toContain('USERS');
    expect(rolesSection).toContain('ROLE_ACCESS');
  });

  it('MODELS child checks are defined', () => {
    const modelsSection = extractSection(content, 'MODELS');
    expect(modelsSection).toContain('MNR_LOTS');
    expect(modelsSection).toContain('NPI_LOTS');
    expect(modelsSection).toContain('SQMP');
  });

  it('PRODUCTS child checks are defined', () => {
    const productsSection = extractSection(content, 'PRODUCTS');
    expect(productsSection).toContain('MNR_LOTS');
    expect(productsSection).toContain('MODELS');
  });

  it('delete method uses child check query before deletion', () => {
    expect(content).toContain('SELECT COUNT(*) AS cnt FROM');
    expect(content).toContain('active_flag = 1');
    expect(content).toContain('Cannot delete: this record is referenced by');
  });

  it('delete method still catches SQL error 547 as fallback', () => {
    expect(content).toContain('err?.number === 547');
  });
});

function extractSection(content: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}:\\s*\\[([^\\]]+)\\]`, 's');
  const match = content.match(regex);
  return match ? match[0] : '';
}
