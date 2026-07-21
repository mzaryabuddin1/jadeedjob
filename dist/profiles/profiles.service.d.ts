import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { ReelCreatorFollow } from 'src/reels/entities/reel-creator-follow.entity';
import { ProfileFollow, ProfileType } from './entities/profile-follow.entity';
type ProfileSearchQuery = {
    profileType: ProfileType;
    q: string;
    page?: number;
    limit?: number;
};
export declare class ProfilesService {
    private readonly followRepo;
    private readonly legacyFollowRepo;
    private readonly userRepo;
    private readonly pageRepo;
    constructor(followRepo: Repository<ProfileFollow>, legacyFollowRepo: Repository<ReelCreatorFollow>, userRepo: Repository<User>, pageRepo: Repository<CompanyPage>);
    searchProfiles(query: ProfileSearchQuery): Promise<{
        data: Record<string, any>[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getProfile(profileType: string, profileId: number, viewerId: number): Promise<{
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
    follow(profileType: string, profileId: number, followerUserId: number): Promise<{
        profileType: ProfileType;
        profileId: string;
        following: boolean;
    }>;
    unfollow(profileType: string, profileId: number, followerUserId: number): Promise<{
        profileType: ProfileType;
        profileId: string;
        following: boolean;
    }>;
    private getUserProfile;
    private getCompanyProfile;
    private searchUsers;
    private searchCompanies;
    private formatUserSearchResult;
    private formatCompanySearchResult;
    private getSearchPatterns;
    private getSearchResponse;
    private assertTargetViewable;
    private isFollowing;
    private parseProfileType;
    private followResponse;
    private formatLocation;
}
export {};
