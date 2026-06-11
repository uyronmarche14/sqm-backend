import { describe, expect, it } from 'vitest';
import { NpiCreateSchema } from '../../src/modules/npi/npi.schema.js';

describe('NpiCreateSchema', () => {
  it('accepts browser date strings and empty optional approval ids', () => {
    const parsed = NpiCreateSchema.parse({
      body: {
        siteId: '49356c06-ede4-404b-9930-3ca810dc3ef7',
        supplierId: '560c3e26-3a78-42d4-a45b-a3ae11dbc092',
        partId: 'ecee0adb-b21a-474d-88c5-ed35c4708e34',
        model: '4d3abac5-3e0e-49b9-852d-2ce83f537017',
        inspectionCategory: '11111111-1111-4111-8111-111111111111',
        inspectionMethod: '22222222-2222-4222-8222-222222222222',
        severity: '33333333-3333-4333-8333-333333333333',
        disposition: '44444444-4444-4444-8444-444444444444',
        inspectedBy: '55555555-5555-4555-8555-555555555555',
        dataVerifiedBy: '66666666-6666-4666-8666-666666666666',
        lotSize: '10',
        sampleSize: '5',
        inspectionTemp: '25',
        inspectionHum: '60',
        startTime: '800',
        endTime: '900',
        receivedTime: '700',
        endorseTime: '930',
        inspectionDate: '3/12/2026',
        deliveryDate: '2026-03-12T00:00:00.000Z',
        checkerId: '',
        approverId: '',
        submittedDate: '',
      },
    }).body;

    expect(parsed.inspectionDate).toBeInstanceOf(Date);
    expect(parsed.deliveryDate).toBeInstanceOf(Date);
    expect(parsed.checkerId).toBeUndefined();
    expect(parsed.approverId).toBeUndefined();
    expect(parsed.submittedDate).toBeUndefined();
  });
});
