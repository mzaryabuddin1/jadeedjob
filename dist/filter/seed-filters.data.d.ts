export type SeedFilterIcon = {
    type: 'tabler';
    name: string;
} | {
    type: 'custom';
    svg: string;
};
export type SeedFilter = {
    name: string;
    icon: SeedFilterIcon;
};
export declare const SEED_FILTERS: SeedFilter[];
