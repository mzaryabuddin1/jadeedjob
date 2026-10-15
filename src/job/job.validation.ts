import * as Joi from 'joi';

const locationSchema = Joi.object({
  lat: Joi.number().required(),
  lng: Joi.number().required(),
});

const salaryType = Joi.string().valid(
  'piece-rate',
  'daily-wage',
  'hourly',
  'monthly',
  'fixed',
  'commission',
  'negotiable',
);

const shiftsSchema = Joi.array().items(
  Joi.string().valid('morning', 'evening', 'night', 'rotational'),
);

const jobTypesSchema = Joi.array().items(
  Joi.string().valid(
    'full-time',
    'part-time',
    'contract',
    'temporary',
    'freelance',
    'internship',
  ),
);

/** Multipart fields arrive as strings — coerce JSON / csv / booleans */
export function parseJobBody(raw: any): any {
  if (!raw || typeof raw !== 'object') return {};

  const body = { ...raw };

  const parseJsonField = (key: string) => {
    if (typeof body[key] !== 'string') return;
    const trimmed = body[key].trim();
    if (!trimmed) {
      body[key] = undefined;
      return;
    }
    try {
      body[key] = JSON.parse(trimmed);
    } catch {
      // leave as string; Joi will fail clearly if wrong type
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

  // filterIds as "1,2,3"
  if (typeof body.filterIds === 'string') {
    body.filterIds = body.filterIds
      .split(',')
      .map((s: string) => Number(s.trim()))
      .filter((n: number) => !Number.isNaN(n));
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
      if (!Number.isNaN(n)) body[key] = n;
    }
  }

  return body;
}

export const createJobSchema = Joi.object({
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
  /** App alias for pageId */
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

export const updateJobSchema = Joi.object({
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
