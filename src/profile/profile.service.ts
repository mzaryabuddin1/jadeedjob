import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { WorkExperience } from 'src/users/entities/work-experience.entity';
import { Education } from 'src/users/entities/education.entity';
import { Certification } from 'src/users/entities/certification.entity';
import {
  LANGUAGE_LEVELS,
  UserLanguage,
} from 'src/users/entities/user-language.entity';
import { Page } from 'src/pages/entities/page.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { FollowService, fullName } from 'src/follow/follow.service';
import { Post, countContent } from 'src/posts/entities/post.entity';

/** Fields a user may set through PATCH /users/me/profile */
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
] as const;

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
] as const;

const EDUCATION_FIELDS = [
  'institution_name',
  'highest_qualification',
  'field_of_study',
  'start_year',
  'graduation_year',
  'gpa_or_grade',
  'description',
  'degree_document',
] as const;

const CERTIFICATION_FIELDS = [
  'certification_name',
  'issuing_institution',
  'certification_date',
  'expiry_date',
  'credential_id',
  'credential_url',
  'certificate_file',
] as const;

/** a person can list this many languages */
const MAX_LANGUAGES = 20;

const pick = (data: any, fields: readonly string[]) => {
  const out: Record<string, any> = {};
  for (const f of fields) if (data[f] !== undefined) out[f] = data[f];
  return out;
};

const cleanList = (list?: string[]) =>
  list
    ? [...new Set(list.map((s) => String(s).trim()).filter(Boolean))].slice(
        0,
        50,
      )
    : list;

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(WorkExperience)
    private readonly expRepo: Repository<WorkExperience>,
    @InjectRepository(Education)
    private readonly eduRepo: Repository<Education>,
    @InjectRepository(Certification)
    private readonly certRepo: Repository<Certification>,
    @InjectRepository(UserLanguage)
    private readonly langRepo: Repository<UserLanguage>,
    @InjectRepository(Page) private readonly pageRepo: Repository<Page>,
    @InjectRepository(PageMember)
    private readonly memberRepo: Repository<PageMember>,
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    private readonly followService: FollowService,
  ) {}

  // ────────────────────────────────────────────────
  // VIEW (public profile + my own profile)
  // ────────────────────────────────────────────────

  /**
   * LinkedIn-style profile. Everybody sees the public part; the owner also
   * gets a `private` block (contact + documents). Bank details, KYC, password
   * and tokens are never part of any profile view.
   */
  async getProfile(targetId: number, viewerId: number) {
    const user = await this.userRepo.findOne({ where: { id: targetId } });
    if (!user || user.isBanned) throw new NotFoundException('User not found');

    const isMe = targetId === viewerId;

    const experiences = [...(user.work_experience || [])].sort(
      (a, b) =>
        Number(b.currently_working) - Number(a.currently_working) ||
        new Date(b.from_date ?? 0).getTime() -
          new Date(a.from_date ?? 0).getTime(),
    );
    const expPages = await this.pageCards(
      experiences.map((e) => (e as any).pageId).filter(Boolean),
    );
    const educations = [...(user.education || [])].sort(
      (a, b) =>
        Number(b.graduation_year || 9999) - Number(a.graduation_year || 9999),
    );
    const certifications = [...(user.certifications || [])].sort(
      (a, b) =>
        new Date(b.certification_date ?? 0).getTime() -
        new Date(a.certification_date ?? 0).getTime(),
    );

    const view: Record<string, any> = {
      id: user.id,
      name: fullName(user),
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
      experience: experiences.map((e) =>
        this.experienceView(e, expPages, isMe),
      ),
      education: educations.map((e) => this.educationView(e, isMe)),
      certifications: certifications.map((c) =>
        this.certificationView(c, isMe),
      ),
      languages: await this.languageViews(user.id),
      rating: { average: user.ratingAverage, count: user.ratingCount },
      stats: {
        followers: user.followersCount,
        following: user.followingCount,
        ...(await countContent(this.postRepo, { userId: user.id }, isMe)),
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

  private experienceView(
    e: WorkExperience,
    pages: Map<number, any>,
    isMe: boolean,
  ) {
    const pageId = (e as any).pageId as number | null;
    return {
      id: e.id,
      company_name: e.company_name,
      designation: e.designation,
      department: e.department,
      employment_type: e.employment_type,
      location: (e as any).location ?? null,
      from_date: e.from_date,
      to_date: e.to_date,
      currently_working: e.currently_working,
      key_responsibilities: e.key_responsibilities,
      page: pageId ? (pages.get(pageId) ?? null) : null,
      ...(isMe ? { experience_certificate: e.experience_certificate } : {}),
    };
  }

  private educationView(e: Education, isMe: boolean) {
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

  private certificationView(c: Certification, isMe: boolean) {
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

  private languageView(l: UserLanguage) {
    return {
      id: l.id,
      language_name: l.language_name,
      proficiency: l.proficiency,
    };
  }

  /** best spoken first (native, fluent...), then A-Z */
  private async languageViews(userId: number) {
    const rows = await this.langRepo.find({ where: { userId } });
    const rank = (l: UserLanguage) => LANGUAGE_LEVELS.indexOf(l.proficiency);
    return rows
      .sort(
        (a, b) =>
          rank(b) - rank(a) || a.language_name.localeCompare(b.language_name),
      )
      .map((l) => this.languageView(l));
  }

  private async pageCards(ids: number[]) {
    const unique = [...new Set(ids)];
    const pages = unique.length
      ? await this.pageRepo.find({
          where: { id: In(unique) },
          select: ['id', 'page_name', 'username', 'page_logo', 'is_verified'],
        })
      : [];
    return new Map(
      pages.map((p) => [
        p.id,
        {
          id: p.id,
          page_name: p.page_name,
          username: p.username,
          page_logo: p.page_logo,
          is_verified: !!p.is_verified,
        },
      ]),
    );
  }

  /** Pages the user owns / belongs to (public pages, so safe to show) */
  private async managedPages(userId: number) {
    const members = await this.memberRepo.find({ where: { userId } });
    const pages = await this.pageCards(members.map((m) => m.pageId));
    return members
      .map((m) => ({ ...pages.get(m.pageId), role: m.role }))
      .filter((p) => p.id);
  }

  // ────────────────────────────────────────────────
  // EDIT PROFILE
  // ────────────────────────────────────────────────

  async updateProfile(userId: number, data: any) {
    const patch: Record<string, any> = pick(data, PROFILE_FIELDS);
    if (data.about !== undefined) patch.professional_summary = data.about;
    for (const k of ['skills', 'technical_skills', 'soft_skills']) {
      if (patch[k] !== undefined) patch[k] = cleanList(patch[k]);
    }
    if (!Object.keys(patch).length) {
      throw new BadRequestException('Nothing to update');
    }

    await this.userRepo.update(userId, patch);
    return this.getProfile(userId, userId);
  }

  // ────────────────────────────────────────────────
  // EXPERIENCE
  // ────────────────────────────────────────────────

  async addExperience(userId: number, data: any) {
    const values = await this.normalizeExperience(data);
    const saved = await this.expRepo.save(
      this.expRepo.create({ ...values, user: { id: userId } as User }),
    );
    return this.oneExperience(saved.id, userId);
  }

  async updateExperience(userId: number, id: number, data: any) {
    const existing = await this.ownExperience(id, userId);
    const values = await this.normalizeExperience(data, existing);
    await this.expRepo.update(id, values);
    return this.oneExperience(id, userId);
  }

  async removeExperience(userId: number, id: number) {
    await this.ownExperience(id, userId);
    await this.expRepo.delete(id);
    return { message: 'Experience removed' };
  }

  private async ownExperience(id: number, userId: number) {
    const row = await this.expRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!row) throw new NotFoundException('Experience not found');
    return row;
  }

  private async oneExperience(id: number, userId: number) {
    const row = await this.ownExperience(id, userId);
    const pages = await this.pageCards([(row as any).pageId].filter(Boolean));
    return this.experienceView(row, pages, true);
  }

  /** Merge with the existing row (PATCH) and enforce the cross-field rules */
  private async normalizeExperience(data: any, existing?: WorkExperience) {
    const v: Record<string, any> = {
      ...(existing ? pick(existing, EXPERIENCE_FIELDS) : {}),
      ...pick(data, EXPERIENCE_FIELDS),
    };

    if (v.pageId) {
      const page = await this.pageRepo.findOne({
        where: { id: v.pageId },
        select: ['id', 'page_name'],
      });
      if (!page) throw new BadRequestException('Page not found');
      // linking a page fills the company name unless the user wrote one
      if (
        data.company_name === undefined &&
        (!existing || data.pageId !== undefined)
      ) {
        v.company_name = page.page_name;
      }
    } else {
      v.pageId = null;
    }

    if (!v.company_name) {
      throw new BadRequestException('company_name (or a pageId) is required');
    }
    if (!v.designation)
      throw new BadRequestException('designation is required');
    if (!v.from_date) throw new BadRequestException('from_date is required');

    if (v.currently_working) {
      v.to_date = null;
    } else if (!v.to_date) {
      throw new BadRequestException(
        'to_date is required unless you currently work here',
      );
    } else if (new Date(v.to_date) < new Date(v.from_date)) {
      throw new BadRequestException('to_date cannot be before from_date');
    }
    v.currently_working = !!v.currently_working;
    return v;
  }

  // ────────────────────────────────────────────────
  // EDUCATION
  // ────────────────────────────────────────────────

  async addEducation(userId: number, data: any) {
    const values = this.normalizeEducation(data);
    const saved = await this.eduRepo.save(
      this.eduRepo.create({ ...values, user: { id: userId } as User }),
    );
    return this.educationView(saved, true);
  }

  async updateEducation(userId: number, id: number, data: any) {
    const existing = await this.ownEducation(id, userId);
    await this.eduRepo.update(id, this.normalizeEducation(data, existing));
    return this.educationView(await this.ownEducation(id, userId), true);
  }

  async removeEducation(userId: number, id: number) {
    await this.ownEducation(id, userId);
    await this.eduRepo.delete(id);
    return { message: 'Education removed' };
  }

  private async ownEducation(id: number, userId: number) {
    const row = await this.eduRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!row) throw new NotFoundException('Education not found');
    return row;
  }

  private normalizeEducation(data: any, existing?: Education) {
    const v: Record<string, any> = {
      ...(existing ? pick(existing, EDUCATION_FIELDS) : {}),
      ...pick(data, EDUCATION_FIELDS),
    };
    if (!v.institution_name) {
      throw new BadRequestException('institution_name is required');
    }
    if (
      v.start_year &&
      /^\d{4}$/.test(v.graduation_year ?? '') &&
      Number(v.start_year) > Number(v.graduation_year)
    ) {
      throw new BadRequestException(
        'start_year cannot be after graduation_year',
      );
    }
    return v;
  }

  // ────────────────────────────────────────────────
  // CERTIFICATIONS
  // ────────────────────────────────────────────────

  async addCertification(userId: number, data: any) {
    const values = this.normalizeCertification(data);
    const saved = await this.certRepo.save(
      this.certRepo.create({ ...values, user: { id: userId } as User }),
    );
    return this.certificationView(saved, true);
  }

  async updateCertification(userId: number, id: number, data: any) {
    const existing = await this.ownCertification(id, userId);
    await this.certRepo.update(id, this.normalizeCertification(data, existing));
    return this.certificationView(
      await this.ownCertification(id, userId),
      true,
    );
  }

  async removeCertification(userId: number, id: number) {
    await this.ownCertification(id, userId);
    await this.certRepo.delete(id);
    return { message: 'Certification removed' };
  }

  private async ownCertification(id: number, userId: number) {
    const row = await this.certRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!row) throw new NotFoundException('Certification not found');
    return row;
  }

  private normalizeCertification(data: any, existing?: Certification) {
    const v: Record<string, any> = {
      ...(existing ? pick(existing, CERTIFICATION_FIELDS) : {}),
      ...pick(data, CERTIFICATION_FIELDS),
    };
    if (!v.certification_name) {
      throw new BadRequestException('certification_name is required');
    }
    if (
      v.certification_date &&
      v.expiry_date &&
      new Date(v.expiry_date) < new Date(v.certification_date)
    ) {
      throw new BadRequestException(
        'expiry_date cannot be before certification_date',
      );
    }
    return v;
  }

  // ────────────────────────────────────────────────
  // LANGUAGES
  // ────────────────────────────────────────────────

  async addLanguage(userId: number, data: any) {
    const name = this.cleanLanguageName(data.language_name);
    const key = name.toLowerCase();

    if ((await this.langRepo.count({ where: { userId } })) >= MAX_LANGUAGES) {
      throw new BadRequestException(
        `You can list at most ${MAX_LANGUAGES} languages`,
      );
    }
    if (await this.langRepo.exist({ where: { userId, languageKey: key } })) {
      throw new ConflictException('You already added this language');
    }
    const saved = await this.langRepo.save(
      this.langRepo.create({
        userId,
        language_name: name,
        languageKey: key,
        proficiency: data.proficiency,
      }),
    );
    return this.languageView(saved);
  }

  async updateLanguage(userId: number, id: number, data: any) {
    const row = await this.ownLanguage(id, userId);
    const patch: Partial<UserLanguage> = {};
    if (data.language_name !== undefined) {
      const name = this.cleanLanguageName(data.language_name);
      const key = name.toLowerCase();
      if (key !== row.languageKey) {
        if (await this.langRepo.exist({ where: { userId, languageKey: key } })) {
          throw new ConflictException('You already added this language');
        }
      }
      patch.language_name = name;
      patch.languageKey = key;
    }
    if (data.proficiency !== undefined) patch.proficiency = data.proficiency;
    await this.langRepo.update(id, patch);
    return this.languageView(await this.ownLanguage(id, userId));
  }

  async removeLanguage(userId: number, id: number) {
    await this.ownLanguage(id, userId);
    await this.langRepo.delete(id);
    return { message: 'Language removed' };
  }

  listMyLanguages(userId: number) {
    return this.languageViews(userId);
  }

  private async ownLanguage(id: number, userId: number) {
    const row = await this.langRepo.findOne({ where: { id, userId } });
    if (!row) throw new NotFoundException('Language not found');
    return row;
  }

  /** "  urdu " -> "Urdu": trimmed, single spaces, first letter capital */
  private cleanLanguageName(raw: unknown) {
    const name = String(raw ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!name) throw new BadRequestException('language_name is required');
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
}
