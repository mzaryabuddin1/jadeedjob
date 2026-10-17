import { Repository } from 'typeorm';
import { Page } from 'src/pages/entities/page.entity';
import { rolesWith } from 'src/pages/page-permissions';

/** Page roles that may act for the page (same as creating/editing its jobs) */
export const PAGE_MANAGER_ROLES: string[] = rolesWith('jobs.manage');

/**
 * Is `userId` on the employer side of this job?
 * - the user who posted it, or
 * - for a job posted under a page: the page owner or a member with
 *   role owner / admin / editor.
 */
export async function isJobEmployer(
  pageRepo: Repository<Page>,
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
