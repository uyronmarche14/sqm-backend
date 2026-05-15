import { BadRequestError, NotFoundError } from '../../../shared/errors/AppError.js';
import { ssiRepository } from '../ssi.repository.js';
import { buildSsiRecordFromRow } from '../shared/ssi-shared.js';
import { ssiAccessService } from '../shared/ssi-access.service.js';
import type { SsiActorContext } from '../types/ssi.types.js';

export class SsiArtifactService {
  async generateCertificate(recordId: string, actor: SsiActorContext, payload: Record<string, unknown> = {}) {
    const row = await ssiRepository.findRecordById(recordId);
    if (!row) {
      throw new NotFoundError('SSI record not found');
    }

    const record = buildSsiRecordFromRow(row);
    if (!ssiAccessService.canReadRecord(record, actor)) {
      throw new NotFoundError('SSI record not found');
    }
    if (record.status !== 'APPROVED' && record.status !== 'ISSUED') {
      throw new BadRequestError('Certificates can only be generated after SSI approval.');
    }

    const now = new Date();
    const certificate = {
      ...(record.certificate || {
        inspectorCertificateGenerated: false,
        companyCertificateGenerated: false,
        attachments: [],
      }),
      inspectorCertificateGenerated: true,
      companyCertificateGenerated: true,
      issueDate:
        String(payload.issueDate || record.certificate?.issueDate || '').trim() ||
        now.toISOString().slice(0, 10),
      remarks: String(payload.remarks || record.certificate?.remarks || ''),
    };

    await ssiRepository.executeTransaction(async (trx) => {
      await ssiRepository.updateRecord(trx, recordId, {
        certificate_json: JSON.stringify(certificate),
        last_update: now,
        updateby: actor.userId || 'SYSTEM',
      });
    });

    const updated = await ssiRepository.findRecordById(recordId);
    return buildSsiRecordFromRow(updated as Record<string, unknown>);
  }
}

export const ssiArtifactService = new SsiArtifactService();
