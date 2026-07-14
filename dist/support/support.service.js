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
const support_contact_message_entity_1 = require("./entities/support-contact-message.entity");
const support_ticket_entity_1 = require("./entities/support-ticket.entity");
const support_ticket_attachment_entity_1 = require("./entities/support-ticket-attachment.entity");
let SupportService = class SupportService {
    constructor(contactMessageRepo, ticketRepo, attachmentRepo, notificationsService) {
        this.contactMessageRepo = contactMessageRepo;
        this.ticketRepo = ticketRepo;
        this.attachmentRepo = attachmentRepo;
        this.notificationsService = notificationsService;
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
        const message = await this.contactMessageRepo.save(this.contactMessageRepo.create({
            userId,
            name: body.name,
            phone: body.phone,
            subject: body.subject,
            message: body.message,
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
        const ticket = await this.ticketRepo.save(this.ticketRepo.create({
            userId,
            kind: body.kind,
            category: body.category || 'other',
            message: body.message,
            preferredContact: body.preferredContact || null,
            contact: body.contact || null,
            attachments: body.attachments || [],
        }));
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
    async addAttachment(userId, ticketId, file, fileUrl) {
        const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
        if (!ticket)
            throw new common_1.NotFoundException('Ticket not found');
        if (ticket.userId !== userId) {
            throw new common_1.ForbiddenException('You cannot update this ticket');
        }
        if (!file?.filename)
            throw new common_1.BadRequestException('No file provided');
        const attachment = await this.attachmentRepo.save(this.attachmentRepo.create({
            ticketId,
            fileName: file.filename,
            fileUrl,
            contentType: file.mimetype || null,
        }));
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
    formatTicketResponse(ticket, message) {
        return {
            ticketId: ticket.id,
            status: ticket.status,
            createdAt: ticket.createdAt,
            message,
        };
    }
    formatTicket(ticket) {
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
};
exports.SupportService = SupportService;
exports.SupportService = SupportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(support_contact_message_entity_1.SupportContactMessage)),
    __param(1, (0, typeorm_1.InjectRepository)(support_ticket_entity_1.SupportTicket)),
    __param(2, (0, typeorm_1.InjectRepository)(support_ticket_attachment_entity_1.SupportTicketAttachment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], SupportService);
//# sourceMappingURL=support.service.js.map