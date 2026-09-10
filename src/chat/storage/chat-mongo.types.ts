export type ChatMongoAttachment = {
  assetId?: string;
  fileUrl: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
};

export type ChatMongoConversation = {
  id: string;
  type: 'application' | 'inquiry' | 'invitation';
  jobId: number | null;
  applicationId: number | null;
  createdByUserId: number;
  companyId: number | null;
  participantUserIds: number[];
  writeState: 'active' | 'read_only';
  readOnlyReason: string | null;
  clientRequestId?: string | null;
  lastActivityAt?: Date | null;
  nextSequence?: number;
  messageCount?: number;
  latestMessage?: ChatMongoMessage | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ChatMongoMessage = {
  id: string;
  conversationId: string;
  jobApplicationId: number | null;
  legacySqlId?: number | null;
  sequence: number;
  clientMessageId: string | null;
  senderId: number;
  content: string | null;
  mediaUrl: string | null;
  attachments: ChatMongoAttachment[];
  messageType: string;
  moderationStatus: 'visible' | 'hidden' | 'removed';
  createdAt: Date;
  readAt?: Date | null;
};

export type ChatMongoReadState = {
  conversationId: string;
  userId: number;
  lastReadMessageId: string | null;
  lastReadSequence: number | null;
  readAt: Date | null;
  unreadCount: number;
};

export type MongoMessagePage = {
  data: ChatMongoMessage[];
  nextBefore: string | null;
  total: number;
};

export type ChatNotificationPayload = {
  userId: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  dedupeKey: string;
};
