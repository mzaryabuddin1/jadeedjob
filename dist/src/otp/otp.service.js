"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
let OtpService = class OtpService {
    constructor() {
        this.otps = new Map();
    }
    generateOTP(phone, registrationData) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        this.otps.set(phone, {
            code: otp,
            used: false,
            expiresAt,
            registrationData,
        });
        console.log({
            code: otp,
            used: false,
            expiresAt,
            registrationData,
        });
        console.log(`OTP for ${phone}: ${otp}`);
        return otp;
    }
    verifyOTP(phone, code) {
        const otpEntry = this.otps.get(phone);
        console.log(this.otps);
        if (!otpEntry || otpEntry.code !== code || otpEntry.used)
            return false;
        otpEntry.used = true;
        return true;
    }
    isOtpUsed(phone) {
        const otpEntry = this.otps.get(phone);
        return !!otpEntry?.used;
    }
    getOtpEntry(phone) {
        return this.otps.get(phone);
    }
    markUsed(phone) {
        const entry = this.otps.get(phone);
        if (entry) {
            entry.used = true;
        }
    }
    deleteOtp(phone) {
        this.otps.delete(phone);
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)()
], OtpService);
//# sourceMappingURL=otp.service.js.map