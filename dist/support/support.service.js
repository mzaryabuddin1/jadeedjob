"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notifications_service_1 = require("../notifications/notifications.service");
const object_storage_service_1 = require("../storage/object-storage.service");
const user_entity_1 = require("../users/entities/user.entity");
const support_contact_message_entity_1 = require("./entities/support-contact-message.entity");
const support_ticket_entity_1 = require("./entities/support-ticket.entity");
const support_ticket_attachment_entity_1 = require("./entities/support-ticket-attachment.entity");
const support_ticket_message_entity_1 = require("./entities/support-ticket-message.entity");
let SupportService = class SupportService {
    constructor(contactMessageRepo, ticketRepo, attachmentRepo, messageRepo, userRepo, notificationsService, storageService) {
        this.contactMessageRepo = contactMessageRepo;
        this.ticketRepo = ticketRepo;
        this.attachmentRepo = attachmentRepo;
        this.messageRepo = messageRepo;
        this.userRepo = userRepo;
        this.notificationsService = notificationsService;
        this.storageService = storageService;
    }
    getContactInfo() {
        return {
            phoneDisplay: process.env.SUPPORT_PHONE_DISPLAY || '+92 316 2394467',
            phone: process.env.SUPPORT_PHONE || '03162394467',
            whatsapp: process.env.SUPPORT_WHATSAPP || '03162394467',
            email: process.env.SUPPORT_EMAIL || 'support@jobsloot.com',
        };
    }
    async createContactMessage(userId, body) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const name = user.full_name ||
            [user.firstName, user.lastName].filter(Boolean).join(' ') ||
            'JobsLoot user';
        const message = await this.contactMessageRepo.save(this.contactMessageRepo.create({
            userId,
            name,
            phone: user.phone,
            subject: String(body.subject || '').trim() ||
                process.env.SUPPORT_DEFAULT_SUBJECT ||
                'JobsLoot support request',
            message: String(body.message).trim(),
            source: body.source || 'mobile',
        }));
        return {
            id: message.id,
            status: message.status,
            createdAt: message.createdAt,
            message: 'Contact message received',
        };
    }
    async createTicket(userId, body) {
        const ticket = await this.ticketRepo.manager.transaction(async (manager) => {
            const created = await manager.getRepository(support_ticket_entity_1.SupportTicket).save(manager.getRepository(support_ticket_entity_1.SupportTicket).create({
                userId,
                kind: body.kind,
                category: body.category || 'other',
                subject: String(body.subject || '').trim() ||
                    this.defaultTicketSubject(body.kind, body.category),
                message: body.message,
                preferredContact: body.preferredContact || null,
                contact: body.contact || null,
                attachments: body.attachments || [],
                status: 'open',
            }));
            await manager.getRepository(support_ticket_message_entity_1.SupportTicketMessage).save(manager.getRepository(support_ticket_message_entity_1.SupportTicketMessage).create({
                ticketId: created.id,
                sender: 'user',
                senderUserId: userId,
                body: body.message,
                attachments: (body.attachments || []).map((fileUrl) => ({
                    fileUrl,
                })),
            }));
            return created;
        });
        await this.notificationsService.create({
            userId,
            type: 'support_ticket',
            title: 'Support ticket created',
            message: `Ticket #${ticket.id} has been created.`,
            data: { ticketId: ticket.id },
        });
        return this.formatTicketResponse(ticket, 'Ticket created successfully');
    }
    async listTickets(userId, page = 1, limit = 20) {
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
    async getTicket(ticketId, userId) {
        const ticket = await this.requireTicket(ticketId, userId);
        return {
            ticket: await this.formatTicket(ticket),
            ...(await this.getMessages(ticketId, userId, 1, 50)),
        };
    }
    async getMessages(ticketId, userId, page = 1, limit = 20) {
        await this.requireTicket(ticketId, userId);
        return this.listMessages(ticketId, page, limit);
    }
    async addMessage(ticketId, senderUserId, sender, body) {
        const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
        if (!ticket)
            throw new common_1.NotFoundException('Ticket not found');
        if (sender === 'user' && ticket.userId !== senderUserId) {
            throw new common_1.ForbiddenException('You cannot update this ticket');
        }
        if (['resolved', 'closed'].includes(ticket.status) && sender === 'user') {
            throw new common_1.BadRequestException('This support ticket is closed');
        }
        const message = await this.messageRepo.save(this.messageRepo.create({
            ticketId,
            sender,
            senderUserId,
            body: String(body).trim(),
            attachments: [],
        }));
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
        }
        else {
            await this.ticketRepo.update(ticketId, { updatedAt: new Date() });
        }
        return { message: await this.formatMessage(message) };
    }
    async addAttachment(userId, ticketId, file) {
        const ticket = await this.requireTicket(ticketId, userId);
        if (['resolved', 'closed'].includes(ticket.status)) {
            throw new common_1.BadRequestException('This support ticket is closed');
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
            const attachment = await this.attachmentRepo.save(this.attachmentRepo.create({
                ticketId,
                assetId: asset.id,
                fileName: asset.originalName,
                fileUrl: null,
                contentType: asset.contentType,
            }));
            const message = await this.messageRepo.save(this.messageRepo.create({
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
            }));
            return {
                ticketId: ticket.id,
                status: ticket.status,
                createdAt: ticket.createdAt,
                message: 'Attachment uploaded successfully',
                attachment: await this.formatAttachment(attachment),
                threadMessage: await this.formatMessage(message),
            };
        }
        catch (error) {
            await this.storageService.remove(asset);
            throw error;
        }
    }
    async listAdminTickets(query) {
        const currentPage = Math.max(1, Number(query.page) || 1);
        const take = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const [tickets, total] = await this.ticketRepo.findAndCount({
            where: !query.status || query.status === 'all'
                ? {}
                : { status: query.status },
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
    async getAdminTicket(ticketId) {
        const ticket = await this.ticketRepo.findOne({
            where: { id: ticketId },
            relations: ['user', 'messages', 'uploadedAttachments'],
        });
        if (!ticket)
            throw new common_1.NotFoundException('Ticket not found');
        return {
            ticket: await this.formatTicket(ticket),
            ...(await this.listMessages(ticketId, 1, 100)),
        };
    }
    async updateTicketStatus(ticketId, status) {
        const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
        if (!ticket)
            throw new common_1.NotFoundException('Ticket not found');
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
    async requireTicket(ticketId, userId) {
        const ticket = await this.ticketRepo.findOne({
            where: { id: ticketId },
            relations: ['uploadedAttachments', 'messages'],
        });
        if (!ticket)
            throw new common_1.NotFoundException('Ticket not found');
        if (ticket.userId !== userId) {
            throw new common_1.ForbiddenException('You cannot view this ticket');
        }
        return ticket;
    }
    async listMessages(ticketId, page, limit) {
        const currentPage = Math.max(1, Number(page) || 1);
        const take = Math.min(100, Math.max(1, Number(limit) || 20));
        const [messages, total] = await this.messageRepo.findAndCount({
            where: { ticketId },
            order: { createdAt: 'ASC', id: 'ASC' },
            skip: (currentPage - 1) * take,
            take,
        });
        return {
            messages: await Promise.all(messages.map((message) => this.formatMessage(message))),
            total,
            totalPages: Math.ceil(total / take),
            currentPage,
        };
    }
    formatTicketResponse(ticket, message) {
        return {
            ticketId: ticket.id,
            status: ticket.status,
            createdAt: ticket.createdAt,
            message,
        };
    }
    async formatTicket(ticket) {
        const latest = [...(ticket.messages || [])].sort((a, b) => b.id - a.id)[0];
        return {
            ticketId: ticket.id,
            kind: ticket.kind,
            category: ticket.category,
            subject: ticket.subject,
            message: ticket.message,
            preferredContact: ticket.preferredContact,
            contact: ticket.contact,
            status: ticket.status,
            attachments: await Promise.all((ticket.uploadedAttachments || []).map((item) => this.formatAttachment(item))),
            latestMessage: latest ? await this.formatMessage(latest) : null,
            user: ticket.user
                ? {
                    id: ticket.user.id,
                    name: ticket.user.full_name ||
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
    async formatMessage(message) {
        return {
            id: message.id,
            ticketId: message.ticketId,
            sender: message.sender,
            body: message.body || '',
            attachments: await Promise.all((message.attachments || []).map(async (attachment) => ({
                ...attachment,
                fileUrl: attachment.assetId
                    ? await this.storageService.getUrl(attachment.assetId)
                    : attachment.fileUrl,
            }))),
            createdAt: message.createdAt,
        };
    }
    async formatAttachment(attachment) {
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
    defaultTicketSubject(kind, category) {
        const categoryLabel = String(category || 'other').replace(/_/g, ' ');
        return `${kind === 'complaint' ? 'Complaint' : 'Feedback'}: ${categoryLabel}`;
    }
};
exports.SupportService = SupportService;
exports.SupportService = SupportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(support_contact_message_entity_1.SupportContactMessage)),
    __param(1, (0, typeorm_1.InjectRepository)(support_ticket_entity_1.SupportTicket)),
    __param(2, (0, typeorm_1.InjectRepository)(support_ticket_attachment_entity_1.SupportTicketAttachment)),
    __param(3, (0, typeorm_1.InjectRepository)(support_ticket_message_entity_1.SupportTicketMessage)),
    __param(4, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService,
        object_storage_service_1.ObjectStorageService])
], SupportService);
//# sourceMappingURL=support.service.js.map