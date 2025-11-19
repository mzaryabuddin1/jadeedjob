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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PagesController = void 0;
const common_1 = require("@nestjs/common");
const pages_service_1 = require("./pages.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const joi_1 = __importDefault(require("joi"));
let PagesController = class PagesController {
    constructor(pagesService) {
        this.pagesService = pagesService;
    }
    createPage(body, req) {
        return this.pagesService.createPage(body, req.user.id);
    }
    getPages(query, req) {
        return this.pagesService.getPages(query, req.user.id);
    }
    getPageById(id) {
        return this.pagesService.getPageById(Number(id));
    }
    updatePage(id, body, req) {
        return this.pagesService.updatePage(Number(id), body, req.user.id);
    }
    deletePage(id, req) {
        return this.pagesService.deletePage(Number(id), req.user.id);
    }
};
exports.PagesController = PagesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        company_name: joi_1.default.string().required(),
        business_name: joi_1.default.string().optional(),
        company_logo: joi_1.default.string().optional(),
        website_url: joi_1.default.string().uri().optional(),
        official_email: joi_1.default.string().email().optional(),
        official_phone: joi_1.default.string().optional(),
        industry_type: joi_1.default.string().optional(),
        company_description: joi_1.default.string().optional(),
        founded_year: joi_1.default.number().optional(),
        country: joi_1.default.string().optional(),
        state: joi_1.default.string().optional(),
        city: joi_1.default.string().optional(),
        postal_code: joi_1.default.string().optional(),
        address_line1: joi_1.default.string().optional(),
        address_line2: joi_1.default.string().optional(),
        google_maps_link: joi_1.default.string().optional(),
        business_registration_number: joi_1.default.string().optional(),
        tax_identification_number: joi_1.default.string().optional(),
        registration_authority: joi_1.default.string().optional(),
        business_license_document: joi_1.default.string().optional(),
        company_type: joi_1.default.string().optional(),
        representative_name: joi_1.default.string().optional(),
        representative_designation: joi_1.default.string().optional(),
        representative_email: joi_1.default.string().email().optional(),
        representative_phone: joi_1.default.string().optional(),
        id_proof_document: joi_1.default.string().optional(),
        linkedin_page_url: joi_1.default.string().optional(),
        facebook_page_url: joi_1.default.string().optional(),
        instagram_page_url: joi_1.default.string().optional(),
        twitter_page_url: joi_1.default.string().optional(),
        youtube_channel_url: joi_1.default.string().optional(),
        verified_email_domain: joi_1.default.string().optional(),
        number_of_employees: joi_1.default.number().optional(),
        annual_revenue_range: joi_1.default.string().optional(),
        client_list: joi_1.default.array().items(joi_1.default.string()).optional(),
        certifications: joi_1.default.array().items(joi_1.default.string()).optional(),
        company_rating: joi_1.default.number().optional(),
    }))),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "createPage", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "getPages", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "getPageById", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "updatePage", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "deletePage", null);
exports.PagesController = PagesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('pages'),
    __metadata("design:paramtypes", [pages_service_1.PagesService])
], PagesController);
//# sourceMappingURL=pages.controller.js.map