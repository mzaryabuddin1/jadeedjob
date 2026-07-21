import { normalizeCompanyPermissions } from './company-permissions';

describe('company permissions', () => {
  it('grants publishContent to owners and admins by default', () => {
    expect(normalizeCompanyPermissions('owner').publishContent).toBe(true);
    expect(normalizeCompanyPermissions('admin').publishContent).toBe(true);
  });

  it('denies publishContent to editors unless explicitly granted', () => {
    expect(normalizeCompanyPermissions('editor').publishContent).toBe(false);
    expect(
      normalizeCompanyPermissions('editor', { publishContent: true })
        .publishContent,
    ).toBe(true);
  });

  it('does not allow owner permissions to be revoked', () => {
    expect(
      normalizeCompanyPermissions('owner', { publishContent: false })
        .publishContent,
    ).toBe(true);
  });
});
