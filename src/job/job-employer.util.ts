import { Repository } from 'typeorm';
import { CompanyPage } from 'src/pages/entities/company-page.entity';

/** Page roles that may act for the company (same as creating/editing its jobs) */
export const PAGE_MANAGER_ROLES = ['owner', 'admin', 'editor'];

/**
 * Is `userId` on the employer side of this job?
 * - the user who posted it, or
 * - for a job posted under a company page: the page owner or a member with
 *   role owner / admin / editor.
 */
export async function isJobEmployer(
  pageRepo: Repository<CompanyPage>,
  job: { createdBy: number; pageId?: number | null },
  userId: number,
): Promise<boolean> {
  if (job.createdBy === userId) return true;
  if (!job.pageId) return false;

  const page = await pageRepo.findOne({
    where: { id: job.pageId },
    relations: ['members'],
  });
  if (!page) return false;
  if (page.ownerId === userId) return true;

  return (page.members || []).some(
    (m) => m.userId === userId && PAGE_MANAGER_ROLES.includes(m.role),
  );
}
