"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiOptionalIdempotencyKey = ApiOptionalIdempotencyKey;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const api_error_dto_1 = require("../common/dto/api-error.dto");
function ApiOptionalIdempotencyKey() {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiHeader)({
        name: 'Idempotency-Key',
        required: false,
        description: 'Optional retry key scoped to the authenticated user and operation. Reuse with the same payload replays the original response.',
        schema: { type: 'string', maxLength: 120 },
    }), (0, swagger_1.ApiConflictResponse)({
        description: 'The key is processing or was already used with a different payload.',
        type: api_error_dto_1.ApiErrorDto,
    }));
}
//# sourceMappingURL=idempotency.decorators.js.map