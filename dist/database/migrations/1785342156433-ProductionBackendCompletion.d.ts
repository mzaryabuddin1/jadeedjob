import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class ProductionBackendCompletion1785342156433 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(): Promise<void>;
    private createTables;
    private addColumns;
    private extendOtpPurposes;
    private normalizeUuidColumns;
    private relaxSocialPasswordColumns;
    private removeDuplicateBackfillRows;
    private backfillApplicationConversations;
    private backfillRatings;
    private backfillSupportMessages;
    private backfillPushDevices;
    private addIndexes;
    private addForeignKeys;
    private refreshRatingAggregates;
    private verifyPostconditions;
    private readBaseline;
    private requireTables;
    private addColumn;
    private addIndex;
    private addForeignKey;
    private indexExists;
    private foreignKeyExists;
}
