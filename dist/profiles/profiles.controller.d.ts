import { ProfilesService } from './profiles.service';
export declare class ProfilesController {
    private readonly profilesService;
    constructor(profilesService: ProfilesService);
    searchProfiles(query: any): Promise<{
        data: Record<string, any>[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getProfile(profileType: string, profileId: number, req: any): Promise<{
        profile: {
            subtitle: string;
            location: string;
            bio: string;
            rating: {
                average: number;
                count: number;
            };
            followersCount: number;
            skills: string[];
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
            type: "user";
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        };
        viewerState: {
            following: boolean;
            isSelf: boolean;
            canManage: boolean;
        };
    } | {
        profile: {
            subtitle: string;
            location: string;
            bio: string;
            followersCount: number;
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
            avatarUri: string;
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
