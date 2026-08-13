import {
  applicationStatusCounts,
  buildFixtures,
  deterministicUuid,
} from '../../scripts/demo-seed/fixtures';
import {
  assertRuntimeSafety,
  parseArguments,
  publicBaseUrl,
  validateSeedResult,
} from '../../scripts/seed-demo-data';

describe('deterministic demo seed plan', () => {
  it('builds the required balanced and internally valid fixture set', () => {
    const fixtures = buildFixtures();
    expect(fixtures.users).toHaveLength(24);
    expect(fixtures.companies).toHaveLength(5);
    expect(fixtures.jobs).toHaveLength(40);
    expect(fixtures.applications).toHaveLength(60);
    expect(fixtures.posts).toHaveLength(20);
    expect(fixtures.reels).toHaveLength(8);
    expect(
      fixtures.applications.reduce((counts, application) => {
        counts[application.status] = (counts[application.status] || 0) + 1;
        return counts;
      }, {}),
    ).toEqual(applicationStatusCounts);
    expect(fixtures.jobs.every((job) => job.title.length <= 35)).toBe(true);
    expect(new Set(fixtures.users.map((user) => user.phone)).size).toBe(24);
    expect(
      new Set(
        fixtures.applications.map(
          (application) => `${application.jobKey}:${application.applicantKey}`,
        ),
      ).size,
    ).toBe(60);
  });

  it('generates stable valid UUIDs for canonical chats', () => {
    const first = deterministicUuid('application:1');
    expect(first).toBe(deterministicUuid('application:1'));
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('parses the documented command interface', () => {
    expect(
      parseArguments(['--confirm-db=jobsloot_staging', '--backup-confirmed']),
    ).toEqual({
      dryRun: false,
      backupConfirmed: true,
      confirmDatabase: 'jobsloot_staging',
      help: false,
    });
    expect(() => parseArguments(['--force'])).toThrow('Unknown seed option');
  });

  it('refuses production and requires explicit mutation safeguards', () => {
    expect(() =>
      assertRuntimeSafety(
        { dryRun: true },
        {
          NODE_ENV: 'production',
          DB_DATABASE: 'jobsloot',
          DB_SYNCHRONIZE: 'false',
        },
      ),
    ).toThrow('permanently disabled in production');
    expect(() =>
      assertRuntimeSafety(
        { dryRun: false, confirmDatabase: null },
        {
          NODE_ENV: 'development',
          DB_DATABASE: 'jobsloot_staging',
          DB_SYNCHRONIZE: 'false',
        },
      ),
    ).toThrow('--confirm-db=jobsloot_staging');
    expect(() =>
      assertRuntimeSafety(
        { dryRun: true },
        {
          NODE_ENV: 'development',
          DB_DATABASE: 'jobsloot_staging',
          DB_SYNCHRONIZE: 'true',
        },
      ),
    ).toThrow('DB_SYNCHRONIZE must be exactly false');
  });

  it('normalizes public base URLs and checks seed postconditions', () => {
    expect(publicBaseUrl({ APP_URL: 'https://jobsloot.com///' })).toBe(
      'https://jobsloot.com',
    );
    expect(() =>
      validateSeedResult({
        counts: {
          users: 24,
          companies: 5,
          jobs: 40,
          applications: 60,
          posts: 20,
          reels: 8,
          ratings: 24,
          notifications: 72,
          supportTickets: 8,
        },
        details: { messages: 167 },
      }),
    ).not.toThrow();
  });
});
