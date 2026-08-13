"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiCommunityAcceptanceRequired = ApiCommunityAcceptanceRequired;
exports.ApiRegistrationAcceptanceRequired = ApiRegistrationAcceptanceRequired;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const legal_api_dto_1 = require("./dto/legal-api.dto");
function ApiCommunityAcceptanceRequired() {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiResponse)({
        status: 428,
        description: 'Returned only after Community Guidelines enforcement is explicitly activated.',
        type: legal_api_dto_1.LegalAcceptanceRequiredErrorDto,
    }));
}
function ApiRegistrationAcceptanceRequired() {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiResponse)({
        status: 428,
        description: 'Returned only after Terms and Privacy registration enforcement is explicitly activated.',
        type: legal_api_dto_1.LegalAcceptanceRequiredErrorDto,
    }));
}
//# sourceMappingURL=legal.decorators.js.map