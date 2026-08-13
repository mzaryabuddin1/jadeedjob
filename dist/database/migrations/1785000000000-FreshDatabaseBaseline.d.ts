import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class FreshDatabaseBaseline1785000000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(): Promise<void>;
}
