import { IdempotencyService } from './idempotency.service';

class MemoryRepository {
  records: any[] = [];
  nextId = 1;

  async insert(value: any) {
    if (
      this.records.some(
        (item) =>
          item.userId === value.userId &&
          item.scope === value.scope &&
          item.requestKey === value.requestKey,
      )
    ) {
      const error: any = new Error('duplicate');
      error.code = 'ER_DUP_ENTRY';
      throw error;
    }
    const record = {
      id: this.nextId++,
      responseBody: null,
      ...value,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.push(record);
    return { identifiers: [{ id: record.id }] };
  }

  async findOne({ where }: any) {
    return this.records.find((item) =>
      Object.entries(where).every(([key, value]) => item[key] === value),
    );
  }

  createQueryBuilder() {
    const state: any = { mode: '', values: {}, clauses: [] };
    const builder: any = {
      update: () => {
        state.mode = 'update';
        return builder;
      },
      delete: () => {
        state.mode = 'delete';
        return builder;
      },
      set: (values: any) => {
        state.values = values;
        return builder;
      },
      where: (sql: string, params: any) => {
        state.clauses.push({ sql, params });
        return builder;
      },
      andWhere: (sql: string, params: any) => {
        state.clauses.push({ sql, params });
        return builder;
      },
      execute: async () => {
        const params = Object.assign({}, ...state.clauses.map((item) => item.params || {}));
        const index = this.records.findIndex((item) => {
          if (params.id !== undefined && item.id !== params.id) return false;
          if (params.leaseId !== undefined && item.leaseId !== params.leaseId) return false;
          if (params.requestHash !== undefined && item.requestHash !== params.requestHash) return false;
          return true;
        });
        if (index < 0) return { affected: 0 };
        if (state.mode === 'delete') {
          this.records.splice(index, 1);
        } else {
          const current = this.records[index];
          for (const [key, value] of Object.entries(state.values)) {
            current[key] = typeof value === 'function' ? Number(current[key] || 0) + 1 : value;
          }
        }
        return { affected: 1 };
      },
    };
    return builder;
  }
}

describe('IdempotencyService', () => {
  it('hashes semantically identical objects canonically', () => {
    const service = new IdempotencyService({} as any);
    expect(service.hash({ b: 2, a: { y: 2, x: 1 } })).toBe(
      service.hash({ a: { x: 1, y: 2 }, b: 2 }),
    );
  });

  it('includes file bytes and normalized metadata in multipart fingerprints', async () => {
    const service = new IdempotencyService({} as any);
    const request = await service.multipartRequest(
      { z: 1, a: 2 },
      {
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
        path: '',
        originalname: '  photo.jpg  ',
        mimetype: 'IMAGE/JPEG',
        size: 4,
      },
    );
    expect(request).toMatchObject({
      body: { a: 2, z: 1 },
      file: {
        sizeBytes: 4,
        declaredMime: 'image/jpeg',
        detectedMime: 'image/jpeg',
        fileName: 'photo.jpg',
      },
    });
    expect((request.file as any).sha256).toHaveLength(64);
  });

  it('replays the original response and rejects a changed payload', async () => {
    const repository = new MemoryRepository();
    const service = new IdempotencyService(repository as any);
    const operation = jest.fn(async () => ({ id: 'created-once' }));

    await expect(
      service.execute(7, 'post:create', 'request-1', { body: 'same' }, operation),
    ).resolves.toEqual({ id: 'created-once' });
    await expect(
      service.execute(7, 'post:create', 'request-1', { body: 'same' }, operation),
    ).resolves.toEqual({ id: 'created-once' });
    expect(operation).toHaveBeenCalledTimes(1);

    await expect(
      service.execute(7, 'post:create', 'request-1', { body: 'changed' }, operation),
    ).rejects.toMatchObject({ status: 409 });
  });
});
