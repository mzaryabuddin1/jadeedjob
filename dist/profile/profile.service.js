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
exports.ProfileService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const work_experience_entity_1 = require("../users/entities/work-experience.entity");
const education_entity_1 = require("../users/entities/education.entity");
const certification_entity_1 = require("../users/entities/certification.entity");
const user_language_entity_1 = require("../users/entities/user-language.entity");
const page_entity_1 = require("../pages/entities/page.entity");
const page_member_entity_1 = require("../pages/entities/page-member.entity");
const follow_service_1 = require("../follow/follow.service");
const post_entity_1 = require("../posts/entities/post.entity");
const PROFILE_FIELDS = [
    'headline',
    'profile_photo',
    'cover_photo',
    'full_name',
    'city',
    'state',
    'contact_country',
    'skills',
    'technical_skills',
    'soft_skills',
    'linkedin_url',
    'github_url',
    'portfolio_url',
    'behance_url',
    'facebook_url',
    'instagram_url',
    'twitter_url',
    'youtube_url',
    'open_to_work',
];
const EXPERIENCE_FIELDS = [
    'company_name',
    'pageId',
    'designation',
    'department',
    'employment_type',
    'location',
    'from_date',
    'to_date',
    'currently_working',
    'key_responsibilities',
    'experience_certificate',
];
const EDUCATION_FIELDS = [
    'institution_name',
    'highest_qualification',
    'field_of_study',
    'start_year',
    'graduation_year',
    'gpa_or_grade',
    'description',
    'degree_document',
];
const CERTIFICATION_FIELDS = [
    'certification_name',
    'issuing_institution',
    'certification_date',
    'expiry_date',
    'credential_id',
    'credential_url',
    'certificate_file',
];
const MAX_LANGUAGES = 20;
const pick = (data, fields) => {
    const out = {};
    for (const f of fields)
        if (data[f] !== undefined)
            out[f] = data[f];
    return out;
};
const cleanList = (list) => list
    ? [...new Set(list.map((s) => String(s).trim()).filter(Boolean))].slice(0, 50)
    : list;
let ProfileService = class ProfileService {
    constructor(userRepo, expRepo, eduRepo, certRepo, langRepo, pageRepo, memberRepo, postRepo, followService) {
        this.userRepo = userRepo;
        this.expRepo = expRepo;
        this.eduRepo = eduRepo;
        this.certRepo = certRepo;
        this.langRepo = langRepo;
        this.pageRepo = pageRepo;
        this.memberRepo = memberRepo;
        this.postRepo = postRepo;
        this.followService = followService;
    }
    async getProfile(targetId, viewerId) {
        const user = await this.userRepo.findOne({ where: { id: targetId } });
        if (!user || user.isBanned)
            throw new common_1.NotFoundException('User not found');
        const isMe = targetId === viewerId;
        const experiences = [...(user.work_experience || [])].sort((a, b) => Number(b.currently_working) - Number(a.currently_working) ||
            new Date(b.from_date ?? 0).getTime() -
                new Date(a.from_date ?? 0).getTime());
        const expPages = await this.pageCards(experiences.map((e) => e.pageId).filter(Boolean));
        const educations = [...(user.education || [])].sort((a, b) => Number(b.graduation_year || 9999) - Number(a.graduation_year || 9999));
        const certifications = [...(user.certifications || [])].sort((a, b) => new Date(b.certification_date ?? 0).getTime() -
            new Date(a.certification_date ?? 0).getTime());
        const view = {
            id: user.id,
            name: (0, follow_service_1.fullName)(user),
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            profile_photo: user.profile_photo,
            cover_photo: user.cover_photo,
            headline: user.headline,
            about: user.professional_summary,
            open_to_work: user.open_to_work,
            location: {
                city: user.cityEntity?.name ?? user.city ?? null,
                state: user.state ?? null,
                country: user.country?.name ?? user.contact_country ?? null,
            },
            links: {
                linkedin: user.linkedin_url,
                github: user.github_url,
                portfolio: user.portfolio_url,
                behance: user.behance_url,
                facebook: user.facebook_url,
                instagram: user.instagram_url,
                twitter: user.twitter_url,
                youtube: user.youtube_url,
            },
            skills: user.skills ?? [],
            technical_skills: user.technical_skills ?? [],
            soft_skills: user.soft_skills ?? [],
            experience: experiences.map((e) => this.experienceView(e, expPages, isMe)),
            education: educations.map((e) => this.educationView(e, isMe)),
            certifications: certifications.map((c) => this.certificationView(c, isMe)),
            languages: await this.languageViews(user.id),
            rating: { average: user.ratingAverage, count: user.ratingCount },
            stats: {
                followers: user.followersCount,
                following: user.followingCount,
                ...(await (0, post_entity_1.countContent)(this.postRepo, { userId: user.id }, isMe)),
            },
            pages: await this.managedPages(user.id),
            viewer: {
                isMe,
                isFollowing: isMe
                    ? false
                    : await this.followService.isFollowing(viewerId, 'user', user.id),
            },
            joinedAt: user.createdAt,
        };
        if (isMe) {
            view.private = {
                email: user.email,
                phone: user.phone,
                alternate_phone: user.alternate_phone,
                gender: user.gender,
                date_of_birth: user.date_of_birth,
                nationality: user.nationality,
                address_line1: user.address_line1,
                address_line2: user.address_line2,
                postal_code: user.postal_code,
            };
        }
        return view;
    }
    experienceView(e, pages, isMe) {
        const pageId = e.pageId;
        return {
            id: e.id,
            company_name: e.company_name,
            designation: e.designation,
            department: e.department,
            employment_type: e.employment_type,
            location: e.location ?? null,
            from_date: e.from_date,
            to_date: e.to_date,
            currently_working: e.currently_working,
            key_responsibilities: e.key_responsibilities,
            page: pageId ? (pages.get(pageId) ?? null) : null,
            ...(isMe ? { experience_certificate: e.experience_certificate } : {}),
        };
    }
    educationView(e, isMe) {
        return {
            id: e.id,
            institution_name: e.institution_name,
            highest_qualification: e.highest_qualification,
            field_of_study: e.field_of_study,
            start_year: e.start_year,
            graduation_year: e.graduation_year,
            gpa_or_grade: e.gpa_or_grade,
            description: e.description,
            ...(isMe ? { degree_document: e.degree_document } : {}),
        };
    }
    certificationView(c, isMe) {
        return {
            id: c.id,
            certification_name: c.certification_name,
            issuing_institution: c.issuing_institution,
            certification_date: c.certification_date,
            expiry_date: c.expiry_date,
            credential_id: c.credential_id,
            credential_url: c.credential_url,
            ...(isMe ? { certificate_file: c.certificate_file } : {}),
        };
    }
    languageView(l) {
        return {
            id: l.id,
            language_name: l.language_name,
            proficiency: l.proficiency,
        };
    }
    async languageViews(userId) {
        const rows = await this.langRepo.find({ where: { userId } });
        const rank = (l) => user_language_entity_1.LANGUAGE_LEVELS.indexOf(l.proficiency);
        return rows
            .sort((a, b) => rank(b) - rank(a) || a.language_name.localeCompare(b.language_name))
            .map((l) => this.languageView(l));
    }
    async pageCards(ids) {
        const unique = [...new Set(ids)];
        const pages = unique.length
            ? await this.pageRepo.find({
                where: { id: (0, typeorm_2.In)(unique) },
                select: ['id', 'page_name', 'username', 'page_logo', 'is_verified'],
            })
            : [];
        return new Map(pages.map((p) => [
            p.id,
            {
                id: p.id,
                page_name: p.page_name,
                username: p.username,
                page_logo: p.page_logo,
                is_verified: !!p.is_verified,
            },
        ]));
    }
    async managedPages(userId) {
        const members = await this.memberRepo.find({ where: { userId } });
        const pages = await this.pageCards(members.map((m) => m.pageId));
        return members
            .map((m) => ({ ...pages.get(m.pageId), role: m.role }))
            .filter((p) => p.id);
    }
    async updateProfile(userId, data) {
        const patch = pick(data, PROFILE_FIELDS);
        if (data.about !== undefined)
            patch.professional_summary = data.about;
        for (const k of ['skills', 'technical_skills', 'soft_skills']) {
            if (patch[k] !== undefined)
                patch[k] = cleanList(patch[k]);
        }
        if (!Object.keys(patch).length) {
            throw new common_1.BadRequestException('Nothing to update');
        }
        await this.userRepo.update(userId, patch);
        return this.getProfile(userId, userId);
    }
    async addExperience(userId, data) {
        const values = await this.normalizeExperience(data);
        const saved = await this.expRepo.save(this.expRepo.create({ ...values, user: { id: userId } }));
        return this.oneExperience(saved.id, userId);
    }
    async updateExperience(userId, id, data) {
        const existing = await this.ownExperience(id, userId);
        const values = await this.normalizeExperience(data, existing);
        await this.expRepo.update(id, values);
        return this.oneExperience(id, userId);
    }
    async removeExperience(userId, id) {
        await this.ownExperience(id, userId);
        await this.expRepo.delete(id);
        return { message: 'Experience removed' };
    }
    async ownExperience(id, userId) {
        const row = await this.expRepo.findOne({
            where: { id, user: { id: userId } },
        });
        if (!row)
            throw new common_1.NotFoundException('Experience not found');
        return row;
    }
    async oneExperience(id, userId) {
        const row = await this.ownExperience(id, userId);
        const pages = await this.pageCards([row.pageId].filter(Boolean));
        return this.experienceView(row, pages, true);
    }
    async normalizeExperience(data, existing) {
        const v = {
            ...(existing ? pick(existing, EXPERIENCE_FIELDS) : {}),
            ...pick(data, EXPERIENCE_FIELDS),
        };
        if (v.pageId) {
            const page = await this.pageRepo.findOne({
                where: { id: v.pageId },
                select: ['id', 'page_name'],
            });
            if (!page)
                throw new common_1.BadRequestException('Page not found');
            if (data.company_name === undefined &&
                (!existing || data.pageId !== undefined)) {
                v.company_name = page.page_name;
            }
        }
        else {
            v.pageId = null;
        }
        if (!v.company_name) {
            throw new common_1.BadRequestException('company_name (or a pageId) is required');
        }
        if (!v.designation)
            throw new common_1.BadRequestException('designation is required');
        if (!v.from_date)
            throw new common_1.BadRequestException('from_date is required');
        if (v.currently_working) {
            v.to_date = null;
        }
        else if (!v.to_date) {
            throw new common_1.BadRequestException('to_date is required unless you currently work here');
        }
        else if (new Date(v.to_date) < new Date(v.from_date)) {
            throw new common_1.BadRequestException('to_date cannot be before from_date');
        }
        v.currently_working = !!v.currently_working;
        return v;
    }
    async addEducation(userId, data) {
        const values = this.normalizeEducation(data);
        const saved = await this.eduRepo.save(this.eduRepo.create({ ...values, user: { id: userId } }));
        return this.educationView(saved, true);
    }
    async updateEducation(userId, id, data) {
        const existing = await this.ownEducation(id, userId);
        await this.eduRepo.update(id, this.normalizeEducation(data, existing));
        return this.educationView(await this.ownEducation(id, userId), true);
    }
    async removeEducation(userId, id) {
        await this.ownEducation(id, userId);
        await this.eduRepo.delete(id);
        return { message: 'Education removed' };
    }
    async ownEducation(id, userId) {
        const row = await this.eduRepo.findOne({
            where: { id, user: { id: userId } },
        });
        if (!row)
            throw new common_1.NotFoundException('Education not found');
        return row;
    }
    normalizeEducation(data, existing) {
        const v = {
            ...(existing ? pick(existing, EDUCATION_FIELDS) : {}),
            ...pick(data, EDUCATION_FIELDS),
        };
        if (!v.institution_name) {
            throw new common_1.BadRequestException('institution_name is required');
        }
        if (v.start_year &&
            /^\d{4}$/.test(v.graduation_year ?? '') &&
            Number(v.start_year) > Number(v.graduation_year)) {
            throw new common_1.BadRequestException('start_year cannot be after graduation_year');
        }
        return v;
    }
    async addCertification(userId, data) {
        const values = this.normalizeCertification(data);
        const saved = await this.certRepo.save(this.certRepo.create({ ...values, user: { id: userId } }));
        return this.certificationView(saved, true);
    }
    async updateCertification(userId, id, data) {
        const existing = await this.ownCertification(id, userId);
        await this.certRepo.update(id, this.normalizeCertification(data, existing));
        return this.certificationView(await this.ownCertification(id, userId), true);
    }
    async removeCertification(userId, id) {
        await this.ownCertification(id, userId);
        await this.certRepo.delete(id);
        return { message: 'Certification removed' };
    }
    async ownCertification(id, userId) {
        const row = await this.certRepo.findOne({
            where: { id, user: { id: userId } },
        });
        if (!row)
            throw new common_1.NotFoundException('Certification not found');
        return row;
    }
    normalizeCertification(data, existing) {
        const v = {
            ...(existing ? pick(existing, CERTIFICATION_FIELDS) : {}),
            ...pick(data, CERTIFICATION_FIELDS),
        };
        if (!v.certification_name) {
            throw new common_1.BadRequestException('certification_name is required');
        }
        if (v.certification_date &&
            v.expiry_date &&
            new Date(v.expiry_date) < new Date(v.certification_date)) {
            throw new common_1.BadRequestException('expiry_date cannot be before certification_date');
        }
        return v;
    }
    async addLanguage(userId, data) {
        const name = this.cleanLanguageName(data.language_name);
        const key = name.toLowerCase();
        if ((await this.langRepo.count({ where: { userId } })) >= MAX_LANGUAGES) {
            throw new common_1.BadRequestException(`You can list at most ${MAX_LANGUAGES} languages`);
        }
        if (await this.langRepo.exist({ where: { userId, languageKey: key } })) {
            throw new common_1.ConflictException('You already added this language');
        }
        const saved = await this.langRepo.save(this.langRepo.create({
            userId,
            language_name: name,
            languageKey: key,
            proficiency: data.proficiency,
        }));
        return this.languageView(saved);
    }
    async updateLanguage(userId, id, data) {
        const row = await this.ownLanguage(id, userId);
        const patch = {};
        if (data.language_name !== undefined) {
            const name = this.cleanLanguageName(data.language_name);
            const key = name.toLowerCase();
            if (key !== row.languageKey) {
                if (await this.langRepo.exist({ where: { userId, languageKey: key } })) {
                    throw new common_1.ConflictException('You already added this language');
                }
            }
            patch.language_name = name;
            patch.languageKey = key;
        }
        if (data.proficiency !== undefined)
            patch.proficiency = data.proficiency;
        await this.langRepo.update(id, patch);
        return this.languageView(await this.ownLanguage(id, userId));
    }
    async removeLanguage(userId, id) {
        await this.ownLanguage(id, userId);
        await this.langRepo.delete(id);
        return { message: 'Language removed' };
    }
    listMyLanguages(userId) {
        return this.languageViews(userId);
    }
    async ownLanguage(id, userId) {
        const row = await this.langRepo.findOne({ where: { id, userId } });
        if (!row)
            throw new common_1.NotFoundException('Language not found');
        return row;
    }
    cleanLanguageName(raw) {
        const name = String(raw ?? '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!name)
            throw new common_1.BadRequestException('language_name is required');
        return name.charAt(0).toUpperCase() + name.slice(1);
    }
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(work_experience_entity_1.WorkExperience)),
    __param(2, (0, typeorm_1.InjectRepository)(education_entity_1.Education)),
    __param(3, (0, typeorm_1.InjectRepository)(certification_entity_1.Certification)),
    __param(4, (0, typeorm_1.InjectRepository)(user_language_entity_1.UserLanguage)),
    __param(5, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __param(6, (0, typeorm_1.InjectRepository)(page_member_entity_1.PageMember)),
    __param(7, (0, typeorm_1.InjectRepository)(post_entity_1.Post)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        follow_service_1.FollowService])
], ProfileService);
//# sourceMappingURL=profile.service.js.map