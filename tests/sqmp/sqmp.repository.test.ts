import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMocks = vi.hoisted(() => {
  const executeTakeFirstMock = vi.fn();
  const orderByMock = vi.fn(() => ({
    executeTakeFirst: executeTakeFirstMock,
  }));
  const whereMock = vi.fn(() => ({
    orderBy: orderByMock,
  }));
  const selectMock = vi.fn(() => ({
    where: whereMock,
  }));
  const selectAllMock = vi.fn(() => ({
    select: selectMock,
  }));
  const leftJoinMock = vi.fn(() => ({
    leftJoin: leftJoinMock,
    selectAll: selectAllMock,
  }));
  const selectFromMock = vi.fn(() => ({
    leftJoin: leftJoinMock,
  }));

  return {
    executeTakeFirstMock,
    orderByMock,
    whereMock,
    selectMock,
    selectAllMock,
    leftJoinMock,
    selectFromMock,
  };
});

vi.mock('../../src/shared/infrastructure/db.js', () => ({
  db: {
    selectFrom: queryMocks.selectFromMock,
  },
}));

import { sqmpRepository } from '../../src/modules/sqmp/sqmp.repository';

describe('SqmpRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryMocks.executeTakeFirstMock.mockResolvedValue(undefined);
  });

  it('qualifies sqmp_id and response_date when loading the latest response', async () => {
    await sqmpRepository.findLatestResponse('sqmp-1');

    expect(queryMocks.selectFromMock).toHaveBeenCalledWith('SQMP_RESPONSE as r');
    expect(queryMocks.whereMock).toHaveBeenCalledWith('r.sqmp_id', '=', 'sqmp-1');
    expect(queryMocks.orderByMock).toHaveBeenCalledWith('r.response_date', 'desc');
  });
});
