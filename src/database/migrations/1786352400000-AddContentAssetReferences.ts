import {
  MigrationInterface,
  QueryRunner,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

type AssetColumn = {
  table: string;
  column: string;
  index: string;
  foreignKey: string;
};

const ASSET_COLUMNS: AssetColumn[] = [
  {
    table: 'reels',
    column: 'videoAssetId',
    index: 'IDX_reels_video_asset',
    foreignKey: 'FK_reels_video_asset',
  },
  {
    table: 'reel_upload_sessions',
    column: 'uploadedAssetId',
    index: 'IDX_reel_upload_sessions_uploaded_asset',
    foreignKey: 'FK_reel_upload_sessions_uploaded_asset',
  },
  {
    table: 'community_posts',
    column: 'imageAssetId',
    index: 'IDX_community_posts_image_asset',
    foreignKey: 'FK_community_posts_image_asset',
  },
  {
    table: 'community_posts',
    column: 'videoAssetId',
    index: 'IDX_community_posts_video_asset',
    foreignKey: 'FK_community_posts_video_asset',
  },
  {
    table: 'community_posts',
    column: 'videoThumbnailAssetId',
    index: 'IDX_community_posts_video_thumbnail_asset',
    foreignKey: 'FK_community_posts_video_thumbnail_asset',
  },
  {
    table: 'community_post_video_upload_sessions',
    column: 'uploadedAssetId',
    index: 'IDX_post_video_upload_uploaded_asset',
    foreignKey: 'FK_post_video_upload_uploaded_asset',
  },
  {
    table: 'community_post_video_upload_sessions',
    column: 'thumbnailAssetId',
    index: 'IDX_post_video_upload_thumbnail_asset',
    foreignKey: 'FK_post_video_upload_thumbnail_asset',
  },
];

export class AddContentAssetReferences1786352400000
  implements MigrationInterface
{
  name = 'AddContentAssetReferences1786352400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('stored_assets'))) {
      throw new Error(
        'stored_assets is required before content asset references can be added',
      );
    }

    for (const definition of ASSET_COLUMNS) {
      if (!(await queryRunner.hasTable(definition.table))) {
        throw new Error(`${definition.table} is required for this migration`);
      }

      if (!(await queryRunner.hasColumn(definition.table, definition.column))) {
        await queryRunner.query(
          `ALTER TABLE \`${definition.table}\` ADD COLUMN \`${definition.column}\` varchar(36) CHARACTER SET ascii COLLATE ascii_bin NULL`,
        );
      }

      const table = await queryRunner.getTable(definition.table);
      if (!table) throw new Error(`Could not inspect ${definition.table}`);

      if (!table.indices.some((index) => index.name === definition.index)) {
        await queryRunner.createIndex(
          definition.table,
          new TableIndex({
            name: definition.index,
            columnNames: [definition.column],
          }),
        );
      }

      if (
        !table.foreignKeys.some(
          (foreignKey) => foreignKey.name === definition.foreignKey,
        )
      ) {
        await queryRunner.createForeignKey(
          definition.table,
          new TableForeignKey({
            name: definition.foreignKey,
            columnNames: [definition.column],
            referencedTableName: 'stored_assets',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const definition of [...ASSET_COLUMNS].reverse()) {
      if (!(await queryRunner.hasTable(definition.table))) continue;
      const table = await queryRunner.getTable(definition.table);
      const foreignKey = table?.foreignKeys.find(
        (item) => item.name === definition.foreignKey,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey(definition.table, foreignKey);
      }
      const index = table?.indices.find(
        (item) => item.name === definition.index,
      );
      if (index) await queryRunner.dropIndex(definition.table, index);
      if (await queryRunner.hasColumn(definition.table, definition.column)) {
        await queryRunner.dropColumn(definition.table, definition.column);
      }
    }
  }
}
