import { DynamicModule, Global, Module } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import {
  CHAT_MONGO_MODEL_NAMES,
  chatConversationSchema,
  chatMessageSchema,
  chatMigrationCheckpointSchema,
  chatOutboxSchema,
  chatParticipantSchema,
  chatReadStateSchema,
} from './chat-mongo.schemas';
import {
  CHAT_MONGO_STORE,
  DisabledChatMongoStore,
  MongoChatStore,
} from './chat-mongo.store';
import { mongoChatEnabled } from './chat-storage-mode';
import { ChatAuthorizationCacheService } from '../chat-authorization-cache.service';

export const CHAT_MONGO_CONNECTION = 'jobsloot-chat';

@Global()
@Module({})
export class ChatMongoModule {
  static register(): DynamicModule {
    if (!mongoChatEnabled()) {
      return {
        module: ChatMongoModule,
        providers: [
          { provide: CHAT_MONGO_STORE, useClass: DisabledChatMongoStore },
          ChatAuthorizationCacheService,
        ],
        exports: [CHAT_MONGO_STORE, ChatAuthorizationCacheService],
      };
    }

    const uri = String(process.env.MONGODB_URI || '').trim();
    const dbName = String(
      process.env.MONGODB_CHAT_DATABASE || 'jobsloot_chat',
    ).trim();
    if (!uri) {
      throw new Error(
        'MONGODB_URI is required when CHAT_STORAGE_MODE is dual or mongo',
      );
    }

    const modelDefinitions = [
      {
        name: CHAT_MONGO_MODEL_NAMES.conversation,
        schema: chatConversationSchema,
      },
      {
        name: CHAT_MONGO_MODEL_NAMES.participant,
        schema: chatParticipantSchema,
      },
      { name: CHAT_MONGO_MODEL_NAMES.message, schema: chatMessageSchema },
      {
        name: CHAT_MONGO_MODEL_NAMES.readState,
        schema: chatReadStateSchema,
      },
      { name: CHAT_MONGO_MODEL_NAMES.outbox, schema: chatOutboxSchema },
      {
        name: CHAT_MONGO_MODEL_NAMES.checkpoint,
        schema: chatMigrationCheckpointSchema,
      },
    ];

    return {
      module: ChatMongoModule,
      imports: [
        MongooseModule.forRoot(uri, {
          connectionName: CHAT_MONGO_CONNECTION,
          dbName,
          maxPoolSize: Number(process.env.MONGODB_CHAT_MAX_POOL_SIZE || 50),
          minPoolSize: Number(process.env.MONGODB_CHAT_MIN_POOL_SIZE || 2),
          serverSelectionTimeoutMS: Number(
            process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10_000,
          ),
          autoIndex:
            process.env.MONGODB_CHAT_AUTO_INDEX === 'true' ||
            !['staging', 'production'].includes(process.env.NODE_ENV || ''),
          retryWrites: true,
        }),
        MongooseModule.forFeature(modelDefinitions, CHAT_MONGO_CONNECTION),
      ],
      providers: [
        ChatAuthorizationCacheService,
        {
          provide: CHAT_MONGO_STORE,
          inject: modelDefinitions.map((item) =>
            getModelToken(item.name, CHAT_MONGO_CONNECTION),
          ),
          useFactory: (...models: any[]) =>
            new MongoChatStore(
              models[0],
              models[1],
              models[2],
              models[3],
              models[4],
            ),
        },
      ],
      exports: [CHAT_MONGO_STORE, ChatAuthorizationCacheService],
    };
  }
}
