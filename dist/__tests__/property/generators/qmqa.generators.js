/**
 * Fast-check Arbitrary Generators for QMQA Property-Based Testing
 *
 * Provides generators for creating random QMQA data structures
 * for property-based testing with fast-check.
 */
import fc from 'fast-check';
/**
 * Arbitrary generator for QMQA status values
 * Generates all 12 possible status values in the QMQA workflow
 */
export const qmqaStatusArbitrary = fc.constantFrom('PLANNED', 'DRAFT', 'AWAITING_APPROVAL', 'REJECTED', 'APPROVED', 'ISSUED', 'CANCELLED', 'WITH_INITIAL_REPORT', 'WITH_FINAL_REPORT', 'RESPONSE_AWAITING_APPROVAL', 'RESPONSE_REJECTED', 'CLOSED');
/**
 * Arbitrary generator for Control No. strings
 * Generates both schedule format (P-YYYY-NNN) and direct format (YYYY-NNN)
 */
export const controlNoArbitrary = fc.oneof(
// Schedule format: P-YYYY-NNN
fc.tuple(fc.integer({ min: 2020, max: 2030 }), fc.integer({ min: 1, max: 999 })).map(([year, seq]) => `P-${year}-${String(seq).padStart(3, '0')}`), 
// Direct format: YYYY-NNN
fc.tuple(fc.integer({ min: 2020, max: 2030 }), fc.integer({ min: 1, max: 999 })).map(([year, seq]) => `${year}-${String(seq).padStart(3, '0')}`));
/**
 * Arbitrary generator for QMQA Schedule objects
 * Generates complete schedule objects with all required fields
 */
export const qmqaScheduleArbitrary = fc.record({
    id: fc.uuid(),
    controlNo: controlNoArbitrary,
    mfgSiteId: fc.uuid(),
    categoryId: fc.uuid(),
    sqePicId: fc.uuid(),
    supplierId: fc.uuid(),
    auditPlanDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
        .map(d => d.toISOString().split('T')[0]),
    remarks: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
    status: fc.constant('PLANNED'),
    createdBy: fc.uuid(),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
        .map(d => d.toISOString()),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
        .map(d => d.toISOString()),
    updatedBy: fc.uuid()
});
/**
 * Arbitrary generator for QMQA Record objects
 * Generates complete audit record objects with all required fields
 */
export const qmqaRecordArbitrary = fc.record({
    id: fc.uuid(),
    controlNo: controlNoArbitrary,
    status: qmqaStatusArbitrary,
    mfgSiteId: fc.uuid(),
    categoryId: fc.uuid(),
    sqePicId: fc.uuid(),
    supplierId: fc.uuid(),
    auditPlanDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
        .map(d => d.toISOString().split('T')[0]),
    auditTypeId: fc.option(fc.uuid(), { nil: undefined }),
    attentionId: fc.option(fc.uuid(), { nil: undefined }),
    picAuditorId: fc.option(fc.uuid(), { nil: undefined }),
    auditRating: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
    dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
        .map(d => d.toISOString().split('T')[0]), { nil: undefined }),
    actualDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
        .map(d => d.toISOString().split('T')[0]), { nil: undefined }),
    issuedDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
        .map(d => d.toISOString().split('T')[0]), { nil: undefined }),
    auditors: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
    auditees: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
    attendees: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
    remarks: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
    createdBy: fc.uuid(),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
        .map(d => d.toISOString()),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
        .map(d => d.toISOString()),
    updatedBy: fc.uuid()
});
