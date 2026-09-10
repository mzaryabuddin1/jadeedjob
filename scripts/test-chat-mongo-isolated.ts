import { randomBytes } from 'crypto';
import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';
import {
  CHAT_MONGO_MODEL_NAMES,
  chatConversationSchema,
  chatMessageSchema,
  chatOutboxSchema,
  chatParticipantSchema,
  chatReadStateSchema,
} from '../src/chat/storage/chat-mongo.schemas';
import { MongoChatStore } from '../src/chat/storage/chat-mongo.store';

loadEnv({ quiet: true });

async function main() {
  const uri = String(process.env.MONGODB_URI || '').trim();
  if (!uri) throw new Error('MONGODB_URI is required');
  const database = `jobsloot_e2e_chat_${Date.now()}_${randomBytes(4).toString('hex')}`;
  if (!/^jobsloot_e2e_chat_[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error('Refusing unsafe disposable Mongo database name');
  }

  const connection = await mongoose
    .createConnection(uri, {
      dbName: database,
      retryWrites: true,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10_000,
    })
    .asPromise();
  try {
    const Conversation = connection.model(
      CHAT_MONGO_MODEL_NAMES.conversation,
      chatConversationSchema,
    );
    const Participant = connection.model(
      CHAT_MONGO_MODEL_NAMES.participant,
      chatParticipantSchema,
    );
    const Message = connection.model(
      CHAT_MONGO_MODEL_NAMES.message,
      chatMessageSchema,
    );
    const ReadState = connection.model(
      CHAT_MONGO_MODEL_NAMES.readState,
      chatReadStateSchema,
    );
    const Outbox = connection.model(
      CHAT_MONGO_MODEL_NAMES.outbox,
      chatOutboxSchema,
    );
    await Promise.all(
      [Conversation, Participant, Message, ReadState, Outbox].map((model) =>
        model.createIndexes(),
      ),
    );
    const store = new MongoChatStore(
      Conversation,
      Participant,
      Message,
      ReadState,
      Outbox,
    );
    await store.upsertConversation({
      id: '00000000-0000-4000-8000-000000000001',
      type: 'inquiry',
      jobId: null,
      applicationId: null,
      createdByUserId: 1,
      companyId: null,
      participantUserIds: [1, 2],
      writeState: 'active',
      readOnlyReason: null,
    });
    const first = await store.sendMessage({
      conversationId: '00000000-0000-4000-8000-000000000001',
      senderId: 1,
      clientMessageId: 'client-message-1',
      content: 'First message',
      attachments: [],
      messageType: 'text',
      notifications: [
        {
          userId: 2,
          type: 'chat_message',
          title: 'New message',
          message: 'First message',
          data: { chatId: '00000000-0000-4000-8000-000000000001' },
          dedupeKey: 'chat-e2e:first:user:2',
        },
      ],
    });
    const replay = await store.sendMessage({
      conversationId: first.conversationId,
      senderId: 1,
      clientMessageId: 'client-message-1',
      content: 'First message',
      attachments: [],
      messageType: 'text',
    });
    const second = await store.sendMessage({
      conversationId: first.conversationId,
      senderId: 1,
      clientMessageId: 'client-message-2',
      content: 'Second message',
      attachments: [],
      messageType: 'text',
    });
    const page = await store.getMessages(first.conversationId, null, 1, 20);
    const read = await store.markRead(first.conversationId, 2);
    await store.setMessageModeration(second.id, 'hidden');
    const visiblePage = await store.getMessages(
      first.conversationId,
      null,
      1,
      20,
    );
    const conversation = await store.findConversation(first.conversationId);

    if (
      replay.id !== first.id ||
      first.sequence !== 1 ||
      second.sequence !== 2 ||
      page.total !== 2 ||
      read.lastReadMessageId !== second.id ||
      read.lastReadSequence !== 2 ||
      visiblePage.total !== 1 ||
      conversation?.latestMessage?.id !== first.id ||
      (await Message.countDocuments()) !== 2 ||
      (await Outbox.countDocuments()) !== 1
    ) {
      throw new Error('Mongo chat isolated postconditions failed');
    }
    process.stdout.write(`Mongo chat fixtures passed in ${database}\n`);
  } finally {
    await connection.dropDatabase().catch(() => undefined);
    await connection.close();
  }
}

main().catch((error) => {
  const code = (error as any)?.code || (error as Error)?.name || 'ERROR';
  process.stderr.write(
    `${code}: ${(error as Error)?.message || String(error)}\n`,
  );
  process.exitCode = 1;
});
