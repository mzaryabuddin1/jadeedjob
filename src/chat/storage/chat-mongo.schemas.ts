import { Schema } from 'mongoose';

const attachmentSchema = new Schema(
  {
    assetId: { type: String, required: false },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: false },
    contentType: { type: String, required: false },
    sizeBytes: { type: Number, required: false },
  },
  { _id: false },
);

const participantProjectionSchema = new Schema(
  {
    userId: { type: Number, required: true },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const messageProjectionSchema = new Schema(
  {
    id: { type: String, required: true },
    sequence: { type: Number, required: true },
    senderId: { type: Number, required: true },
    content: { type: String, default: null },
    mediaUrl: { type: String, default: null },
    attachments: { type: [attachmentSchema], default: [] },
    messageType: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
);

export const CHAT_MONGO_MODEL_NAMES = {
  conversation: 'ChatMongoConversation',
  participant: 'ChatMongoParticipant',
  message: 'ChatMongoMessage',
  readState: 'ChatMongoReadState',
  outbox: 'ChatMongoOutbox',
  checkpoint: 'ChatMongoMigrationCheckpoint',
} as const;

export const chatConversationSchema = new Schema(
  {
    _id: { type: String, required: true },
    type: {
      type: String,
      enum: ['application', 'inquiry', 'invitation'],
      required: true,
    },
    jobId: { type: Number, default: null },
    applicationId: { type: Number, default: null },
    createdByUserId: { type: Number, required: true },
    companyId: { type: Number, default: null },
    participantUserIds: { type: [Number], default: [] },
    writeState: {
      type: String,
      enum: ['active', 'read_only'],
      default: 'active',
    },
    readOnlyReason: { type: String, default: null },
    clientRequestId: { type: String, default: null },
    lastActivityAt: { type: Date, default: null },
    nextSequence: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    latestMessage: { type: messageProjectionSchema, default: null },
    schemaVersion: { type: Number, default: 1 },
    migratedAt: { type: Date, default: null },
  },
  {
    collection: 'chat_conversations',
    timestamps: true,
    versionKey: false,
  },
);
chatConversationSchema.index(
  { applicationId: 1 },
  {
    unique: true,
    partialFilterExpression: { applicationId: { $type: 'number' } },
    name: 'UQ_chat_conversations_application',
  },
);
chatConversationSchema.index(
  { participantUserIds: 1, lastActivityAt: -1 },
  { name: 'IDX_chat_conversations_participant_activity' },
);
chatConversationSchema.index(
  { companyId: 1, lastActivityAt: -1 },
  { name: 'IDX_chat_conversations_company_activity' },
);

export const chatParticipantSchema = new Schema(
  {
    conversationId: { type: String, required: true },
    userId: { type: Number, required: true },
    active: { type: Boolean, default: true },
  },
  {
    collection: 'chat_participants',
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);
chatParticipantSchema.index(
  { conversationId: 1, userId: 1 },
  { unique: true, name: 'UQ_chat_participants_conversation_user' },
);
chatParticipantSchema.index(
  { userId: 1, conversationId: 1 },
  { name: 'IDX_chat_participants_user_conversation' },
);

export const chatMessageSchema = new Schema(
  {
    _id: { type: String, required: true },
    conversationId: { type: String, required: true },
    jobApplicationId: { type: Number, default: null },
    legacySqlId: { type: Number, default: null },
    sequence: { type: Number, required: true },
    clientMessageId: { type: String, default: null },
    senderId: { type: Number, required: true },
    content: { type: String, default: null },
    mediaUrl: { type: String, default: null },
    attachments: { type: [attachmentSchema], default: [] },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file'],
      default: 'text',
    },
    moderationStatus: {
      type: String,
      enum: ['visible', 'hidden', 'removed'],
      default: 'visible',
    },
    createdAt: { type: Date, required: true },
  },
  { collection: 'chat_messages', versionKey: false },
);
chatMessageSchema.index(
  { conversationId: 1, sequence: 1 },
  { unique: true, name: 'UQ_chat_messages_conversation_sequence' },
);
chatMessageSchema.index(
  { conversationId: 1, moderationStatus: 1, sequence: -1 },
  { name: 'IDX_chat_messages_conversation_status_sequence' },
);
chatMessageSchema.index(
  { conversationId: 1, senderId: 1, clientMessageId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientMessageId: { $type: 'string' } },
    name: 'UQ_chat_messages_conversation_sender_client',
  },
);
chatMessageSchema.index(
  { legacySqlId: 1 },
  {
    unique: true,
    partialFilterExpression: { legacySqlId: { $type: 'number' } },
    name: 'UQ_chat_messages_legacy_sql_id',
  },
);

export const chatReadStateSchema = new Schema(
  {
    conversationId: { type: String, required: true },
    userId: { type: Number, required: true },
    lastReadMessageId: { type: String, default: null },
    lastReadSequence: { type: Number, default: null },
    readAt: { type: Date, default: null },
    unreadCount: { type: Number, default: 0 },
  },
  {
    collection: 'chat_read_states',
    timestamps: { createdAt: false, updatedAt: true },
    versionKey: false,
  },
);
chatReadStateSchema.index(
  { conversationId: 1, userId: 1 },
  { unique: true, name: 'UQ_chat_read_states_conversation_user' },
);
chatReadStateSchema.index(
  { userId: 1, updatedAt: -1 },
  { name: 'IDX_chat_read_states_user_updated' },
);

export const chatOutboxSchema = new Schema(
  {
    eventKey: { type: String, required: true },
    type: { type: String, enum: ['notification'], required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed'],
      default: 'pending',
    },
    availableAt: { type: Date, default: Date.now },
    leaseExpiresAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    lastErrorCode: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    collection: 'chat_outbox',
    timestamps: true,
    versionKey: false,
  },
);
chatOutboxSchema.index(
  { eventKey: 1 },
  { unique: true, name: 'UQ_chat_outbox_event_key' },
);
chatOutboxSchema.index(
  { status: 1, availableAt: 1, leaseExpiresAt: 1 },
  { name: 'IDX_chat_outbox_delivery' },
);

export const chatMigrationCheckpointSchema = new Schema(
  {
    _id: { type: String, required: true },
    sourceDatabase: { type: String, required: true },
    phase: { type: String, required: true },
    cursor: { type: Schema.Types.Mixed, default: null },
    counts: { type: Schema.Types.Mixed, default: {} },
    verifiedAt: { type: Date, default: null },
  },
  {
    collection: 'chat_migration_checkpoints',
    timestamps: true,
    versionKey: false,
  },
);
