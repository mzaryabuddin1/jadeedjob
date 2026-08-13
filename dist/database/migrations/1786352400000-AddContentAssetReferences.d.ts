import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddContentAssetReferences1786352400000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
