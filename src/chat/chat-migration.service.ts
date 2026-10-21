import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { ConversationMessage } from './entities/conversation-message.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';

/**
 * One-time copy of the old per-application chat (`chat_messages`) into job
 * conversations (the chat of an application = job chat of its job + applicant,
 * key `j:{jobId}:{applicantId}`). Idempotent: an application whose conversation
 * already exists is skipped, so it is safe on every start. The old table is
 * left untouched (nothing writes to it any more). Also turns conversations of
 * the short-lived `application` type into job chats.
 */
@Injectable()
export class ChatMigration implements OnApplicationBootstrap {
  private readonly logger = new Logger(ChatMigration.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly legacyRepo: Repository<ChatMessage>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly memberRepo: Repository<ConversationMember>,
    @InjectRepository(ConversationMessage)
    private readonly msgRepo: Repository<ConversationMessage>,
    @InjectRepository(JobApplication)
    private readonly appRepo: Repository<JobApplication>,
  ) {}

  onApplicationBootstrap() {
    void this.run().catch((err) =>
      this.logger.error(`Chat migration failed: ${(err as Error)?.message}`),
    );
  }

  async run() {
    await this.convRepo.query(
      "UPDATE IGNORE conversations SET type = 'job', `key` = CONCAT('j:', jobId, ':', createdBy) WHERE type = 'application' AND jobId IS NOT NULL",
    );
    const pending: { appId: number }[] = await this.legacyRepo
      .createQueryBuilder('m')
      .select('DISTINCT m.jobApplicationId', 'appId')
      .where(
        "NOT EXISTS (SELECT 1 FROM job_applications ja INNER JOIN conversations c ON c.`key` = CONCAT('j:', ja.jobId, ':', ja.applicantId) WHERE ja.id = m.jobApplicationId)",
      )
      .getRawMany();
    if (!pending.length) return;

    let done = 0;
    for (const { appId } of pending) {
      try {
        await this.migrateApplication(Number(appId));
        done++;
      } catch (err) {
        this.logger.error(`Application ${appId} not migrated: ${(err as Error)?.message}`);
      }
    }
    this.logger.log(`Migrated ${done}/${pending.length} application chats to conversations`);
  }

  private async migrateApplication(appId: number) {
    const app = await this.appRepo.findOne({ where: { id: appId }, relations: ['job'] });
    if (!app) return; // the application is gone

    const old = await this.legacyRepo.find({
      where: { jobApplicationId: appId },
      order: { id: 'ASC' },
      loadEagerRelations: false,
    });
    if (!old.length) return;

    await this.convRepo.manager.transaction(async (m) => {
      const conv = await m.save(
        m.create(Conversation, {
          type: 'job',
          key: `j:${app.jobId}:${app.applicantId}`,
          jobId: app.jobId,
          createdBy: app.applicantId,
        }),
      );
      let lastId = 0;
      let lastAt: Date | null = null;
      for (const o of old) {
        const saved = await m.save(
          m.create(ConversationMessage, {
            conversationId: conv.id,
            senderId: o.senderId,
            messageType: o.messageType as ConversationMessage['messageType'],
            content: o.content ?? null,
            mediaUrl: o.mediaUrl ?? null,
            createdAt: o.createdAt,
          }),
        );
        lastId = saved.id;
        lastAt = o.createdAt;
      }
      await m.update(Conversation, conv.id, { lastMessageId: lastId, lastMessageAt: lastAt });
      // everything that was there before the upgrade counts as read
      for (const userId of new Set([app.applicantId, app.job.createdBy])) {
        await m.insert(ConversationMember, { conversationId: conv.id, userId, lastReadMessageId: lastId });
      }
    });
  }
}
