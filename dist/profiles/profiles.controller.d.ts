import { ProfilesService } from './profiles.service';
import { ModerationService } from 'src/moderation/moderation.service';
export declare class ProfilesController {
    private readonly profilesService;
    private readonly moderationService;
    constructor(profilesService: ProfilesService, moderationService: ModerationService);
    searchProfiles(query: any, req: any): Promise<{
        data: Record<string, any>[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getBlocked(req: any, page?: number, limit?: number): Promise<{
        data: ({
            blockedAt: Date;
            type: "user";
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        } | {
            blockedAt: Date;
            type: "company";
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        })[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    block(profileType: string, profileId: number, req: any): Promise<{
        profileType: import("./entities/profile-follow.entity").ProfileType;
        profileId: string;
        blocked: boolean;
    }>;
    unblock(profileType: string, profileId: number, req: any): Promise<{
        profileType: import("./entities/profile-follow.entity").ProfileType;
        profileId: string;
        blocked: boolean;
    }>;
    getProfile(profileType: string, profileId: number, req: any): Promise<{
        profile: {
            avatarUri: string;
            subtitle: string;
            location: string;
            bio: string;
            rating: {
                average: number;
                count: number;
            };
            followersCount: number;
            skills: string[];
            skillGroups: {
                core: string[];
                technical: string[];
                soft: string[];
            };
            workExperience: {
                companyName: string;
                designation: string;
                department: string;
                employmentType: string;
                fromDate: Date;
                toDate: Date;
                keyResponsibilities: string;
                currentlyWorking: boolean;
            }[];
            education: {
                id: number;
                qualification: string;
                institution: string;
                graduationYear: string;
                grade: string;
            }[];
            certifications: {
                id: number;
                name: string;
                issuer: string;
                issuedAt: Date;
            }[];
            languages: {
                name: string;
                level: string;
            }[];
            socialLinks: {
                linkedin: string;
                github: string;
                portfolio: string;
                behance: string;
            };
            type: "user";
            id: string;
            name: string;
            handle: string;
            verified: boolean;
        };
        viewerState: {
            following: boolean;
            isSelf: boolean;
            canManage: boolean;
        };
    } | {
        profile: {
            avatarUri: string;
            subtitle: string;
            location: string;
            bio: string;
            rating: {
                average: number;
                count: number;
            };
            followersCount: number;
            foundedYear: number;
            employeeCount: number;
            companyType: string;
            certifications: string[];
            locations: string[];
            website: string;
            socialLinks: {
                linkedin: string;
                facebook: string;
                instagram: string;
                twitter: string;
                youtube: string;
            };
            type: "company";
            id: string;
            name: string;
            handle: string;
            verified: boolean;
        };
        viewerState: {
            following: boolean;
            isSelf: boolean;
            canManage: boolean;
        };
    }>;
    follow(profileType: string, profileId: number, req: any): Promise<{
        profileType: import("./entities/profile-follow.entity").ProfileType;
        profileId: string;
        following: boolean;
    }>;
    unfollow(profileType: string, profileId: number, req: any): Promise<{
        profileType: import("./entities/profile-follow.entity").ProfileType;
        profileId: string;
        following: boolean;
    }>;
}
