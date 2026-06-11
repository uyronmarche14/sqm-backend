import { v4 as uuidv4 } from 'uuid';
import { getPageRegistryEntries } from '@sqm/permissions-contract';
import type { Selectable, Updateable, Insertable } from 'kysely';

import type { Database } from '../../shared/infrastructure/db.types.js';
import { formsRepo } from './master-data.repository.js';

type FormRow = Selectable<Database['FORMS']>;
type FormInsert = Insertable<Database['FORMS']>;
type FormUpdate = Updateable<Database['FORMS']>;

const FORM_REGISTRY_SYNC_USER = 'SYSTEM_SYNC';

export interface FormRegistrySyncSummary {
  inserted: number;
  updated: number;
  unchanged: number;
  legacyUnregistered: number;
  internalSynced: number;
}

interface FormRegistrySyncRepository {
  findAll(): Promise<FormRow[]>;
  create(data: FormInsert): Promise<FormRow>;
  update(id: string, data: FormUpdate): Promise<FormRow>;
}

function normalizeValue(value: string | null | undefined): string {
  return String(value || '').trim();
}

function buildRegistryProjection(entry: ReturnType<typeof getPageRegistryEntries>[number], existing?: FormRow): FormInsert {
  return {
    form_id: existing?.form_id || uuidv4(),
    form_name: entry.formCode,
    form_url: entry.kind === 'internal' ? '' : entry.route,
    menu_group: entry.menuGroup,
    icon: existing?.icon || '',
    form_desc: existing?.form_desc || '',
    active_flag: existing?.active_flag ?? 1,
    last_update: new Date(),
    updateby: FORM_REGISTRY_SYNC_USER,
  };
}

function buildRegistryPatch(
  entry: ReturnType<typeof getPageRegistryEntries>[number],
  existing: FormRow,
): FormUpdate | null {
  const expectedRoute = entry.kind === 'internal' ? '' : entry.route;
  const expectedMenuGroup = entry.menuGroup;

  const nextPatch: FormUpdate = {};

  if (normalizeValue(existing.form_url) !== normalizeValue(expectedRoute)) {
    nextPatch.form_url = expectedRoute;
  }

  if (normalizeValue(existing.menu_group) !== normalizeValue(expectedMenuGroup)) {
    nextPatch.menu_group = expectedMenuGroup;
  }

  if (Object.keys(nextPatch).length === 0) {
    return null;
  }

  nextPatch.last_update = new Date();
  nextPatch.updateby = FORM_REGISTRY_SYNC_USER;
  return nextPatch;
}

export class FormRegistrySyncService {
  constructor(
    private readonly repo: FormRegistrySyncRepository = formsRepo as unknown as FormRegistrySyncRepository,
  ) {}

  async sync(): Promise<FormRegistrySyncSummary> {
    const existingRows = await this.repo.findAll();
    const existingByName = new Map(
      existingRows.map((row) => [normalizeValue(row.form_name).toUpperCase(), row]),
    );

    const registryEntries = getPageRegistryEntries();
    const registryCodes = new Set(
      registryEntries.map((entry) => normalizeValue(entry.formCode).toUpperCase()),
    );
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    for (const entry of registryEntries) {
      const existing = existingByName.get(normalizeValue(entry.formCode).toUpperCase());

      if (!existing) {
        const projected = buildRegistryProjection(entry);
        await this.repo.create(projected);
        inserted += 1;
        continue;
      }

      const patch = buildRegistryPatch(entry, existing);
      if (!patch) {
        unchanged += 1;
        continue;
      }

      await this.repo.update(existing.form_id, patch);
      updated += 1;
    }

    return {
      inserted,
      updated,
      unchanged,
      legacyUnregistered: existingRows.filter(
        (row) => !registryCodes.has(normalizeValue(row.form_name).toUpperCase()),
      ).length,
      internalSynced: registryEntries.filter((entry) => entry.kind === 'internal').length,
    };
  }
}

export const formRegistrySyncService = new FormRegistrySyncService();
