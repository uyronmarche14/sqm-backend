import { beforeEach, describe, expect, it, vi } from 'vitest';

const trainingServiceMock = vi.hoisted(() => ({
  calendar: vi.fn(),
  achievement: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../../../../src/modules/training/training.service.js', () => ({
  trainingService: trainingServiceMock,
}));

import { trainingController } from '../../../../src/modules/training/training.controller.js';

describe('TrainingController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards calendar queries to the calendar service method', async () => {
    trainingServiceMock.calendar.mockResolvedValue([]);
    const req = {
      query: { month: '2026-05' },
      user: { userId: 'user-1' },
    } as any;
    const res = { json: vi.fn() } as any;
    const next = vi.fn();

    await trainingController.calendar(req, res, next);

    expect(trainingServiceMock.calendar).toHaveBeenCalledWith('user-1', { month: '2026-05' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns backend-owned achievement payloads through the controller', async () => {
    trainingServiceMock.achievement.mockResolvedValue({ records: [], metrics: { totalSessions: 0 } });
    const req = {
      query: { month: '2026-05' },
      user: { userId: 'user-1' },
    } as any;
    const res = { json: vi.fn() } as any;
    const next = vi.fn();

    await trainingController.achievement(req, res, next);

    expect(trainingServiceMock.achievement).toHaveBeenCalledWith('user-1', { month: '2026-05' });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts create payloads without attendee ids', async () => {
    trainingServiceMock.create.mockResolvedValue({ id: 'sched-1' });
    const req = {
      body: {
        trainingName: 'SPC Basics',
        trainingDate: '2026-05-20',
        status: 'PLANNED',
        attendees: [{ employeeNo: 'EMP001', fullName: 'John Sample', status: 'PLANNED' }],
      },
      user: { userId: 'user-1' },
    } as any;
    const res = { status: vi.fn(() => ({ json: vi.fn() })) } as any;
    const next = vi.fn();

    await trainingController.create(req, res, next);

    expect(trainingServiceMock.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        trainingName: 'SPC Basics',
        attendees: [expect.objectContaining({ employeeNo: 'EMP001' })],
      }),
    );
  });
});
