import { Repository } from 'typeorm';
import { Page } from 'src/pages/entities/page.entity';
export declare const JOB_TEAM_ROLES: string[];
type JobRef = {
    createdBy: number;
    pageId?: number | null;
};
export declare function jobTeamIds(pageRepo: Repository<Page>, job: JobRef): Promise<number[]>;
export declare function isJobTeam(pageRepo: Repository<Page>, job: JobRef, userId: number): Promise<boolean>;
export {};
