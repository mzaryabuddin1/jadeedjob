import { FreshDatabaseBaseline1785000000000 } from './migrations/1785000000000-FreshDatabaseBaseline';

describe('FreshDatabaseBaseline1785000000000', () => {
  it('is a strict no-op when every entity table already exists', async () => {
    const query = jest.fn();
    const log = jest.fn();
    const migration = new FreshDatabaseBaseline1785000000000();
    const runner: any = {
      getTables: jest.fn().mockResolvedValue([{ name: 'users' }]),
      query,
      connection: {
        entityMetadatas: [{ tablePath: 'users' }],
        driver: { createSchemaBuilder: () => ({ log }) },
      },
    };

    await migration.up(runner);

    expect(log).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('executes only exact missing entity CREATE TABLE statements', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new FreshDatabaseBaseline1785000000000();
    const runner: any = {
      getTables: jest.fn().mockResolvedValue([{ name: 'users' }]),
      query,
      connection: {
        entityMetadatas: [
          { tablePath: 'users' },
          { tablePath: 'jobs' },
          { tablePath: 'notifications' },
        ],
        driver: {
          createSchemaBuilder: () => ({
            log: jest.fn().mockResolvedValue({
              upQueries: [
                { query: 'ALTER TABLE `users` ADD `unsafe` int' },
                { query: 'CREATE TABLE `temporary_users` (`id` int)' },
                { query: 'CREATE TABLE `jobs` (`id` int)' },
                { query: 'CREATE INDEX `ignored` ON `jobs` (`id`)' },
                { query: 'CREATE TABLE `notifications` (`id` int)' },
              ],
            }),
          }),
        },
      },
    };

    await migration.up(runner);

    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      'CREATE TABLE IF NOT EXISTS `jobs` (`id` int)',
      'CREATE TABLE IF NOT EXISTS `notifications` (`id` int)',
    ]);
  });

  it('fails rather than falling back to a non-create schema change', async () => {
    const migration = new FreshDatabaseBaseline1785000000000();
    const runner: any = {
      getTables: jest.fn().mockResolvedValue([]),
      query: jest.fn(),
      connection: {
        entityMetadatas: [{ tablePath: 'users' }],
        driver: {
          createSchemaBuilder: () => ({
            log: jest.fn().mockResolvedValue({ upQueries: [] }),
          }),
        },
      },
    };

    await expect(migration.up(runner)).rejects.toThrow(
      'Could not generate create-only baseline for: users',
    );
    expect(runner.query).not.toHaveBeenCalled();
  });
});
