"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterModule = void 0;
const common_1 = require("@nestjs/common");
const filter_service_1 = require("./filter.service");
const filter_controller_1 = require("./filter.controller");
const typeorm_1 = require("@nestjs/typeorm");
const filter_entity_1 = require("./entities/filter.entity");
const user_entity_1 = require("../users/entities/user.entity");
const job_entity_1 = require("../job/entities/job.entity");
let FilterModule = class FilterModule {
};
exports.FilterModule = FilterModule;
exports.FilterModule = FilterModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([filter_entity_1.Filter, user_entity_1.User, job_entity_1.Job])],
        controllers: [filter_controller_1.FilterController],
        providers: [filter_service_1.FilterService],
        exports: [filter_service_1.FilterService],
    })
], FilterModule);
//# sourceMappingURL=filter.module.js.map