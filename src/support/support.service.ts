import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from 'src/notifications/notifications.service';
import { SupportContactMessage } from './entities/support-contact-message.entity';
import {
  SupportTicket,
  SupportTicketCategory,
  SupportTicketKind,
} from './entities/support-ticket.entity';
import { SupportTicketAttachment } from './entities/support-ticket-attachment.entity';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportContactMessage)
    private readonly contactMessageRepo: Repository<SupportContactMessage>,

    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,

    @InjectRepository(SupportTicketAttachment)
    private readonly attachmentRepo: Repository<SupportTicketAttachment>,

    private readonly notificationsService: NotificationsService,
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
    const message = await this.contactMessageRepo.save(
      this.contactMessageRepo.create({
        userId,
        name: body.name,
        phone: body.phone,
        subject: body.subject,
        message: body.message,
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
      message: string;
      preferredContact?: string;
      contact?: string;
      attachments?: string[];
    },
  ) {
    const ticket = await this.ticketRepo.save(
      this.ticketRepo.create({
        userId,
        kind: body.kind,
        category: body.category || 'other',
        message: body.message,
        preferredContact: body.preferredContact || null,
        contact: body.contact || null,
        attachments: body.attachments || [],
      }),
    );

    await this.notificationsService.create({
      userId,
      type: 'support_ticket',
      title: 'Support ticket created',
      message: `Ticket #${ticket.id} has been created.`,
      data: { ticketId: ticket.id },
    });

    return this.formatTicketResponse(ticket, 'Ticket created successfully');
  }

  async listTickets(userId: number, page = 1, limit = 20) {
    const currentPage = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 20));

    const [tickets, total] = await this.ticketRepo.findAndCount({
      where: { userId },
      relations: ['uploadedAttachments'],
      order: { createdAt: 'DESC' },
      skip: (currentPage - 1) * take,
      take,
    });

    return {
      data: tickets.map((ticket) => this.formatTicket(ticket)),
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
    };
  }

  async addAttachment(
    userId: number,
    ticketId: number,
    file: { filename: string; mimetype?: string },
    fileUrl: string,
  ) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId) {
      throw new ForbiddenException('You cannot update this ticket');
    }
    if (!file?.filename) throw new BadRequestException('No file provided');

    const attachment = await this.attachmentRepo.save(
      this.attachmentRepo.create({
        ticketId,
        fileName: file.filename,
        fileUrl,
        contentType: file.mimetype || null,
      }),
    );

    ticket.attachments = [...(ticket.attachments || []), fileUrl];
    await this.ticketRepo.save(ticket);

    return {
      ticketId: ticket.id,
      status: ticket.status,
      createdAt: ticket.createdAt,
      message: 'Attachment uploaded successfully',
      attachment: {
        id: attachment.id,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        contentType: attachment.contentType,
        createdAt: attachment.createdAt,
      },
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

  private formatTicket(ticket: SupportTicket) {
    return {
      ticketId: ticket.id,
      kind: ticket.kind,
      category: ticket.category,
      message: ticket.message,
      preferredContact: ticket.preferredContact,
      contact: ticket.contact,
      status: ticket.status,
      attachments: ticket.attachments || [],
      uploadedAttachments: (ticket.uploadedAttachments || []).map((item) => ({
        id: item.id,
        fileName: item.fileName,
        fileUrl: item.fileUrl,
        contentType: item.contentType,
        createdAt: item.createdAt,
      })),
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }
}
