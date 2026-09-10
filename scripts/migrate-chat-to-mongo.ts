import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import mysql from 'mysql2/promise';
import mongoose from 'mongoose';
import {
  CHAT_MONGO_MODEL_NAMES,
  chatConversationSchema,
  chatMessageSchema,
  chatMigrationCheckpointSchema,
  chatOutboxSchema,
  chatParticipantSchema,
  chatReadStateSchema,
} from '../src/chat/storage/chat-mongo.schemas';

loadEnv({ quiet: true });

type Options = {
  dryRun: boolean;
  sqlDatabase: string;
  mongoDatabase: string;
  batchSize: number;
};

function parseArgs(args: string[]): Options {
  const value: Options = {
    dryRun: false,
    sqlDatabase: '',
    mongoDatabase: '',
    batchSize: 100,
  };
  for (const argument of args) {
    if (argument === '--dry-run') value.dryRun = true;
    else if (argument.startsWith('--confirm-sql-db=')) {
      value.sqlDatabase = argument.slice('--confirm-sql-db='.length).trim();
    } else if (argument.startsWith('--confirm-mongo-db=')) {
      value.mongoDatabase = argument.slice('--confirm-mongo-db='.length).trim();
    } else if (argument.startsWith('--batch-size=')) {
      value.batchSize = Number(argument.slice('--batch-size='.length));
    }
  }
  if (
    !Number.isInteger(value.batchSize) ||
    value.batchSize < 1 ||
    value.batchSize > 1000
  ) {
    throw new Error('--batch-size must be an integer from 1 to 1000');
  }
  return value;
}

function requireConfiguration(options: Options) {
  const sqlDatabase = String(process.env.DB_DATABASE || '').trim();
  const mongoDatabase = String(
    process.env.MONGODB_CHAT_DATABASE || 'jobsloot_chat',
  ).trim();
  if (!sqlDatabase) throw new Error('DB_DATABASE is required');
  if (!String(process.env.MONGODB_URI || '').trim() && !options.dryRun) {
    throw new Error('MONGODB_URI is required');
  }
  if (process.env.DB_SYNCHRONIZE !== 'false') {
    throw new Error('DB_SYNCHRONIZE must be exactly false');
  }
  if (
    String(process.env.CHAT_STORAGE_MODE || 'sql').toLowerCase() === 'mongo'
  ) {
    throw new Error(
      'Run the SQL backfill only in sql or dual mode, never in mongo mode',
    );
  }
  if (options.sqlDatabase !== sqlDatabase) {
    throw new Error(
      `Refusing SQL database ${sqlDatabase}. Pass --confirm-sql-db=${sqlDatabase}.`,
    );
  }
  if (options.mongoDatabase !== mongoDatabase) {
    throw new Error(
      `Refusing Mongo database ${mongoDatabase}. Pass --confirm-mongo-db=${mongoDatabase}.`,
    );
  }
  return { sqlDatabase, mongoDatabase };
}

function jsonArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function assignLegacyMessageSequences(messages: any[]) {
  const counters = new Map<string, number>();
  return messages.map((row) => {
    const conversationId = String(row.conversationId);
    const sequence = (counters.get(conversationId) || 0) + 1;
    counters.set(conversationId, sequence);
    return { ...row, sequence };
  });
}

async function assertSqlTables(connection: mysql.Connection) {
  const required = [
    'chat_conversations',
    'chat_participants',
    'chat_messages',
    'chat_read_states',
  ];
  const [rows] = await connection.query<any[]>(
    `SELECT TABLE_NAME
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?)`,
    [process.env.DB_DATABASE, required],
  );
  const existing = new Set(rows.map((row) => row.TABLE_NAME));
  const missing = required.filter((table) => !existing.has(table));
  if (missing.length) {
    throw new Error(`Missing SQL chat tables: ${missing.join(', ')}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const databases = requireConfiguration(options);
  const plan = {
    dryRun: options.dryRun,
    source: { type: 'mysql', database: databases.sqlDatabase },
    target: { type: 'mongodb', database: databases.mongoDatabase },
    batchSize: options.batchSize,
    collections: [
      'chat_conversations',
      'chat_participants',
      'chat_messages',
      'chat_read_states',
      'chat_outbox',
      'chat_migration_checkpoints',
    ],
    behavior: 'upsert-only; SQL remains unchanged',
  };
  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }

  const sql = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: databases.sqlDatabase,
  });
  const mongo = await mongoose
    .createConnection(String(process.env.MONGODB_URI), {
      dbName: databases.mongoDatabase,
      maxPoolSize: 10,
      retryWrites: true,
    })
    .asPromise();

  const Conversation = mongo.model(
    CHAT_MONGO_MODEL_NAMES.conversation,
    chatConversationSchema,
  );
  const Participant = mongo.model(
    CHAT_MONGO_MODEL_NAMES.participant,
    chatParticipantSchema,
  );
  const Message = mongo.model(
    CHAT_MONGO_MODEL_NAMES.message,
    chatMessageSchema,
  );
  const ReadState = mongo.model(
    CHAT_MONGO_MODEL_NAMES.readState,
    chatReadStateSchema,
  );
  const Outbox = mongo.model(CHAT_MONGO_MODEL_NAMES.outbox, chatOutboxSchema);
  const Checkpoint = mongo.model(
    CHAT_MONGO_MODEL_NAMES.checkpoint,
    chatMigrationCheckpointSchema,
  );

  const counts = {
    conversations: 0,
    participants: 0,
    messages: 0,
    readStates: 0,
  };
  let cursor = '';
  try {
    await assertSqlTables(sql);
    await Promise.all(
      [Conversation, Participant, Message, ReadState, Outbox, Checkpoint].map(
        (model) => model.createIndexes(),
      ),
    );
    const checkpointId = `mysql:${databases.sqlDatabase}:chat-v1`;
    const checkpoint: any = await Checkpoint.findById(checkpointId)
      .lean()
      .exec();
    if (checkpoint?.phase === 'backfill') {
      cursor = String(checkpoint.cursor || '');
      Object.assign(counts, checkpoint.counts || {});
    }
    await Checkpoint.updateOne(
      { _id: checkpointId },
      {
        $set: {
          sourceDatabase: databases.sqlDatabase,
          phase: 'backfill',
          cursor,
          counts,
          verifiedAt: null,
        },
      },
      { upsert: true },
    );

    while (true) {
      const [conversations] = await sql.query<any[]>(
        `SELECT *
           FROM chat_conversations
          WHERE id > ?
          ORDER BY id ASC
          LIMIT ?`,
        [cursor, options.batchSize],
      );
      if (!conversations.length) break;
      const ids = conversations.map((row) => String(row.id));
      const placeholders = ids.map(() => '?').join(',');
      const [participants] = await sql.query<any[]>(
        `SELECT * FROM chat_participants
          WHERE conversationId IN (${placeholders})
          ORDER BY conversationId, userId`,
        ids,
      );
      const [messages] = await sql.query<any[]>(
        `SELECT * FROM chat_messages
          WHERE conversationId IN (${placeholders})
          ORDER BY conversationId, createdAt, id`,
        ids,
      );
      const sequencedMessages = assignLegacyMessageSequences(messages);
      const sequenceByLegacyId = new Map(
        sequencedMessages.map((row) => [Number(row.id), Number(row.sequence)]),
      );
      const [readStates] = await sql.query<any[]>(
        `SELECT * FROM chat_read_states
          WHERE conversationId IN (${placeholders})
          ORDER BY conversationId, userId`,
        ids,
      );
      const effectiveReadStates = [...readStates];
      const readStateKeys = new Set(
        readStates.map(
          (row) => `${String(row.conversationId)}:${Number(row.userId)}`,
        ),
      );
      for (const participant of participants) {
        const key = `${String(participant.conversationId)}:${Number(
          participant.userId,
        )}`;
        if (readStateKeys.has(key)) continue;
        readStateKeys.add(key);
        effectiveReadStates.push({
          conversationId: participant.conversationId,
          userId: participant.userId,
          lastReadMessageId: null,
          readAt: null,
        });
      }

      if (participants.length) {
        await Participant.bulkWrite(
          participants.map((row) => ({
            updateOne: {
              filter: {
                conversationId: String(row.conversationId),
                userId: Number(row.userId),
              },
              update: { $set: { active: Boolean(row.active) } },
              upsert: true,
            },
          })),
          { ordered: false },
        );
      }
      if (sequencedMessages.length) {
        await Message.bulkWrite(
          sequencedMessages.map((row) => ({
            updateOne: {
              filter: { _id: String(row.id) },
              update: {
                $set: {
                  conversationId: String(row.conversationId),
                  jobApplicationId: row.jobApplicationId ?? null,
                  legacySqlId: Number(row.id),
                  sequence: Number(row.sequence),
                  clientMessageId: row.clientMessageId || null,
                  senderId: Number(row.senderId),
                  content: row.content || null,
                  mediaUrl: row.mediaUrl || null,
                  attachments: jsonArray(row.attachments),
                  messageType: row.messageType || 'text',
                  moderationStatus: row.moderationStatus || 'visible',
                  createdAt: row.createdAt,
                },
              },
              upsert: true,
            },
          })) as any,
          { ordered: false },
        );
      }
      if (effectiveReadStates.length) {
        await ReadState.bulkWrite(
          effectiveReadStates.map((row) => {
            const conversationId = String(row.conversationId);
            const userId = Number(row.userId);
            const lastReadSequence = row.lastReadMessageId
              ? sequenceByLegacyId.get(Number(row.lastReadMessageId)) || null
              : null;
            const unreadCount = sequencedMessages.filter(
              (message) =>
                String(message.conversationId) === conversationId &&
                Number(message.senderId) !== userId &&
                (message.moderationStatus || 'visible') === 'visible' &&
                Number(message.sequence) > Number(lastReadSequence || 0),
            ).length;
            return {
              updateOne: {
                filter: { conversationId, userId },
                update: {
                  $set: {
                    lastReadMessageId: row.lastReadMessageId
                      ? String(row.lastReadMessageId)
                      : null,
                    lastReadSequence,
                    readAt: row.readAt || null,
                    unreadCount,
                  },
                },
                upsert: true,
              },
            };
          }),
          { ordered: false },
        );
      }

      for (const conversation of conversations) {
        const conversationId = String(conversation.id);
        const participantUserIds = participants
          .filter(
            (row) =>
              String(row.conversationId) === conversationId &&
              Boolean(row.active),
          )
          .map((row) => Number(row.userId));
        const conversationMessages = sequencedMessages.filter(
          (row) => String(row.conversationId) === conversationId,
        );
        const visibleMessages = conversationMessages.filter(
          (row) => (row.moderationStatus || 'visible') === 'visible',
        );
        const latest = visibleMessages[visibleMessages.length - 1];
        const latestMessage = latest
          ? {
              id: String(latest.id),
              sequence: Number(latest.sequence),
              senderId: Number(latest.senderId),
              content: latest.content || null,
              mediaUrl: latest.mediaUrl || null,
              attachments: jsonArray(latest.attachments),
              messageType: latest.messageType || 'text',
              createdAt: latest.createdAt,
            }
          : null;
        await Conversation.updateOne(
          { _id: conversationId },
          {
            $set: {
              type: conversation.type,
              jobId: conversation.jobId ?? null,
              applicationId: conversation.applicationId ?? null,
              createdByUserId: Number(conversation.createdByUserId),
              companyId: conversation.companyId ?? null,
              participantUserIds,
              writeState: conversation.writeState || 'active',
              readOnlyReason: conversation.readOnlyReason || null,
              clientRequestId: conversation.clientRequestId || null,
              lastActivityAt:
                conversation.lastActivityAt || latest?.createdAt || null,
              latestMessage,
              messageCount: visibleMessages.length,
              schemaVersion: 1,
              migratedAt: new Date(),
              createdAt: conversation.createdAt,
              updatedAt: conversation.updatedAt,
            },
            $max: {
              nextSequence: conversationMessages.length,
            },
          },
          { upsert: true },
        );
      }

      const [
        migratedMessages,
        migratedParticipants,
        migratedReadStates,
        migratedConversations,
      ] = await Promise.all([
        Message.find({ conversationId: { $in: ids } })
          .lean()
          .exec(),
        Participant.find({ conversationId: { $in: ids } })
          .lean()
          .exec(),
        ReadState.find({ conversationId: { $in: ids } })
          .lean()
          .exec(),
        Conversation.find({ _id: { $in: ids } })
          .lean()
          .exec(),
      ]);
      const mongoMessagesById = new Map(
        migratedMessages.map((row: any) => [String(row._id), row]),
      );
      for (const source of sequencedMessages) {
        const target: any = mongoMessagesById.get(String(source.id));
        if (
          !target ||
          String(target.conversationId) !== String(source.conversationId) ||
          Number(target.sequence) !== Number(source.sequence) ||
          (target.moderationStatus || 'visible') !==
            (source.moderationStatus || 'visible') ||
          JSON.stringify(target.attachments || []) !==
            JSON.stringify(jsonArray(source.attachments))
        ) {
          throw new Error(
            `Message verification failed for SQL chat message ${source.id}`,
          );
        }
      }
      for (const conversation of conversations) {
        const conversationId = String(conversation.id);
        const sourceMessages = sequencedMessages.filter(
          (row) => String(row.conversationId) === conversationId,
        );
        const sourceParticipants = participants.filter(
          (row) => String(row.conversationId) === conversationId,
        );
        const sourceReadStates = effectiveReadStates.filter(
          (row) => String(row.conversationId) === conversationId,
        );
        const targetConversation: any = migratedConversations.find(
          (row: any) => String(row._id) === conversationId,
        );
        const visible = sourceMessages.filter(
          (row) => (row.moderationStatus || 'visible') === 'visible',
        );
        const latest = visible[visible.length - 1];
        if (
          !targetConversation ||
          Number(targetConversation.nextSequence || 0) <
            sourceMessages.length ||
          Number(targetConversation.messageCount || 0) !== visible.length ||
          String(targetConversation.latestMessage?.id || '') !==
            String(latest?.id || '') ||
          migratedParticipants.filter(
            (row: any) => String(row.conversationId) === conversationId,
          ).length !== sourceParticipants.length ||
          migratedReadStates.filter(
            (row: any) => String(row.conversationId) === conversationId,
          ).length !== sourceReadStates.length
        ) {
          throw new Error(
            `Conversation verification failed for ${conversationId}`,
          );
        }
      }

      counts.conversations += conversations.length;
      counts.participants += participants.length;
      counts.messages += messages.length;
      counts.readStates += effectiveReadStates.length;
      cursor = ids[ids.length - 1];
      await Checkpoint.updateOne(
        { _id: checkpointId },
        {
          $set: {
            sourceDatabase: databases.sqlDatabase,
            phase: 'backfill',
            cursor,
            counts,
          },
        },
        { upsert: true },
      );
    }

    const [sqlCounts] = await sql.query<any[]>(`
      SELECT
        (SELECT COUNT(*) FROM chat_conversations) conversations,
        (SELECT COUNT(*) FROM chat_participants) participants,
        (SELECT COUNT(*) FROM chat_messages) messages,
        (SELECT COUNT(*) FROM chat_read_states) readStates
    `);
    const mongoCounts = {
      conversations: await Conversation.countDocuments(),
      participants: await Participant.countDocuments(),
      messages: await Message.countDocuments(),
      readStates: await ReadState.countDocuments(),
    };
    for (const key of Object.keys(mongoCounts) as Array<
      keyof typeof mongoCounts
    >) {
      if (Number(mongoCounts[key]) < Number(sqlCounts[0][key])) {
        throw new Error(
          `Verification failed for ${key}: SQL=${sqlCounts[0][key]} Mongo=${mongoCounts[key]}`,
        );
      }
    }
    await Checkpoint.updateOne(
      { _id: checkpointId },
      {
        $set: {
          sourceDatabase: databases.sqlDatabase,
          phase: 'verified',
          cursor,
          counts,
          verifiedAt: new Date(),
        },
      },
      { upsert: true },
    );
    process.stdout.write(
      `${JSON.stringify({ migrated: counts, verified: { sql: sqlCounts[0], mongo: mongoCounts } }, null, 2)}\n`,
    );
  } finally {
    await Promise.allSettled([sql.end(), mongo.close()]);
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(
      `${(error as any)?.code || (error as Error)?.name || 'CHAT_MIGRATION_FAILED'}: ${(error as Error)?.message || String(error)}\n`,
    );
    process.exitCode = 1;
  });
}

export { assignLegacyMessageSequences, main, parseArgs, requireConfiguration };
