"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = exports.DEV_OTP_CODE = void 0;
const common_1 = require("@nestjs/common");
exports.DEV_OTP_CODE = '123456';
let OtpService = class OtpService {
    constructor() {
        this.otps = new Map();
    }
    generateOTP(key, registrationData) {
        const otp = exports.DEV_OTP_CODE;
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        this.otps.set(key, {
            code: otp,
            used: false,
            expiresAt,
            registrationData,
        });
        console.log(`OTP for ${key}: ${otp}`);
        return otp;
    }
    verifyOTP(key, code) {
        const otpEntry = this.otps.get(key);
        if (!otpEntry || otpEntry.code !== code || otpEntry.used)
            return false;
        otpEntry.used = true;
        return true;
    }
    isOtpUsed(key) {
        const otpEntry = this.otps.get(key);
        return !!otpEntry?.used;
    }
    getOtpEntry(key) {
        return this.otps.get(key);
    }
    markUsed(key) {
        const entry = this.otps.get(key);
        if (entry) {
            entry.used = true;
        }
    }
    deleteOtp(key) {
        this.otps.delete(key);
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)()
], OtpService);
//# sourceMappingURL=otp.service.js.map