import { Filter } from './entities/filter.entity';
export declare const DEFAULT_ICON_COLOR = "#2F6F73";
export declare const FALLBACK_ICON_COLOR = "#6B7280";
export declare const FALLBACK_ICON_LIBRARY = "Feather";
export declare const FALLBACK_ICON_NAME = "briefcase";
export declare const ICON_LIBRARIES: readonly ["Feather", "FontAwesome", "FontAwesome5"];
export type FilterIconMeta = {
    source: 'library';
    library: string;
    name: string;
    color: string;
} | {
    source: 'svg';
    svg: string;
    color: string;
};
export declare function buildFilterIconMeta(filter: Filter): FilterIconMeta;
export declare function withFilterIconMeta(filter: Filter): {
    iconMeta: FilterIconMeta;
    id: number;
    name: string;
    icon: string;
    iconSource: import("./entities/filter.entity").FilterIconSource;
    iconLibrary: import("./entities/filter.entity").FilterIconLibrary | null;
    iconName: string | null;
    iconColor: string;
    iconSvg: string | null;
    status: "active" | "inactive";
    approvalStatus: "pending" | "approved" | "rejected";
    rejectionReason: string;
    createdBy: number;
    creator: import("../users/entities/user.entity").User;
    jobs: import("../job/entities/job.entity").Job[];
    createdAt: Date;
    updatedAt: Date;
};
