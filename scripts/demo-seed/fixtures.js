'use strict';

const crypto = require('crypto');

const SEED_NAMESPACE = 'jobsloot-demo-v2';
const DEMO_PASSWORD = 'Demo@1234!';
const DEMO_EMAIL_DOMAIN = 'demo.jobsloot.test';
const ICON_COLOR = '#2F6F73';
const PRIMARY_DEMO_ACCOUNT = Object.freeze({
  key: 'ahmed',
  identifier: '0300001001',
  phone: '0300001001',
  password: DEMO_PASSWORD,
});

const countries = [
  { name: 'Pakistan', code: 'PK', dial_code: '+92' },
  { name: 'United Arab Emirates', code: 'AE', dial_code: '+971' },
  { name: 'Saudi Arabia', code: 'SA', dial_code: '+966' },
  { name: 'Qatar', code: 'QA', dial_code: '+974' },
  { name: 'Oman', code: 'OM', dial_code: '+968' },
];

const languages = [
  { code: 'en', name: 'English' },
  { code: 'ur', name: 'Urdu' },
  { code: 'ar', name: 'Arabic' },
  { code: 'pa', name: 'Punjabi' },
];

const filters = [
  ['Labor', 'Feather', 'tool'],
  ['Housekeeping', 'FontAwesome5', 'broom'],
  ['Delivery', 'FontAwesome5', 'motorcycle'],
  ['Kitchen', 'FontAwesome5', 'utensils'],
  ['Admin', 'Feather', 'file-text'],
  ['Electrician', 'Feather', 'zap'],
  ['Plumber', 'FontAwesome5', 'faucet'],
  ['Driver', 'FontAwesome5', 'car'],
  ['Security', 'Feather', 'shield'],
  ['Cleaner', 'FontAwesome5', 'spray-can'],
  ['Mechanic', 'Feather', 'settings'],
  ['Painter', 'FontAwesome5', 'paint-roller'],
].map(([name, iconLibrary, iconName]) => ({
  name,
  icon: iconName,
  iconSource: 'library',
  iconLibrary,
  iconName,
  iconColor: ICON_COLOR,
  iconSvg: null,
}));

filters.push({
  name: 'Custom Craft',
  icon: 'custom-craft',
  iconSource: 'svg',
  iconLibrary: null,
  iconName: null,
  iconColor: ICON_COLOR,
  iconSvg:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16"/><path d="M7 20V9l5-5 5 5v11"/><path d="M10 20v-6h4v6"/></svg>',
});

const userNames = [
  ['ahmed', 'Ahmed', 'Khan', 'worker'],
  ['sara', 'Sara', 'Malik', 'hybrid'],
  ['bilal', 'Bilal', 'Hussain', 'worker'],
  ['ayesha', 'Ayesha', 'Noor', 'hybrid'],
  ['imran', 'Imran', 'Ali', 'worker'],
  ['fatima', 'Fatima', 'Sheikh', 'hybrid'],
  ['omar', 'Omar', 'Farooq', 'worker'],
  ['nadia', 'Nadia', 'Iqbal', 'worker'],
  ['hamza', 'Hamza', 'Qureshi', 'worker'],
  ['zainab', 'Zainab', 'Raza', 'employer'],
  ['jadeed', 'Jadeed', 'Crew', 'employer'],
  ['areeba', 'Areeba', 'Noor', 'worker'],
  ['maria', 'Maria', 'Theodore', 'worker'],
  ['danish', 'Danish', 'Shah', 'worker'],
  ['hina', 'Hina', 'Tariq', 'worker'],
  ['usman', 'Usman', 'Rafiq', 'worker'],
  ['mehwish', 'Mehwish', 'Ali', 'worker'],
  ['kamran', 'Kamran', 'Yousaf', 'worker'],
  ['sobia', 'Sobia', 'Nadeem', 'worker'],
  ['arslan', 'Arslan', 'Iqbal', 'worker'],
  ['iqra', 'Iqra', 'Faisal', 'worker'],
  ['rizwan', 'Rizwan', 'Akram', 'worker'],
  ['sana', 'Sana', 'Javed', 'hybrid'],
  ['admin', 'Demo', 'Admin', 'admin'],
];

const legacyPhones = [
  ...Array.from(
    { length: 10 },
    (_, index) => `03000010${String(index + 1).padStart(2, '0')}`,
  ),
  ...Array.from({ length: 4 }, (_, index) => `030000190${index + 1}`),
];
const newPhones = Array.from(
  { length: 10 },
  (_, index) => `03009900${String(index + 1).padStart(2, '0')}`,
);

const cities = [
  ['Karachi', 'Sindh'],
  ['Lahore', 'Punjab'],
  ['Islamabad', 'ICT'],
  ['Rawalpindi', 'Punjab'],
  ['Faisalabad', 'Punjab'],
  ['Multan', 'Punjab'],
  ['Peshawar', 'KPK'],
  ['Quetta', 'Balochistan'],
];

function verificationState(index) {
  if (index < 10 || index === 23) return 'verified';
  if (index < 15) return 'incomplete';
  if (index < 20) return 'pending';
  return 'rejected';
}

function buildUsers() {
  const phones = [...legacyPhones, ...newPhones];
  let phoneIndex = 0;
  return userNames.map(([key, firstName, lastName, role], index) => {
    const [city, state] = cities[index % cities.length];
    const verification = verificationState(index);
    const filterNames =
      key === PRIMARY_DEMO_ACCOUNT.key
        ? ['Labor', 'Delivery', 'Driver', 'Custom Craft']
        : [
            filters[index % filters.length].name,
            filters[(index + 3) % filters.length].name,
            filters[(index + 7) % filters.length].name,
          ];
    let phone = PRIMARY_DEMO_ACCOUNT.phone;
    if (key !== PRIMARY_DEMO_ACCOUNT.key) {
      while (phones[phoneIndex] === PRIMARY_DEMO_ACCOUNT.phone) phoneIndex += 1;
      phone = phones[phoneIndex];
      phoneIndex += 1;
    }
    return {
      key,
      role,
      phone,
      email: `${key}@${DEMO_EMAIL_DOMAIN}`,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      referralCode: `JJDM${String(index + 1).padStart(6, '0')}`,
      systemRole: role === 'admin' ? 'admin' : 'user',
      verification,
      city,
      state,
      countryCode: index % 9 === 0 ? 'AE' : 'PK',
      languageCode: ['ur', 'en', 'ur', 'pa'][index % 4],
      latitude: 24.8607 + (index % 6) * 0.018,
      longitude: 67.0011 + (index % 5) * 0.021,
      skills: [filters[index % filters.length].name, 'Safety awareness'],
      technicalSkills: ['Mobile communication', 'Worksite reporting'],
      softSkills: ['Punctuality', 'Teamwork'],
      preferences: filterNames,
    };
  });
}

const companies = [
  {
    key: 'quickship',
    username: 'demo-quickship',
    name: 'QuickShip Logistics',
    industry: 'Logistics',
    owner: 'sara',
    status: 'approved',
    city: 'Lahore',
  },
  {
    key: 'citycare',
    username: 'demo-citycare',
    name: 'CityCare Facilities',
    industry: 'Facility Services',
    owner: 'ayesha',
    status: 'pending',
    city: 'Islamabad',
  },
  {
    key: 'skillforge',
    username: 'demo-skillforge',
    name: 'SkillForge Trades',
    industry: 'Skilled Trades',
    owner: 'zainab',
    status: 'needs_changes',
    city: 'Dubai',
  },
  {
    key: 'horizon',
    username: 'demo-horizon',
    name: 'Horizon Hospitality',
    industry: 'Hospitality',
    owner: 'jadeed',
    status: 'rejected',
    city: 'Karachi',
  },
  {
    key: 'metro',
    username: 'demo-metro',
    name: 'Metro Maintenance Co',
    industry: 'Maintenance',
    owner: 'sana',
    status: 'suspended',
    city: 'Rawalpindi',
  },
];

const jobTitles = [
  'Delivery Rider',
  'Warehouse Helper',
  'Office Cleaner',
  'Security Guard',
  'Kitchen Assistant',
  'Site Electrician',
  'Maintenance Plumber',
  'Company Driver',
  'Dispatch Assistant',
  'Auto Mechanic',
  'Housekeeping Attendant',
  'Painter Helper',
  'Packing Worker',
  'Reception Assistant',
  'Bike Courier',
  'Catering Helper',
  'Night Watchman',
  'Workshop Assistant',
  'Building Cleaner',
  'Data Entry Clerk',
  'Forklift Helper',
  'Restaurant Cleaner',
  'Solar Technician',
  'Water Pump Technician',
  'School Van Driver',
  'Event Setup Worker',
  'Store Assistant',
  'AC Service Helper',
  'Laundry Attendant',
  'Inventory Assistant',
  'Construction Laborer',
  'Office Tea Attendant',
  'Generator Mechanic',
  'Car Wash Worker',
  'Temporary Loader',
  'Part-Time Courier',
  'Weekend Cleaner',
  'Project Electrician',
  'Seasonal Kitchen Helper',
  'Contract Driver',
];

const employerKeys = ['sara', 'ayesha', 'zainab', 'jadeed', 'sana'];

function buildJobs() {
  return jobTitles.map((title, index) => {
    const primaryOwnedJob = index === 0;
    const company = primaryOwnedJob
      ? null
      : index % 3 === 0
        ? null
        : companies[index % companies.length];
    const creatorKey = primaryOwnedJob
      ? PRIMARY_DEMO_ACCOUNT.key
      : company
        ? company.owner
        : employerKeys[index % employerKeys.length];
    const status = index < 30 ? 'active' : index < 35 ? 'draft' : 'closed';
    const noLocation = primaryOwnedJob ? false : index % 7 === 0;
    const isRemote = primaryOwnedJob ? false : index % 9 === 0;
    return {
      key: `job${String(index + 1).padStart(2, '0')}`,
      title,
      creatorKey,
      companyKey: company?.key || null,
      filterName: filters[index % filters.length].name,
      status,
      isActive: status === 'active',
      postingMode: company ? 'company' : 'individual',
      description: `${title} role for the JobsLoot deterministic demo environment.`,
      requirements:
        'Reliable attendance and valid identification are required.',
      benefits: [
        'Weekly rest',
        index % 2 ? 'Transport support' : 'Meal support',
      ],
      shift: ['morning', 'evening', 'night', 'rotational'][index % 4],
      jobType: ['full-time', 'part-time', 'contract', 'temporary'][index % 4],
      salaryType: ['monthly', 'daily-wage', 'hourly', 'negotiable'][index % 4],
      salaryAmount: index % 4 === 0 ? 48000 + index * 250 : 1500 + index * 75,
      vacancies: 4 + (index % 3),
      currency: 'PKR',
      isRemote,
      location:
        noLocation || isRemote
          ? null
          : {
              lat: 24.8607 + (index % 10) * 0.012,
              lng: 67.0011 + (index % 8) * 0.014,
            },
    };
  });
}

const applicationStatusCounts = {
  pending: 18,
  accepted: 12,
  rejected: 10,
  withdrawn: 8,
  completed: 12,
};

function buildApplications(users, jobs) {
  const statuses = Object.entries(applicationStatusCounts).flatMap(
    ([status, count]) => Array(count).fill(status),
  );
  const primaryApplications = {
    pending: 'job02',
    accepted: 'job03',
    rejected: 'job04',
    withdrawn: 'job05',
    completed: 'job06',
  };
  const reservedPrimaryPairs = new Set(
    Object.values(primaryApplications).map(
      (jobKey) => `${jobKey}:${PRIMARY_DEMO_ACCOUNT.key}`,
    ),
  );
  const usedPrimaryStatuses = new Set();
  const completableJobs = jobs.filter(
    (job) =>
      job.status === 'active' &&
      (!job.companyKey || job.companyKey === 'quickship'),
  );
  const seen = new Set();
  return statuses.map((status, index) => {
    const primaryJobKey = primaryApplications[status];
    const shouldUsePrimary =
      primaryJobKey && !usedPrimaryStatuses.has(status);
    const job = shouldUsePrimary
      ? jobs.find((item) => item.key === primaryJobKey)
      : status === 'completed'
        ? completableJobs[index % completableJobs.length]
        : jobs[index % 20];
    let applicantKey = PRIMARY_DEMO_ACCOUNT.key;
    if (shouldUsePrimary) {
      if (
        !job ||
        job.creatorKey === PRIMARY_DEMO_ACCOUNT.key ||
        seen.has(`${job.key}:${PRIMARY_DEMO_ACCOUNT.key}`)
      ) {
        throw new Error(
          `Invalid primary demo application job: ${primaryJobKey}`,
        );
      }
      usedPrimaryStatuses.add(status);
    } else {
      let userIndex = (index * 7 + 3) % users.length;
      while (
        users[userIndex].key === job.creatorKey ||
        reservedPrimaryPairs.has(`${job.key}:${users[userIndex].key}`) ||
        seen.has(`${job.key}:${users[userIndex].key}`)
      ) {
        userIndex = (userIndex + 1) % users.length;
      }
      applicantKey = users[userIndex].key;
    }
    seen.add(`${job.key}:${applicantKey}`);
    return {
      key: `application${String(index + 1).padStart(2, '0')}`,
      jobKey: job.key,
      applicantKey,
      status,
      bidAmount:
        job.salaryType === 'negotiable' ? job.salaryAmount + 250 : null,
    };
  });
}

const posts = Array.from({ length: 20 }, (_, index) => {
  const mediaMode =
    index < 8
      ? 'image'
      : index < 12
        ? 'video'
        : index < 16
          ? 'none'
          : index < 18
            ? 'pending'
            : 'failed';
  const companyPost = index % 4 === 1;
  return {
    key: `post${String(index + 1).padStart(2, '0')}`,
    creatorKey: companyPost ? 'sara' : userNames[index % 12][0],
    companyKey: companyPost ? 'quickship' : null,
    body: `Community demo update ${index + 1}: practical work tips and local opportunities.`,
    mediaMode,
    linkedJobKey:
      index % 3 === 0
        ? companyPost
          ? 'job06'
          : `job${String((index % 20) + 1).padStart(2, '0')}`
        : null,
    allowComments: index % 6 !== 0,
  };
});

const reels = Array.from({ length: 8 }, (_, index) => ({
  key: `reel${String(index + 1).padStart(2, '0')}`,
  creatorKey: index % 3 === 1 ? 'sara' : userNames[index % 10][0],
  companyKey: index % 3 === 1 ? 'quickship' : null,
  caption: `JobsLoot demo reel ${index + 1}: a quick look at work in action.`,
  category: ['jobs', 'community', 'social'][index % 3],
  audioTitle: index < 4 ? 'JobsLoot Workday' : `Demo Audio ${index - 3}`,
  linkedJobKey:
    index < 5
      ? index % 3 === 1
        ? 'job06'
        : `job${String(index + 1).padStart(2, '0')}`
      : null,
  visibility: index === 4 ? 'followers' : index >= 6 ? 'draft' : 'public',
  status: index < 6 ? 'published' : index === 6 ? 'draft' : 'failed',
  hasMedia: index < 7,
}));

function deterministicUuid(label) {
  const bytes = crypto
    .createHash('sha256')
    .update(`${SEED_NAMESPACE}:${label}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function validateFixtures(fixtures) {
  const errors = [];
  const unique = (values) => new Set(values).size === values.length;
  const primaryUser = fixtures.users.find(
    (user) => user.key === PRIMARY_DEMO_ACCOUNT.key,
  );
  if (fixtures.users.length !== 24) errors.push('Expected 24 users');
  if (fixtures.companies.length !== 5) errors.push('Expected 5 companies');
  if (fixtures.jobs.length !== 40) errors.push('Expected 40 jobs');
  if (fixtures.applications.length !== 60)
    errors.push('Expected 60 applications');
  if (fixtures.posts.length !== 20) errors.push('Expected 20 posts');
  if (fixtures.reels.length !== 8) errors.push('Expected 8 reels');
  if (!unique(fixtures.users.map((user) => user.phone))) {
    errors.push('Demo phones must be unique');
  }
  if (!unique(fixtures.users.map((user) => user.email))) {
    errors.push('Demo emails must be unique');
  }
  if (!unique(fixtures.users.map((user) => user.referralCode))) {
    errors.push('Demo referral codes must be unique');
  }
  if (!primaryUser) {
    errors.push('Primary demo account is missing');
  } else {
    if (primaryUser.phone !== PRIMARY_DEMO_ACCOUNT.phone) {
      errors.push(`Primary demo phone must be ${PRIMARY_DEMO_ACCOUNT.phone}`);
    }
    if (primaryUser.verification !== 'verified') {
      errors.push('Primary demo account must be verified');
    }
    if (
      !primaryUser.preferences.includes('Custom Craft') ||
      !primaryUser.preferences.some((name) => name !== 'Custom Craft')
    ) {
      errors.push('Primary demo account must include library and SVG filters');
    }
  }
  for (const job of fixtures.jobs) {
    if (job.title.trim() !== job.title || job.title.length > 35) {
      errors.push(`Invalid demo job title: ${job.title}`);
    }
  }
  if (
    !unique(
      fixtures.applications.map(
        (application) => `${application.jobKey}:${application.applicantKey}`,
      ),
    )
  ) {
    errors.push('Demo applications must have unique job/applicant pairs');
  }
  const actualStatuses = fixtures.applications.reduce((counts, item) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
    return counts;
  }, {});
  if (
    JSON.stringify(actualStatuses) !== JSON.stringify(applicationStatusCounts)
  ) {
    errors.push('Application status distribution is invalid');
  }
  const primaryApplicationStatuses = new Set(
    fixtures.applications
      .filter(
        (application) =>
          application.applicantKey === PRIMARY_DEMO_ACCOUNT.key,
      )
      .map((application) => application.status),
  );
  for (const status of Object.keys(applicationStatusCounts)) {
    if (!primaryApplicationStatuses.has(status)) {
      errors.push(`Primary demo account is missing ${status} application`);
    }
  }
  if (
    !fixtures.jobs.some(
      (job) =>
        job.creatorKey === PRIMARY_DEMO_ACCOUNT.key &&
        job.postingMode === 'individual',
    )
  ) {
    errors.push('Primary demo account must own an individual job');
  }
  if (errors.length) throw new Error(errors.join('; '));
}

function buildFixtures() {
  const users = buildUsers();
  const jobs = buildJobs();
  const applications = buildApplications(users, jobs);
  const fixtureSet = {
    countries,
    languages,
    filters,
    users,
    companies,
    jobs,
    applications,
    posts,
    reels,
  };
  validateFixtures(fixtureSet);
  return fixtureSet;
}

module.exports = {
  SEED_NAMESPACE,
  DEMO_PASSWORD,
  DEMO_EMAIL_DOMAIN,
  ICON_COLOR,
  PRIMARY_DEMO_ACCOUNT,
  applicationStatusCounts,
  buildFixtures,
  deterministicUuid,
  validateFixtures,
};
