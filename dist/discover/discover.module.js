"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoverModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const discover_controller_1 = require("./discover.controller");
const discover_service_1 = require("./discover.service");
const follow_module_1 = require("../follow/follow.module");
const posts_module_1 = require("../posts/posts.module");
const user_entity_1 = require("../users/entities/user.entity");
const page_entity_1 = require("../pages/entities/page.entity");
let DiscoverModule = class DiscoverModule {
};
exports.DiscoverModule = DiscoverModule;
exports.DiscoverModule = DiscoverModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, page_entity_1.Page]), follow_module_1.FollowModule, posts_module_1.PostsModule],
        controllers: [discover_controller_1.DiscoverController],
        providers: [discover_service_1.DiscoverService],
        exports: [discover_service_1.DiscoverService],
    })
], DiscoverModule);
//# sourceMappingURL=discover.module.js.map