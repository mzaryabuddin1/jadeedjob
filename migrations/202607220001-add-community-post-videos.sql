ALTER TABLE community_posts
  ADD COLUMN mediaType ENUM('none', 'image', 'video') NOT NULL DEFAULT 'none' AFTER imageStorageKey,
  ADD COLUMN mediaStatus ENUM('published', 'upload_pending', 'failed') NOT NULL DEFAULT 'published' AFTER mediaType,
  ADD COLUMN videoUrl VARCHAR(2000) NULL AFTER mediaStatus,
  ADD COLUMN videoStorageKey VARCHAR(500) NULL AFTER videoUrl,
  ADD COLUMN videoThumbnailUrl VARCHAR(2000) NULL AFTER videoStorageKey,
  ADD COLUMN videoThumbnailStorageKey VARCHAR(500) NULL AFTER videoThumbnailUrl,
  ADD COLUMN videoContentType VARCHAR(100) NULL AFTER videoThumbnailStorageKey,
  ADD COLUMN videoFileSizeBytes INT UNSIGNED NULL AFTER videoContentType,
  ADD COLUMN videoDurationSeconds INT UNSIGNED NULL AFTER videoFileSizeBytes,
  ADD INDEX IDX_community_posts_media_status_created (mediaStatus, deletedAt, createdAt);

UPDATE community_posts
SET mediaType = CASE WHEN imageUrl IS NOT NULL THEN 'image' ELSE 'none' END,
    mediaStatus = 'published';

CREATE TABLE community_post_video_upload_sessions (
  id INT NOT NULL AUTO_INCREMENT,
  uploadId VARCHAR(255) NOT NULL,
  postId INT NOT NULL,
  userId INT NOT NULL,
  replacement TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('pending', 'uploaded', 'completed', 'expired', 'failed') NOT NULL DEFAULT 'pending',
  uploadKey VARCHAR(500) NULL,
  originalFileName VARCHAR(255) NOT NULL,
  contentType VARCHAR(100) NOT NULL,
  expectedFileSizeBytes INT UNSIGNED NULL,
  clientDurationSeconds INT UNSIGNED NULL,
  uploadedFileName VARCHAR(255) NULL,
  localFilePath VARCHAR(2000) NULL,
  publicUrl VARCHAR(2000) NULL,
  uploadedFileSizeBytes INT UNSIGNED NULL,
  uploadedDurationSeconds INT UNSIGNED NULL,
  uploadedContentType VARCHAR(100) NULL,
  expiresAt DATETIME NOT NULL,
  completedAt DATETIME NULL,
  errorMessage TEXT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE INDEX IDX_post_video_upload_id (uploadId),
  INDEX IDX_post_video_upload_post_user (postId, userId),
  CONSTRAINT FK_post_video_upload_post FOREIGN KEY (postId) REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT FK_post_video_upload_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
