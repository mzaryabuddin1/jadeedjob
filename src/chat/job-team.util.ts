import { Repository } from 'typeorm';
import { Page } from 'src/pages/entities/page.entity';
import { rolesWith } from 'src/pages/page-permissions';

/** page roles that may handle a page's jobs (and so its job chats) */
export const JOB_TEAM_ROLES: string[] = rolesWith('jobs.manage');

type JobRef = { createdBy: number; pageId?: number | null };

/**
 * The people on the employer side of a job RIGHT NOW:
 * - a personal job: the person who posted it
 * - a job posted for a page: the page owner + every current member who may
 *   manage jobs (admin / editor). The person who posted it is NOT special -
 *   once the owner removes them from the page they are out, and the owner
 *   (and the remaining team) carry on with the applicants.
 */
export async function jobTeamIds(
  pageRepo: Repository<Page>,
  job: JobRef,
): Promise<number[]> {
  if (!job.pageId) return [job.createdBy];
  const page = await pageRepo.findOne({
    where: { id: job.pageId },
    relations: ['members'],
  });
  // the page is gone: its jobs became personal jobs of whoever posted them
  if (!page) return [job.createdBy];
  const ids = new Set<number>([page.ownerId]);
  for (const m of page.members ?? []) {
    if (JOB_TEAM_ROLES.includes(m.role)) ids.add(m.userId);
  }
  return [...ids];
}

export async function isJobTeam(
  pageRepo: Repository<Page>,
  job: JobRef,
  userId: number,
): Promise<boolean> {
  return (await jobTeamIds(pageRepo, job)).includes(userId);
}
