import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ObjectStorageService } from 'src/storage/object-storage.service';
import { User } from 'src/users/entities/user.entity';
import { SupportContactMessage } from './entities/support-contact-message.entity';
import {
  SupportTicket,
  SupportTicketCategory,
  SupportTicketKind,
} from './entities/support-ticket.entity';
import { SupportTicketAttachment } from './entities/support-ticket-attachment.entity';
import { SupportTicketMessage } from './entities/support-ticket-message.entity';
import { IdempotencyService } from 'src/idempotency/idempotency.service';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportContactMessage)
    private readonly contactMessageRepo: Repository<SupportContactMessage>,
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,
    @InjectRepository(SupportTicketAttachment)
    private readonly attachmentRepo: Repository<SupportTicketAttachment>,
    @InjectRepository(SupportTicketMessage)
    private readonly messageRepo: Repository<SupportTicketMessage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: ObjectStorageService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  getContactInfo() {
    return {
      phoneDisplay: process.env.SUPPORT_PHONE_DISPLAY || '+92 316 2394467',
      phone: process.env.SUPPORT_PHONE || '03162394467',
      whatsapp: process.env.SUPPORT_WHATSAPP || '03162394467',
      email: process.env.SUPPORT_EMAIL || 'support@jobsloot.com',
    };
  }

  async createContactMessage(userId: number, body: any) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const name =
      user.full_name ||
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      'JobsLoot user';
    const message = await this.contactMessageRepo.save(
      this.contactMessageRepo.create({
        userId,
        name,
        phone: user.phone,
        subject:
          String(body.subject || '').trim() ||
          process.env.SUPPORT_DEFAULT_SUBJECT ||
          'JobsLoot support request',
        message: String(body.message).trim(),
        source: body.source || 'mobile',
      }),
    );
    return {
      id: message.id,
      status: message.status,
      createdAt: message.createdAt,
      message: 'Contact message received',
    };
  }

  async createTicket(
    userId: number,
    body: {
      kind: SupportTicketKind;
      category: SupportTicketCategory;
      subject?: string;
      message: string;
      preferredContact?: string;
      contact?: string;
      attachments?: string[];
    },
    idempotencyKey?: string,
  ) {
    return this.idempotencyService.execute(
      userId,
      'support:ticket:create',
      idempotencyKey,
      body,
      () => this.createTicketInternal(userId, body, idempotencyKey),
    );
  }

  private async createTicketInternal(
    userId: number,
    body: {
      kind: SupportTicketKind;
      category: SupportTicketCategory;
      subject?: string;
      message: string;
      preferredContact?: string;
      contact?: string;
      attachments?: string[];
    },
    idempotencyKey?: string,
  ) {
    const ticket = await this.ticketRepo.manager.transaction(
      async (manager) => {
        const created = await manager.getRepository(SupportTicket).save(
          manager.getRepository(SupportTicket).create({
            userId,
            kind: body.kind,
            category: body.category || 'other',
            subject:
              String(body.subject || '').trim() ||
              this.defaultTicketSubject(body.kind, body.category),
            message: body.message,
            preferredContact: body.preferredContact || null,
            contact: body.contact || null,
            attachments: body.attachments || [],
            status: 'open',
          }),
        );
        await manager.getRepository(SupportTicketMessage).save(
          manager.getRepository(SupportTicketMessage).create({
            ticketId: created.id,
            sender: 'user',
            senderUserId: userId,
            body: body.message,
            attachments: (body.attachments || []).map((fileUrl) => ({
              fileUrl,
            })),
          }),
        );
        return created;
      },
    );
    await this.notificationsService.create({
      userId,
      type: 'support_ticket',
      title: 'Support ticket created',
      message: `Ticket #${ticket.id} has been created.`,
      data: { ticketId: ticket.id },
      dedupeKey: `support_ticket:${userId}:${idempotencyKey || ticket.id}`,
    });
    return this.formatTicketResponse(ticket, 'Ticket created successfully');
  }

  async listTickets(userId: number, page = 1, limit = 20) {
    const currentPage = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 20));
    const [tickets, total] = await this.ticketRepo.findAndCount({
      where: { userId },
      relations: ['uploadedAttachments', 'messages'],
      order: { updatedAt: 'DESC' },
      skip: (currentPage - 1) * take,
      take,
    });
    return {
      data: await Promise.all(tickets.map((ticket) => this.formatTicket(ticket))),
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
    };
  }

  async getTicket(ticketId: number, userId: number) {
    const ticket = await this.requireTicket(ticketId, userId);
    return {
      ticket: await this.formatTicket(ticket),
      ...(await this.getMessages(ticketId, userId, 1, 50)),
    };
  }

  async getMessages(
    ticketId: number,
    userId: number,
    page = 1,
    limit = 20,
  ) {
    await this.requireTicket(ticketId, userId);
    return this.listMessages(ticketId, page, limit);
  }

  async addMessage(
    ticketId: number,
    senderUserId: number,
    sender: 'user' | 'support',
    body: string,
  ) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (sender === 'user' && ticket.userId !== senderUserId) {
      throw new ForbiddenException('You cannot update this ticket');
    }
    if (['resolved', 'closed'].includes(ticket.status) && sender === 'user') {
      throw new BadRequestException('This support ticket is closed');
    }
    const message = await this.messageRepo.save(
      this.messageRepo.create({
        ticketId,
        sender,
        senderUserId,
        body: String(body).trim(),
        attachments: [],
      }),
    );
    if (sender === 'support') {
      ticket.status = ticket.status === 'open' ? 'in_progress' : ticket.status;
      await this.ticketRepo.save(ticket);
      await this.notificationsService.create({
        userId: ticket.userId,
        type: 'support_message',
        title: 'Support replied',
        message: 'You received a reply on your support ticket.',
        data: { ticketId },
      });
    } else {
      await this.ticketRepo.update(ticketId, { updatedAt: new Date() } as any);
    }
    return { message: await this.formatMessage(message) };
  }

  async addAttachment(
    userId: number,
    ticketId: number,
    file: Express.Multer.File,
  ) {
    const ticket = await this.requireTicket(ticketId, userId);
    if (['resolved', 'closed'].includes(ticket.status)) {
      throw new BadRequestException('This support ticket is closed');
    }
    const asset = await this.storageService.store({
      ownerUserId: userId,
      purpose: 'support-ticket-attachments',
      file,
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'video/mp4',
        'video/quicktime',
      ],
      maxBytes: 10 * 1024 * 1024,
      visibility: 'private',
      metadata: { ticketId },
    });
    try {
      const attachment = await this.attachmentRepo.save(
        this.attachmentRepo.create({
          ticketId,
          assetId: asset.id,
          fileName: asset.originalName,
          fileUrl: null,
          contentType: asset.contentType,
        }),
      );
      const message = await this.messageRepo.save(
        this.messageRepo.create({
          ticketId,
          sender: 'user',
          senderUserId: userId,
          body: null,
          attachments: [
            {
              assetId: asset.id,
              fileName: asset.originalName,
              contentType: asset.contentType,
              fileUrl: await this.storageService.getUrl(asset),
            },
          ],
        }),
      );
      return {
        ticketId: ticket.id,
        status: ticket.status,
        createdAt: ticket.createdAt,
        message: 'Attachment uploaded successfully',
        attachment: await this.formatAttachment(attachment),
        threadMessage: await this.formatMessage(message),
      };
    } catch (error) {
      await this.storageService.remove(asset);
      throw error;
    }
  }

  async listAdminTickets(query: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const currentPage = Math.max(1, Number(query.page) || 1);
    const take = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const [tickets, total] = await this.ticketRepo.findAndCount({
      where:
        !query.status || query.status === 'all'
          ? {}
          : ({ status: query.status } as any),
      relations: ['user', 'messages', 'uploadedAttachments'],
      order: { updatedAt: 'DESC' },
      skip: (currentPage - 1) * take,
      take,
    });
    return {
      data: await Promise.all(tickets.map((ticket) => this.formatTicket(ticket))),
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
    };
  }

  async getAdminTicket(ticketId: number) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['user', 'messages', 'uploadedAttachments'],
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return {
      ticket: await this.formatTicket(ticket),
      ...(await this.listMessages(ticketId, 1, 100)),
    };
  }

  async updateTicketStatus(ticketId: number, status: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    ticket.status = status;
    await this.ticketRepo.save(ticket);
    await this.notificationsService.create({
      userId: ticket.userId,
      type: 'support_status',
      title: 'Support ticket updated',
      message: `Ticket #${ticket.id} is now ${status}.`,
      data: { ticketId },
    });
    return {
      message: 'Support ticket status updated',
      ticketId,
      status,
    };
  }

  private async requireTicket(ticketId: number, userId: number) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['uploadedAttachments', 'messages'],
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId) {
      throw new ForbiddenException('You cannot view this ticket');
    }
    return ticket;
  }

  private async listMessages(ticketId: number, page: number, limit: number) {
    const currentPage = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 20));
    const [messages, total] = await this.messageRepo.findAndCount({
      where: { ticketId },
      order: { createdAt: 'ASC', id: 'ASC' },
      skip: (currentPage - 1) * take,
      take,
    });
    return {
      messages: await Promise.all(
        messages.map((message) => this.formatMessage(message)),
      ),
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
    };
  }

  private formatTicketResponse(ticket: SupportTicket, message: string) {
    return {
      ticketId: ticket.id,
      status: ticket.status,
      createdAt: ticket.createdAt,
      message,
    };
  }

  private async formatTicket(ticket: SupportTicket) {
    const latest = [...(ticket.messages || [])].sort(
      (a, b) => b.id - a.id,
    )[0];
    return {
      ticketId: ticket.id,
      kind: ticket.kind,
      category: ticket.category,
      subject: ticket.subject,
      message: ticket.message,
      preferredContact: ticket.preferredContact,
      contact: ticket.contact,
      status: ticket.status,
      attachments: await Promise.all(
        (ticket.uploadedAttachments || []).map((item) =>
          this.formatAttachment(item),
        ),
      ),
      latestMessage: latest ? await this.formatMessage(latest) : null,
      user: ticket.user
        ? {
            id: ticket.user.id,
            name:
              ticket.user.full_name ||
              [ticket.user.firstName, ticket.user.lastName]
                .filter(Boolean)
                .join(' '),
            phone: ticket.user.phone,
          }
        : undefined,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  private async formatMessage(message: SupportTicketMessage) {
    return {
      id: message.id,
      ticketId: message.ticketId,
      sender: message.sender,
      body: message.body || '',
      attachments: await Promise.all(
        (message.attachments || []).map(async (attachment) => ({
          ...attachment,
          fileUrl: attachment.assetId
            ? await this.storageService.getUrl(attachment.assetId)
            : attachment.fileUrl,
        })),
      ),
      createdAt: message.createdAt,
    };
  }

  private async formatAttachment(attachment: SupportTicketAttachment) {
    return {
      id: attachment.id,
      assetId: attachment.assetId || null,
      fileName: attachment.fileName,
      fileUrl: attachment.assetId
        ? await this.storageService.getUrl(attachment.assetId)
        : attachment.fileUrl,
      contentType: attachment.contentType,
      createdAt: attachment.createdAt,
    };
  }

  private defaultTicketSubject(
    kind: SupportTicketKind,
    category: SupportTicketCategory,
  ) {
    const categoryLabel = String(category || 'other').replace(/_/g, ' ');
    return `${kind === 'complaint' ? 'Complaint' : 'Feedback'}: ${categoryLabel}`;
  }
}
