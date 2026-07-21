import { Job } from 'src/job/entities/job.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { User } from 'src/users/entities/user.entity';
export type PostPublisherType = 'user' | 'company';
export declare class CommunityPost {
    id: number;
    creatorId: number;
    creator: User;
    publisherType: PostPublisherType;
    publisherCompanyId: number | null;
    publisherCompany: CompanyPage | null;
    body: string | null;
    imageUrl: string | null;
    imageStorageKey: string | null;
    linkedJobId: number | null;
    linkedJob: Job | null;
    allowComments: boolean;
    likesCount: number;
    commentsCount: number;
    savesCount: number;
    sharesCount: number;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
