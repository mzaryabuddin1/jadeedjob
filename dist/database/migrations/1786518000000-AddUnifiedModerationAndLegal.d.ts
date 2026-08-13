import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddUnifiedModerationAndLegal1786518000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(): Promise<void>;
    private backfillLegacyReports;
    private addColumn;
}
