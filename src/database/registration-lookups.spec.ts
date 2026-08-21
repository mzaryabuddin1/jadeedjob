const {
  COUNTRIES,
  LANGUAGES,
  parseArgs,
  requireConfiguration,
} = require('../../scripts/seed-registration-lookups');

describe('registration lookup seeder', () => {
  const originalDatabase = process.env.DB_DATABASE;
  const originalSynchronize = process.env.DB_SYNCHRONIZE;

  afterEach(() => {
    if (originalDatabase === undefined) delete process.env.DB_DATABASE;
    else process.env.DB_DATABASE = originalDatabase;
    if (originalSynchronize === undefined) delete process.env.DB_SYNCHRONIZE;
    else process.env.DB_SYNCHRONIZE = originalSynchronize;
  });

  it('keeps the registration fixtures unique and complete', () => {
    expect(COUNTRIES).toHaveLength(5);
    expect(new Set(COUNTRIES.map((item: any) => item.code)).size).toBe(5);
    expect(COUNTRIES).toContainEqual({
      name: 'Pakistan',
      code: 'PK',
      dial_code: '+92',
    });
    expect(LANGUAGES).toHaveLength(4);
    expect(new Set(LANGUAGES.map((item: any) => item.code)).size).toBe(4);
  });

  it('rejects unknown command line options', () => {
    expect(() => parseArgs(['--force'])).toThrow(
      'Unknown registration lookup seed option',
    );
  });

  it('requires an exact database confirmation and disabled synchronization', () => {
    process.env.DB_DATABASE = 'jobsloot_production';
    process.env.DB_SYNCHRONIZE = 'false';
    expect(
      requireConfiguration(parseArgs(['--confirm-db=jobsloot_production'])),
    ).toBe('jobsloot_production');
    expect(() =>
      requireConfiguration(parseArgs(['--confirm-db=another_database'])),
    ).toThrow('Pass --confirm-db=jobsloot_production');

    process.env.DB_SYNCHRONIZE = 'true';
    expect(() =>
      requireConfiguration(parseArgs(['--confirm-db=jobsloot_production'])),
    ).toThrow('DB_SYNCHRONIZE must be exactly false');
  });
});
