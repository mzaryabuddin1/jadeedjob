import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class HardenIdempotencyDeletionNotifications1786518060000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(): Promise<void>;
    private addColumn;
    private addIndex;
}
