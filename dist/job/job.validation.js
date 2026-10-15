"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateJobSchema = exports.createJobSchema = void 0;
exports.parseJobBody = parseJobBody;
const Joi = __importStar(require("joi"));
const locationSchema = Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
});
const salaryType = Joi.string().valid('piece-rate', 'daily-wage', 'hourly', 'monthly', 'fixed', 'commission', 'negotiable');
const shiftsSchema = Joi.array().items(Joi.string().valid('morning', 'evening', 'night', 'rotational'));
const jobTypesSchema = Joi.array().items(Joi.string().valid('full-time', 'part-time', 'contract', 'temporary', 'freelance', 'internship'));
function parseJobBody(raw) {
    if (!raw || typeof raw !== 'object')
        return {};
    const body = { ...raw };
    const parseJsonField = (key) => {
        if (typeof body[key] !== 'string')
            return;
        const trimmed = body[key].trim();
        if (!trimmed) {
            body[key] = undefined;
            return;
        }
        try {
            body[key] = JSON.parse(trimmed);
        }
        catch {
        }
    };
    for (const key of [
        'location',
        'filterIds',
        'benefits',
        'shifts',
        'jobTypes',
        'languageRequirements',
        'pictures',
    ]) {
        parseJsonField(key);
    }
    if (typeof body.filterIds === 'string') {
        body.filterIds = body.filterIds
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => !Number.isNaN(n));
    }
    if (typeof body.isRemote === 'string') {
        body.isRemote = ['true', '1', 'yes'].includes(body.isRemote.toLowerCase());
    }
    for (const key of [
        'pageId',
        'filterId',
        'salaryAmount',
    ]) {
        if (typeof body[key] === 'string' && body[key].trim() !== '') {
            const n = Number(body[key]);
            if (!Number.isNaN(n))
                body[key] = n;
        }
    }
    return body;
}
exports.createJobSchema = Joi.object({
    title: Joi.string().required(),
    filterIds: Joi.array()
        .items(Joi.number().integer().positive())
        .min(1)
        .max(10)
        .unique()
        .optional(),
    filterId: Joi.number().integer().positive().optional(),
    description: Joi.string().allow('', null).optional(),
    isRemote: Joi.boolean().default(false),
    pageId: Joi.number().optional().allow(null),
    companyId: Joi.number().optional().allow(null),
    postingMode: Joi.string().optional().allow(null),
    branchId: Joi.number().optional().allow(null),
    status: Joi.string().optional().allow(null),
    requirements: Joi.string().optional(),
    benefits: Joi.array().items(Joi.string()).optional(),
    shifts: shiftsSchema.optional(),
    jobTypes: jobTypesSchema.optional(),
    salaryType: salaryType.required(),
    salaryAmount: Joi.number().required(),
    currency: Joi.string().optional(),
    location: locationSchema.when('isRemote', {
        is: true,
        then: Joi.optional().allow(null),
        otherwise: Joi.required(),
    }),
    pictures: Joi.array().items(Joi.string().min(1)).max(4).optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    industry: Joi.string().optional(),
    educationLevel: Joi.string().optional(),
    experienceRequired: Joi.string().optional(),
    languageRequirements: Joi.array().items(Joi.string()).optional(),
})
    .or('filterIds', 'filterId')
    .messages({
    'object.missing': 'Provide filterIds or filterId',
});
exports.updateJobSchema = Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().allow('', null).optional(),
    isRemote: Joi.boolean().optional(),
    pageId: Joi.number().optional().allow(null),
    filterIds: Joi.array()
        .items(Joi.number().integer().positive())
        .min(1)
        .max(10)
        .unique()
        .optional(),
    filterId: Joi.number().integer().positive().optional(),
    requirements: Joi.string().optional(),
    benefits: Joi.array().items(Joi.string()).optional(),
    shifts: shiftsSchema.optional(),
    jobTypes: jobTypesSchema.optional(),
    salaryType: salaryType.optional(),
    salaryAmount: Joi.number().optional(),
    currency: Joi.string().optional(),
    location: locationSchema.optional().allow(null),
    pictures: Joi.array().items(Joi.string().min(1)).max(4).optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    industry: Joi.string().optional(),
    educationLevel: Joi.string().optional(),
    experienceRequired: Joi.string().optional(),
    languageRequirements: Joi.array().items(Joi.string()).optional(),
});
//# sourceMappingURL=job.validation.js.map