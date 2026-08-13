"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiCreateModerationReport = ApiCreateModerationReport;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const api_error_dto_1 = require("../common/dto/api-error.dto");
const moderation_api_dto_1 = require("./dto/moderation-api.dto");
function ApiCreateModerationReport(summary) {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiOperation)({ summary }), (0, swagger_1.ApiBody)({ type: moderation_api_dto_1.CreateModerationReportDto }), (0, swagger_1.ApiCreatedResponse)({ type: moderation_api_dto_1.ModerationReportCreatedDto }), (0, swagger_1.ApiConflictResponse)({
        description: 'An active report already exists for this reporter and target.',
        type: api_error_dto_1.ApiErrorDto,
    }));
}
//# sourceMappingURL=moderation.decorators.js.map