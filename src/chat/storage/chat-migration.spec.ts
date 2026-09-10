const {
  assignLegacyMessageSequences,
  parseArgs,
  requireConfiguration,
} = require('../../../scripts/migrate-chat-to-mongo');

export {};

describe('chat Mongo migration guards', () => {
  const original = {
    database: process.env.DB_DATABASE,
    synchronize: process.env.DB_SYNCHRONIZE,
    mongoDatabase: process.env.MONGODB_CHAT_DATABASE,
  };

  afterEach(() => {
    if (original.database === undefined) delete process.env.DB_DATABASE;
    else process.env.DB_DATABASE = original.database;
    if (original.synchronize === undefined) delete process.env.DB_SYNCHRONIZE;
    else process.env.DB_SYNCHRONIZE = original.synchronize;
    if (original.mongoDatabase === undefined) {
      delete process.env.MONGODB_CHAT_DATABASE;
    } else process.env.MONGODB_CHAT_DATABASE = original.mongoDatabase;
  });

  it('requires exact SQL and Mongo database confirmations', () => {
    process.env.DB_DATABASE = 'jobsloot_source';
    process.env.DB_SYNCHRONIZE = 'false';
    process.env.MONGODB_CHAT_DATABASE = 'jobsloot_chat';
    const options = parseArgs([
      '--dry-run',
      '--confirm-sql-db=jobsloot_source',
      '--confirm-mongo-db=jobsloot_chat',
    ]);
    expect(requireConfiguration(options)).toEqual({
      sqlDatabase: 'jobsloot_source',
      mongoDatabase: 'jobsloot_chat',
    });
    expect(() =>
      requireConfiguration({ ...options, mongoDatabase: 'wrong' }),
    ).toThrow('Pass --confirm-mongo-db=jobsloot_chat');
  });

  it('assigns sequences independently inside each conversation', () => {
    const rows = assignLegacyMessageSequences([
      { id: 40, conversationId: 'a' },
      { id: 51, conversationId: 'a' },
      { id: 90, conversationId: 'b' },
      { id: 92, conversationId: 'b' },
    ]);
    expect(rows.map((row: any) => [row.id, row.sequence])).toEqual([
      [40, 1],
      [51, 2],
      [90, 1],
      [92, 2],
    ]);
  });
});
