CREATE TABLE IF NOT EXISTS community_posts (
  id INT NOT NULL AUTO_INCREMENT,
  creatorId INT NOT NULL,
  publisherType ENUM('user', 'company') NOT NULL DEFAULT 'user',
  publisherCompanyId INT NULL,
  body TEXT NULL,
  imageUrl VARCHAR(2000) NULL,
  imageStorageKey VARCHAR(500) NULL,
  linkedJobId INT NULL,
  allowComments TINYINT(1) NOT NULL DEFAULT 1,
  likesCount INT UNSIGNED NOT NULL DEFAULT 0,
  commentsCount INT UNSIGNED NOT NULL DEFAULT 0,
  savesCount INT UNSIGNED NOT NULL DEFAULT 0,
  sharesCount INT UNSIGNED NOT NULL DEFAULT 0,
  deletedAt DATETIME NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  INDEX IDX_community_posts_deleted_created (deletedAt, createdAt),
  INDEX IDX_community_posts_user_created (publisherType, creatorId, createdAt),
  INDEX IDX_community_posts_company_created (publisherType, publisherCompanyId, createdAt),
  CONSTRAINT FK_community_posts_creator FOREIGN KEY (creatorId) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT FK_community_posts_company FOREIGN KEY (publisherCompanyId) REFERENCES pages(id) ON DELETE RESTRICT,
  CONSTRAINT FK_community_posts_job FOREIGN KEY (linkedJobId) REFERENCES jobs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS community_post_likes (
  id INT NOT NULL AUTO_INCREMENT,
  postId INT NOT NULL,
  userId INT NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE INDEX UQ_community_post_likes_post_user (postId, userId),
  CONSTRAINT FK_community_post_likes_post FOREIGN KEY (postId) REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT FK_community_post_likes_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_post_saves (
  id INT NOT NULL AUTO_INCREMENT,
  postId INT NOT NULL,
  userId INT NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE INDEX UQ_community_post_saves_post_user (postId, userId),
  CONSTRAINT FK_community_post_saves_post FOREIGN KEY (postId) REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT FK_community_post_saves_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_post_comments (
  id INT NOT NULL AUTO_INCREMENT,
  postId INT NOT NULL,
  userId INT NOT NULL,
  text TEXT NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  INDEX IDX_community_post_comments_post_created (postId, createdAt),
  CONSTRAINT FK_community_post_comments_post FOREIGN KEY (postId) REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT FK_community_post_comments_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_post_reports (
  id INT NOT NULL AUTO_INCREMENT,
  postId INT NOT NULL,
  userId INT NOT NULL,
  reason VARCHAR(40) NOT NULL DEFAULT 'other',
  details TEXT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE INDEX UQ_community_post_reports_post_user (postId, userId),
  CONSTRAINT FK_community_post_reports_post FOREIGN KEY (postId) REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT FK_community_post_reports_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
