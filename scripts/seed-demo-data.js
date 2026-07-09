#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DEMO_PASSWORD = 'Demo@1234!';
const DEMO_PHONES = Array.from({ length: 10 }, (_, i) => `03000010${String(i + 1).padStart(2, '0')}`);
const DEMO_PAGE_USERNAMES = ['demo-quickship', 'demo-citycare', 'demo-skillforge'];
const DEMO_ORG_USERNAMES = ['demo-worker-network', 'demo-employer-circle'];

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
  { name: 'Labor', icon: 'wrench' },
  { name: 'Housekeeping', icon: 'broom' },
  { name: 'Delivery', icon: 'motorcycle' },
  { name: 'Kitchen', icon: 'utensils' },
  { name: 'Admin', icon: 'file-alt' },
  { name: 'Electrician', icon: 'bolt' },
  { name: 'Plumber', icon: 'tint' },
  { name: 'Driver', icon: 'car' },
  { name: 'Security', icon: 'user-shield' },
  { name: 'Cleaner', icon: 'sparkles' },
  { name: 'Mechanic', icon: 'settings' },
  { name: 'Painter', icon: 'paint-brush' },
];

const demoUsers = [
  {
    key: 'ahmed',
    phone: '0300001001',
    email: 'ahmed.worker@example.com',
    firstName: 'Ahmed',
    lastName: 'Khan',
    full_name: 'Ahmed Khan',
    father_name: 'Rashid Khan',
    gender: 'Male',
    date_of_birth: '1994-03-12',
    nationality: 'Pakistani',
    marital_status: 'Married',
    city: 'Karachi',
    state: 'Sindh',
    contact_country: 'Pakistan',
    address_line1: 'Block 7, Gulshan-e-Iqbal',
    postal_code: '75300',
    alternate_phone: '0300001101',
    professional_summary: 'Reliable general labor worker with delivery and warehouse experience.',
    skills: ['Loading', 'Packing', 'Warehouse support', 'Basic delivery'],
    technical_skills: ['Inventory handling', 'Route following'],
    soft_skills: ['Punctual', 'Team player', 'Reliable'],
    preferences: ['Labor', 'Delivery', 'Driver'],
    country: 'PK',
    language: 'ur',
  },
  {
    key: 'sara',
    phone: '0300001002',
    email: 'sara.quickship@example.com',
    firstName: 'Sara',
    lastName: 'Malik',
    full_name: 'Sara Malik',
    father_name: 'Nadeem Malik',
    gender: 'Female',
    date_of_birth: '1990-09-04',
    nationality: 'Pakistani',
    marital_status: 'Single',
    city: 'Lahore',
    state: 'Punjab',
    contact_country: 'Pakistan',
    address_line1: 'Main Boulevard, Gulberg',
    postal_code: '54660',
    alternate_phone: '0300001102',
    professional_summary: 'Operations manager hiring delivery, driving, and admin teams.',
    skills: ['Operations', 'Hiring', 'Fleet coordination'],
    technical_skills: ['Route planning', 'Spreadsheet reporting'],
    soft_skills: ['Leadership', 'Clear communication'],
    preferences: ['Delivery', 'Driver', 'Admin'],
    country: 'PK',
    language: 'en',
  },
  {
    key: 'bilal',
    phone: '0300001003',
    email: 'bilal.technician@example.com',
    firstName: 'Bilal',
    lastName: 'Hussain',
    full_name: 'Bilal Hussain',
    father_name: 'Tariq Hussain',
    gender: 'Male',
    date_of_birth: '1988-11-18',
    nationality: 'Pakistani',
    marital_status: 'Married',
    city: 'Rawalpindi',
    state: 'Punjab',
    contact_country: 'Pakistan',
    address_line1: 'Satellite Town',
    postal_code: '46300',
    alternate_phone: '0300001103',
    professional_summary: 'Certified electrician and plumber for residential maintenance.',
    skills: ['Wiring', 'Plumbing', 'Maintenance'],
    technical_skills: ['DB panels', 'Water pumps', 'Fault tracing'],
    soft_skills: ['Problem solving', 'Customer handling'],
    preferences: ['Electrician', 'Plumber', 'Mechanic'],
    country: 'PK',
    language: 'ur',
  },
  {
    key: 'ayesha',
    phone: '0300001004',
    email: 'ayesha.citycare@example.com',
    firstName: 'Ayesha',
    lastName: 'Noor',
    full_name: 'Ayesha Noor',
    father_name: 'Khalid Noor',
    gender: 'Female',
    date_of_birth: '1992-02-21',
    nationality: 'Pakistani',
    marital_status: 'Single',
    city: 'Islamabad',
    state: 'ICT',
    contact_country: 'Pakistan',
    address_line1: 'F-10 Markaz',
    postal_code: '44000',
    alternate_phone: '0300001104',
    professional_summary: 'Facility services lead managing cleaning and security teams.',
    skills: ['Facility management', 'Staff scheduling', 'Client support'],
    technical_skills: ['Attendance systems', 'Service checklists'],
    soft_skills: ['Organized', 'Empathetic'],
    preferences: ['Housekeeping', 'Cleaner', 'Security'],
    country: 'PK',
    language: 'en',
  },
  {
    key: 'imran',
    phone: '0300001005',
    email: 'imran.mechanic@example.com',
    firstName: 'Imran',
    lastName: 'Ali',
    full_name: 'Imran Ali',
    father_name: 'Yousaf Ali',
    gender: 'Male',
    date_of_birth: '1986-07-30',
    nationality: 'Pakistani',
    marital_status: 'Married',
    city: 'Faisalabad',
    state: 'Punjab',
    contact_country: 'Pakistan',
    address_line1: 'Susan Road',
    postal_code: '38000',
    alternate_phone: '0300001105',
    professional_summary: 'Vehicle mechanic and painter with workshop experience.',
    skills: ['Engine service', 'Denting', 'Painting'],
    technical_skills: ['Oil change', 'Diagnostics', 'Spray painting'],
    soft_skills: ['Patient', 'Detail oriented'],
    preferences: ['Mechanic', 'Painter', 'Driver'],
    country: 'PK',
    language: 'pa',
  },
  {
    key: 'fatima',
    phone: '0300001006',
    email: 'fatima.admin@example.com',
    firstName: 'Fatima',
    lastName: 'Sheikh',
    full_name: 'Fatima Sheikh',
    father_name: 'Javed Sheikh',
    gender: 'Female',
    date_of_birth: '1996-01-08',
    nationality: 'Pakistani',
    marital_status: 'Single',
    city: 'Karachi',
    state: 'Sindh',
    contact_country: 'Pakistan',
    address_line1: 'DHA Phase 2',
    postal_code: '75500',
    alternate_phone: '0300001106',
    professional_summary: 'Office assistant with admin, reception, and payroll support experience.',
    skills: ['Documentation', 'Reception', 'Scheduling'],
    technical_skills: ['MS Office', 'Data entry'],
    soft_skills: ['Polite', 'Fast learner'],
    preferences: ['Admin', 'Housekeeping', 'Delivery'],
    country: 'PK',
    language: 'en',
  },
  {
    key: 'omar',
    phone: '0300001007',
    email: 'omar.security@example.com',
    firstName: 'Omar',
    lastName: 'Farooq',
    full_name: 'Omar Farooq',
    father_name: 'Saleem Farooq',
    gender: 'Male',
    date_of_birth: '1991-05-19',
    nationality: 'Pakistani',
    marital_status: 'Married',
    city: 'Multan',
    state: 'Punjab',
    contact_country: 'Pakistan',
    address_line1: 'Cantt Road',
    postal_code: '60000',
    alternate_phone: '0300001107',
    professional_summary: 'Security guard with event and residential building experience.',
    skills: ['Access control', 'Patrolling', 'Incident reporting'],
    technical_skills: ['CCTV monitoring', 'Visitor logs'],
    soft_skills: ['Alert', 'Disciplined'],
    preferences: ['Security', 'Driver', 'Labor'],
    country: 'PK',
    language: 'ur',
  },
  {
    key: 'nadia',
    phone: '0300001008',
    email: 'nadia.cleaning@example.com',
    firstName: 'Nadia',
    lastName: 'Iqbal',
    full_name: 'Nadia Iqbal',
    father_name: 'Akram Iqbal',
    gender: 'Female',
    date_of_birth: '1995-12-03',
    nationality: 'Pakistani',
    marital_status: 'Single',
    city: 'Lahore',
    state: 'Punjab',
    contact_country: 'Pakistan',
    address_line1: 'Johar Town',
    postal_code: '54782',
    alternate_phone: '0300001108',
    professional_summary: 'Housekeeping worker experienced in offices, clinics, and homes.',
    skills: ['Cleaning', 'Laundry', 'Sanitization'],
    technical_skills: ['Floor cleaning machines', 'Inventory supplies'],
    soft_skills: ['Careful', 'Respectful'],
    preferences: ['Housekeeping', 'Cleaner', 'Kitchen'],
    country: 'PK',
    language: 'ur',
  },
  {
    key: 'hamza',
    phone: '0300001009',
    email: 'hamza.kitchen@example.com',
    firstName: 'Hamza',
    lastName: 'Qureshi',
    full_name: 'Hamza Qureshi',
    father_name: 'Aslam Qureshi',
    gender: 'Male',
    date_of_birth: '1993-08-14',
    nationality: 'Pakistani',
    marital_status: 'Single',
    city: 'Peshawar',
    state: 'KPK',
    contact_country: 'Pakistan',
    address_line1: 'University Road',
    postal_code: '25000',
    alternate_phone: '0300001109',
    professional_summary: 'Kitchen helper and cook assistant for restaurants and catering jobs.',
    skills: ['Food prep', 'Dishwashing', 'Stock rotation'],
    technical_skills: ['Grill support', 'Basic baking'],
    soft_skills: ['Clean worker', 'Quick learner'],
    preferences: ['Kitchen', 'Cleaner', 'Delivery'],
    country: 'PK',
    language: 'ur',
  },
  {
    key: 'zainab',
    phone: '0300001010',
    email: 'zainab.skillforge@example.com',
    firstName: 'Zainab',
    lastName: 'Raza',
    full_name: 'Zainab Raza',
    father_name: 'Noman Raza',
    gender: 'Female',
    date_of_birth: '1989-04-25',
    nationality: 'Pakistani',
    marital_status: 'Married',
    city: 'Dubai',
    state: 'Dubai',
    contact_country: 'United Arab Emirates',
    address_line1: 'Al Barsha',
    postal_code: '00000',
    alternate_phone: '0300001110',
    professional_summary: 'Training coordinator placing skilled workers in Gulf support roles.',
    skills: ['Training', 'Recruitment', 'Vendor coordination'],
    technical_skills: ['LMS coordination', 'Interview screening'],
    soft_skills: ['Coaching', 'Negotiation'],
    preferences: ['Admin', 'Electrician', 'Mechanic'],
    country: 'AE',
    language: 'en',
  },
];

const pageSeeds = [
  {
    key: 'quickship',
    username: 'demo-quickship',
    company_name: 'QuickShip Logistics',
    business_name: 'QuickShip Private Limited',
    industry_type: 'Logistics',
    city: 'Lahore',
    state: 'Punjab',
    country: 'Pakistan',
    owner: 'sara',
    members: [
      { user: 'sara', role: 'owner' },
      { user: 'fatima', role: 'admin' },
      { user: 'omar', role: 'editor' },
    ],
    description: 'Delivery and light logistics service hiring riders, drivers, and dispatch staff.',
    logoText: 'QuickShip',
    rating: 4.6,
  },
  {
    key: 'citycare',
    username: 'demo-citycare',
    company_name: 'CityCare Facility Services',
    business_name: 'CityCare Services',
    industry_type: 'Facilities',
    city: 'Islamabad',
    state: 'ICT',
    country: 'Pakistan',
    owner: 'ayesha',
    members: [
      { user: 'ayesha', role: 'owner' },
      { user: 'nadia', role: 'admin' },
      { user: 'bilal', role: 'editor' },
    ],
    description: 'Facility services team for housekeeping, cleaning, maintenance, and security.',
    logoText: 'CityCare',
    rating: 4.8,
  },
  {
    key: 'skillforge',
    username: 'demo-skillforge',
    company_name: 'SkillForge Trades',
    business_name: 'SkillForge Workforce',
    industry_type: 'Skilled Trades',
    city: 'Dubai',
    state: 'Dubai',
    country: 'United Arab Emirates',
    owner: 'zainab',
    members: [
      { user: 'zainab', role: 'owner' },
      { user: 'imran', role: 'editor' },
      { user: 'fatima', role: 'admin' },
    ],
    description: 'Skilled worker sourcing and short training programs for trades and support roles.',
    logoText: 'SkillForge',
    rating: 4.5,
  },
];

const orgSeeds = [
  {
    key: 'workerNetwork',
    username: 'demo-worker-network',
    name: 'Demo Worker Network',
    industry: 'Workforce Community',
    owner: 'ahmed',
    members: [
      { user: 'ahmed', role: 'owner' },
      { user: 'fatima', role: 'admin' },
      { user: 'bilal', role: 'user' },
      { user: 'imran', role: 'user' },
      { user: 'nadia', role: 'user' },
      { user: 'omar', role: 'user' },
      { user: 'hamza', role: 'user' },
    ],
  },
  {
    key: 'employerCircle',
    username: 'demo-employer-circle',
    name: 'Demo Employer Circle',
    industry: 'Employer Group',
    owner: 'sara',
    members: [
      { user: 'sara', role: 'owner' },
      { user: 'ayesha', role: 'admin' },
      { user: 'zainab', role: 'admin' },
      { user: 'fatima', role: 'user' },
    ],
  },
];

const demoJobLocations = [
  ['San Francisco', 37.785833842137464, -122.40641713142395],
  ['San Francisco', 37.78635, -122.4058],
  ['San Francisco', 37.7851, -122.4072],
  ['San Francisco', 37.787, -122.407],
  ['San Francisco', 37.7848, -122.4057],
  ['San Francisco', 37.7861, -122.4081],
  ['San Francisco', 37.7843, -122.4062],
  ['San Francisco', 37.7874, -122.4053],
  ['San Francisco', 37.7856, -122.4049],
  ['San Francisco', 37.7868, -122.4084],
  ['San Francisco', 37.7839, -122.4077],
  ['San Francisco', 37.7878, -122.4066],
  ['San Francisco', 37.7846, -122.4048],
  ['San Francisco', 37.7852, -122.4086],
  ['San Francisco', 37.7865, -122.4043],
  ['San Francisco', 37.7836, -122.4069],
  ['San Francisco', 37.7871, -122.4059],
  ['San Francisco', 37.7841, -122.4052],
];

const jobSeeds = [
  ['deliveryRider', 'Delivery Rider for Evening Parcels', 'Delivery', 'sara', 'quickship', 'Deliver small parcels across assigned zones.', 'Valid bike license and smartphone required.', ['Fuel allowance', 'Weekly payout'], ['evening'], ['full-time'], 'daily-wage', 2200, ...demoJobLocations[0], 'Logistics', 'Matric', '1 year', ['Urdu', 'Punjabi']],
  ['vanDriver', 'Van Driver for Corporate Routes', 'Driver', 'sara', 'quickship', 'Drive company van on fixed pickup and drop routes.', 'LTV license and route discipline required.', ['Overtime', 'Company vehicle'], ['morning'], ['full-time'], 'monthly', 62000, ...demoJobLocations[1], 'Transport', 'Matric', '2 years', ['Urdu']],
  ['dispatchAssistant', 'Dispatch Admin Assistant', 'Admin', 'sara', 'quickship', 'Coordinate riders, calls, and delivery records.', 'Basic computer skills required.', ['Office lunch', 'Paid leaves'], ['morning'], ['full-time'], 'monthly', 52000, ...demoJobLocations[2], 'Administration', 'Intermediate', '1 year', ['English', 'Urdu']],
  ['warehouseLabor', 'Warehouse Loading Helper', 'Labor', 'sara', null, 'Load, sort, and label boxes at warehouse floor.', 'Able to lift cartons and work on feet.', ['Tea break', 'Transport support'], ['night'], ['temporary'], 'daily-wage', 1900, ...demoJobLocations[3], 'Warehouse', 'Middle', 'Fresh', ['Urdu']],
  ['officeCleaner', 'Office Cleaner for Morning Shift', 'Cleaner', 'ayesha', 'citycare', 'Clean offices before staff arrival.', 'Cleaning experience preferred.', ['Uniform', 'Weekly rest'], ['morning'], ['part-time'], 'monthly', 36000, ...demoJobLocations[4], 'Facilities', 'Middle', '6 months', ['Urdu']],
  ['housekeeperClinic', 'Clinic Housekeeping Staff', 'Housekeeping', 'ayesha', 'citycare', 'Maintain hygiene in clinic waiting and treatment rooms.', 'Must follow sanitation checklist.', ['Medical support', 'Uniform'], ['morning', 'evening'], ['full-time'], 'monthly', 43000, ...demoJobLocations[5], 'Healthcare Support', 'Matric', '1 year', ['Urdu']],
  ['securityGuard', 'Night Security Guard', 'Security', 'ayesha', 'citycare', 'Monitor entry gate and record visitors overnight.', 'Prior guard duty preferred.', ['Accommodation option', 'Uniform'], ['night'], ['full-time'], 'monthly', 48000, ...demoJobLocations[6], 'Security', 'Matric', '1 year', ['Urdu']],
  ['buildingPlumber', 'Building Plumber for Maintenance Team', 'Plumber', 'ayesha', null, 'Repair taps, pumps, and bathroom fittings.', 'Own basic tools preferred.', ['Tool allowance'], ['morning'], ['contract'], 'daily-wage', 2800, ...demoJobLocations[7], 'Maintenance', 'Middle', '2 years', ['Urdu']],
  ['siteElectrician', 'Site Electrician for Apartment Project', 'Electrician', 'zainab', 'skillforge', 'Install wiring, switches, and light fixtures.', 'Safety knowledge and DB panel experience required.', ['Safety gear', 'Project bonus'], ['morning'], ['contract'], 'daily-wage', 3200, ...demoJobLocations[8], 'Construction', 'Matric', '3 years', ['English', 'Urdu']],
  ['autoMechanic', 'Auto Mechanic for Workshop', 'Mechanic', 'zainab', 'skillforge', 'Service engines, brakes, and routine repairs.', 'Workshop experience required.', ['Commission', 'Lunch'], ['morning'], ['full-time'], 'monthly', 70000, ...demoJobLocations[9], 'Automotive', 'Matric', '3 years', ['Urdu', 'Arabic']],
  ['painterHelper', 'Painter Helper for Villas', 'Painter', 'zainab', null, 'Prepare walls, mix paint, and assist senior painters.', 'Basic painting knowledge preferred.', ['Accommodation', 'Overtime'], ['morning'], ['temporary'], 'daily-wage', 2600, ...demoJobLocations[10], 'Construction', 'Middle', '1 year', ['Urdu']],
  ['kitchenHelper', 'Kitchen Helper for Busy Restaurant', 'Kitchen', 'zainab', null, 'Assist cook, wash dishes, and keep kitchen clean.', 'Food safety awareness required.', ['Meals', 'Tips share'], ['evening', 'night'], ['full-time'], 'monthly', 44000, ...demoJobLocations[11], 'Food Service', 'Middle', '6 months', ['Urdu']],
  ['eventLabor', 'Event Setup Labor Team', 'Labor', 'ahmed', null, 'Set up chairs, stages, and event materials.', 'Late shift availability required.', ['Dinner', 'Transport'], ['night'], ['temporary'], 'daily-wage', 2000, ...demoJobLocations[12], 'Events', 'Middle', 'Fresh', ['Urdu']],
  ['bikeCourier', 'Part-Time Bike Courier', 'Delivery', 'fatima', null, 'Deliver documents and small parcels within city.', 'Own bike and helmet required.', ['Flexible hours'], ['evening'], ['part-time'], 'hourly', 450, ...demoJobLocations[13], 'Courier', 'Matric', 'Fresh', ['Urdu']],
  ['receptionAdmin', 'Reception and Data Entry Assistant', 'Admin', 'fatima', null, 'Handle front desk visitors and daily entry sheets.', 'Basic English and computer typing required.', ['Training', 'Tea'], ['morning'], ['full-time'], 'monthly', 47000, ...demoJobLocations[14], 'Office Support', 'Intermediate', '1 year', ['English', 'Urdu']],
  ['familyDriver', 'Family Driver for School Runs', 'Driver', 'omar', null, 'Drive children to school and family errands.', 'Clean driving record required.', ['Meals', 'Stable schedule'], ['morning', 'evening'], ['full-time'], 'monthly', 55000, ...demoJobLocations[15], 'Domestic Support', 'Matric', '3 years', ['Urdu', 'Punjabi']],
  ['deepCleaningCrew', 'Deep Cleaning Crew Member', 'Cleaner', 'nadia', null, 'Join a mobile cleaning crew for homes and offices.', 'Must be comfortable with travel inside city.', ['Transport', 'Weekly bonus'], ['morning'], ['contract'], 'daily-wage', 2100, ...demoJobLocations[16], 'Cleaning', 'Middle', '6 months', ['Urdu']],
  ['restaurantCookHelper', 'Cook Helper for Catering Orders', 'Kitchen', 'hamza', null, 'Prep vegetables, pack food, and assist during catering rush.', 'Restaurant experience preferred.', ['Meals', 'Tips'], ['morning', 'evening'], ['temporary'], 'daily-wage', 2300, ...demoJobLocations[17], 'Food Service', 'Middle', '1 year', ['Urdu', 'Pashto']],
];

const applicationSeeds = [
  ['deliveryRider', 'ahmed', 'accepted'],
  ['deliveryRider', 'omar', 'pending'],
  ['deliveryRider', 'hamza', 'rejected'],
  ['vanDriver', 'omar', 'accepted'],
  ['vanDriver', 'imran', 'pending'],
  ['dispatchAssistant', 'fatima', 'accepted'],
  ['warehouseLabor', 'ahmed', 'pending'],
  ['officeCleaner', 'nadia', 'accepted'],
  ['officeCleaner', 'hamza', 'pending'],
  ['housekeeperClinic', 'nadia', 'accepted'],
  ['housekeeperClinic', 'fatima', 'rejected'],
  ['securityGuard', 'omar', 'accepted'],
  ['buildingPlumber', 'bilal', 'accepted'],
  ['siteElectrician', 'bilal', 'accepted'],
  ['siteElectrician', 'imran', 'pending'],
  ['autoMechanic', 'imran', 'accepted'],
  ['autoMechanic', 'bilal', 'rejected'],
  ['painterHelper', 'imran', 'pending'],
  ['kitchenHelper', 'hamza', 'accepted'],
  ['eventLabor', 'omar', 'pending'],
  ['bikeCourier', 'ahmed', 'accepted'],
  ['receptionAdmin', 'fatima', 'pending'],
  ['familyDriver', 'ahmed', 'rejected'],
  ['deepCleaningCrew', 'fatima', 'accepted'],
];

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (value.endsWith(',')) value = value.slice(0, -1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function dbConfig() {
  loadEnv();

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'jobsloot_staging',
    multipleStatements: false,
  };
}

function hashPassword(password, phone) {
  const salt = crypto.createHash('sha256').update(`jadeed-demo:${phone}`).digest('hex').slice(0, 32);
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function csv(items) {
  return Array.isArray(items) && items.length ? items.join(',') : null;
}

function placeholders(values) {
  return values.map(() => '?').join(',');
}

async function selectIds(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows.map((row) => Number(row.id));
}

async function deleteWhere(conn, table, clauses) {
  const active = clauses.filter((clause) => clause.values.length > 0);
  if (!active.length) return;

  const where = active.map((clause) => `${clause.column} IN (${placeholders(clause.values)})`).join(' OR ');
  const values = active.flatMap((clause) => clause.values);
  await conn.execute(`DELETE FROM ${table} WHERE ${where}`, values);
}

async function updateNullWhereIn(conn, table, column, values) {
  if (!values.length) return;
  await conn.execute(`UPDATE ${table} SET ${column} = NULL WHERE ${column} IN (${placeholders(values)})`, values);
}

async function cleanupOldDemoData(conn) {
  const oldUserIds = await selectIds(
    conn,
    `SELECT id FROM users WHERE phone IN (${placeholders(DEMO_PHONES)})`,
    DEMO_PHONES,
  );

  const oldPageIds = await selectIds(
    conn,
    `SELECT id FROM pages WHERE username IN (${placeholders(DEMO_PAGE_USERNAMES)})`,
    DEMO_PAGE_USERNAMES,
  );

  const oldOrgIds = await selectIds(
    conn,
    `SELECT id FROM organizations WHERE username IN (${placeholders(DEMO_ORG_USERNAMES)})`,
    DEMO_ORG_USERNAMES,
  );

  const jobClauses = [];
  const jobParams = [];
  if (oldUserIds.length) {
    jobClauses.push(`createdBy IN (${placeholders(oldUserIds)})`);
    jobParams.push(...oldUserIds);
  }
  if (oldPageIds.length) {
    jobClauses.push(`pageId IN (${placeholders(oldPageIds)})`);
    jobParams.push(...oldPageIds);
  }

  const oldJobIds = jobClauses.length
    ? await selectIds(conn, `SELECT id FROM jobs WHERE ${jobClauses.join(' OR ')}`, jobParams)
    : [];

  const appClauses = [];
  const appParams = [];
  if (oldJobIds.length) {
    appClauses.push(`jobId IN (${placeholders(oldJobIds)})`);
    appParams.push(...oldJobIds);
  }
  if (oldUserIds.length) {
    appClauses.push(`applicantId IN (${placeholders(oldUserIds)})`);
    appParams.push(...oldUserIds);
  }

  const oldApplicationIds = appClauses.length
    ? await selectIds(conn, `SELECT id FROM job_applications WHERE ${appClauses.join(' OR ')}`, appParams)
    : [];

  await deleteWhere(conn, 'ratings', [
    { column: 'jobApplicationId', values: oldApplicationIds },
    { column: 'givenBy', values: oldUserIds },
    { column: 'givenTo', values: oldUserIds },
    { column: 'raterId', values: oldUserIds },
    { column: 'ratedUserId', values: oldUserIds },
  ]);
  await deleteWhere(conn, 'chat_messages', [
    { column: 'jobApplicationId', values: oldApplicationIds },
    { column: 'senderId', values: oldUserIds },
  ]);
  await deleteWhere(conn, 'job_applications', [
    { column: 'id', values: oldApplicationIds },
    { column: 'jobId', values: oldJobIds },
    { column: 'applicantId', values: oldUserIds },
  ]);
  await deleteWhere(conn, 'jobs', [{ column: 'id', values: oldJobIds }]);
  await deleteWhere(conn, 'page_members', [
    { column: 'pageId', values: oldPageIds },
    { column: 'userId', values: oldUserIds },
  ]);
  await deleteWhere(conn, 'pages', [{ column: 'id', values: oldPageIds }]);
  await deleteWhere(conn, 'org_members', [
    { column: 'organizationId', values: oldOrgIds },
    { column: 'userId', values: oldUserIds },
  ]);
  await deleteWhere(conn, 'organizations', [{ column: 'id', values: oldOrgIds }]);
  await deleteWhere(conn, 'work_experience', [{ column: 'userId', values: oldUserIds }]);
  await deleteWhere(conn, 'education', [{ column: 'userId', values: oldUserIds }]);
  await deleteWhere(conn, 'certifications', [{ column: 'userId', values: oldUserIds }]);
  await updateNullWhereIn(conn, 'filters', 'creatorId', oldUserIds);
  await deleteWhere(conn, 'users', [{ column: 'id', values: oldUserIds }]);
}

async function upsertCountries(conn) {
  const ids = {};

  for (const country of countries) {
    const [existing] = await conn.execute(
      'SELECT id FROM countries WHERE code = ? OR name = ? ORDER BY id ASC LIMIT 1',
      [country.code, country.name],
    );

    if (existing.length) {
      const id = Number(existing[0].id);
      await conn.execute('UPDATE countries SET name = ?, code = ?, dial_code = ? WHERE id = ?', [
        country.name,
        country.code,
        country.dial_code,
        id,
      ]);
      ids[country.code] = id;
    } else {
      const [result] = await conn.execute('INSERT INTO countries (name, code, dial_code) VALUES (?, ?, ?)', [
        country.name,
        country.code,
        country.dial_code,
      ]);
      ids[country.code] = Number(result.insertId);
    }
  }

  return ids;
}

async function upsertLanguages(conn) {
  const ids = {};

  for (const language of languages) {
    const [existing] = await conn.execute('SELECT id FROM languages WHERE code = ? LIMIT 1', [language.code]);

    if (existing.length) {
      const id = Number(existing[0].id);
      await conn.execute('UPDATE languages SET name = ? WHERE id = ?', [language.name, id]);
      ids[language.code] = id;
    } else {
      const [result] = await conn.execute('INSERT INTO languages (code, name) VALUES (?, ?)', [
        language.code,
        language.name,
      ]);
      ids[language.code] = Number(result.insertId);
    }
  }

  return ids;
}

async function insertUsers(conn, countryIds, languageIds) {
  const usersByKey = {};

  for (const [index, user] of demoUsers.entries()) {
    const { salt, hash } = hashPassword(DEMO_PASSWORD, user.phone);
    const photo = `https://i.pravatar.cc/300?u=jadeed-demo-${index + 1}`;

    const [result] = await conn.execute(
      `INSERT INTO users (
        email, firstName, lastName, phone, passwordHash, passwordSalt, isVerified, isBanned,
        full_name, father_name, gender, date_of_birth, nationality, marital_status, profile_photo,
        alternate_phone, address_line1, city, state, postal_code, contact_country,
        professional_summary, linkedin_url, github_url, portfolio_url, behance_url,
        skills, technical_skills, soft_skills, bank_name, account_number, iban, branch_name, swift_code,
        kyc_status, verified_by_admin_id, verification_date, rejection_reason, notes, fcmTokens,
        ratingAverage, ratingCount, filter_preferences, countryId, languageId
      ) VALUES (
        ?, ?, ?, ?, ?, ?, 1, 0,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        'approved', NULL, ?, NULL, ?, NULL,
        0, 0, NULL, ?, ?
      )`,
      [
        user.email,
        user.firstName,
        user.lastName,
        user.phone,
        hash,
        salt,
        user.full_name,
        user.father_name,
        user.gender,
        user.date_of_birth,
        user.nationality,
        user.marital_status,
        photo,
        user.alternate_phone,
        user.address_line1,
        user.city,
        user.state,
        user.postal_code,
        user.contact_country,
        user.professional_summary,
        `https://linkedin.com/in/${user.key}-demo`,
        `https://github.com/${user.key}-demo`,
        `https://portfolio.example.com/${user.key}`,
        `https://behance.net/${user.key}-demo`,
        csv(user.skills),
        csv(user.technical_skills),
        csv(user.soft_skills),
        'Demo Bank',
        `PK00DEMO${user.phone.slice(-4)}`,
        `PK36DEMO000000${user.phone.slice(-4)}`,
        'Main Branch',
        'DEMOXPKA',
        '2026-07-01',
        'Demo profile for app testing.',
        countryIds[user.country],
        languageIds[user.language],
      ],
    );

    usersByKey[user.key] = Number(result.insertId);
  }

  return usersByKey;
}

async function upsertFilters(conn, creatorId) {
  const ids = {};

  for (const filter of filters) {
    const [existing] = await conn.execute('SELECT id FROM filters WHERE name = ? LIMIT 1', [filter.name]);

    if (existing.length) {
      const id = Number(existing[0].id);
      await conn.execute(
        `UPDATE filters
         SET icon = ?, status = 'active', approvalStatus = 'approved', rejectionReason = NULL,
             createdBy = ?, creatorId = ?
         WHERE id = ?`,
        [filter.icon, creatorId, creatorId, id],
      );
      ids[filter.name] = id;
    } else {
      const [result] = await conn.execute(
        `INSERT INTO filters (name, icon, status, approvalStatus, rejectionReason, createdBy, creatorId)
         VALUES (?, ?, 'active', 'approved', NULL, ?, ?)`,
        [filter.name, filter.icon, creatorId, creatorId],
      );
      ids[filter.name] = Number(result.insertId);
    }
  }

  return ids;
}

async function updateUserPreferences(conn, usersByKey, filterIds) {
  for (const user of demoUsers) {
    const preferences = user.preferences.map((name) => filterIds[name]).filter(Boolean);
    await conn.execute('UPDATE users SET filter_preferences = ? WHERE id = ?', [
      csv(preferences.map(String)),
      usersByKey[user.key],
    ]);
  }
}

async function insertProfileChildren(conn, usersByKey) {
  for (const user of demoUsers) {
    const userId = usersByKey[user.key];

    await conn.execute(
      `INSERT INTO work_experience (
        company_name, designation, department, employment_type, from_date, to_date,
        key_responsibilities, experience_certificate, currently_working, userId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `${user.city} Demo Services`,
        user.key === 'sara' || user.key === 'ayesha' || user.key === 'zainab' ? 'Operations Lead' : 'Skilled Worker',
        'Operations',
        'full-time',
        '2022-01-01 00:00:00',
        user.key === 'sara' || user.key === 'ayesha' || user.key === 'zainab' ? null : '2025-12-31 00:00:00',
        user.professional_summary,
        `https://placehold.co/800x600/png?text=${encodeURIComponent(user.firstName)}+Experience`,
        user.key === 'sara' || user.key === 'ayesha' || user.key === 'zainab' ? 1 : 0,
        userId,
      ],
    );

    await conn.execute(
      `INSERT INTO education (
        highest_qualification, institution_name, graduation_year, gpa_or_grade, degree_document, userId
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.key === 'sara' || user.key === 'ayesha' || user.key === 'zainab' ? 'Bachelors' : 'Intermediate',
        `${user.city} Skills Institute`,
        user.key === 'sara' || user.key === 'ayesha' || user.key === 'zainab' ? '2013' : '2011',
        'B',
        `https://placehold.co/800x600/png?text=${encodeURIComponent(user.firstName)}+Degree`,
        userId,
      ],
    );

    await conn.execute(
      `INSERT INTO certifications (
        certification_name, issuing_institution, certification_date, certificate_file, userId
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        `${user.preferences[0]} Skills Certificate`,
        'JadeedJob Demo Training Center',
        '2025-06-15',
        `https://placehold.co/800x600/png?text=${encodeURIComponent(user.firstName)}+Certificate`,
        userId,
      ],
    );
  }
}

async function insertPages(conn, usersByKey) {
  const pagesByKey = {};

  for (const seed of pageSeeds) {
    const [result] = await conn.execute(
      `INSERT INTO pages (
        company_name, business_name, username, company_logo, website_url, official_email, official_phone,
        industry_type, company_description, founded_year, country, state, city, postal_code,
        address_line1, address_line2, google_maps_link, business_registration_number,
        tax_identification_number, registration_authority, business_license_document, company_type,
        representative_name, representative_designation, representative_email, representative_phone,
        id_proof_document, linkedin_page_url, facebook_page_url, instagram_page_url, twitter_page_url,
        youtube_channel_url, verified_email_domain, number_of_employees, annual_revenue_range,
        client_list, certifications, company_rating, ownerId
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, 2018, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )`,
      [
        seed.company_name,
        seed.business_name,
        seed.username,
        `https://placehold.co/300x300/png?text=${encodeURIComponent(seed.logoText)}`,
        `https://${seed.username}.example.com`,
        `hello@${seed.username}.example.com`,
        '+923000020000',
        seed.industry_type,
        seed.description,
        seed.country,
        seed.state,
        seed.city,
        '00000',
        `${seed.city} Demo Business Center`,
        'Suite 12',
        `https://maps.example.com/${seed.username}`,
        `BRN-${seed.username.toUpperCase()}`,
        `TAX-${seed.username.toUpperCase()}`,
        'Demo Registration Authority',
        `https://placehold.co/800x600/png?text=${encodeURIComponent(seed.logoText)}+License`,
        'Private Limited',
        demoUsers.find((user) => user.key === seed.owner).full_name,
        'Owner',
        `owner@${seed.username}.example.com`,
        '+923000020001',
        `https://placehold.co/800x600/png?text=${encodeURIComponent(seed.logoText)}+ID`,
        `https://linkedin.com/company/${seed.username}`,
        `https://facebook.com/${seed.username}`,
        `https://instagram.com/${seed.username}`,
        `https://twitter.com/${seed.username}`,
        `https://youtube.com/@${seed.username}`,
        `${seed.username}.example.com`,
        45,
        'PKR 1M - 5M',
        csv(['Demo Retail Client', 'Demo Corporate Client']),
        csv(['Verified Demo Employer', 'Service Quality Checked']),
        seed.rating,
        usersByKey[seed.owner],
      ],
    );

    const pageId = Number(result.insertId);
    pagesByKey[seed.key] = pageId;

    for (const member of seed.members) {
      await conn.execute('INSERT INTO page_members (pageId, userId, role) VALUES (?, ?, ?)', [
        pageId,
        usersByKey[member.user],
        member.role,
      ]);
    }
  }

  return pagesByKey;
}

async function insertOrganizations(conn, usersByKey) {
  const orgsByKey = {};

  for (const seed of orgSeeds) {
    const [result] = await conn.execute(
      `INSERT INTO organizations (name, username, industry, isActive, createdBy)
       VALUES (?, ?, ?, 'active', ?)`,
      [seed.name, seed.username, seed.industry, usersByKey[seed.owner]],
    );

    const orgId = Number(result.insertId);
    orgsByKey[seed.key] = orgId;

    for (const member of seed.members) {
      await conn.execute('INSERT INTO org_members (organizationId, userId, role) VALUES (?, ?, ?)', [
        orgId,
        usersByKey[member.user],
        member.role,
      ]);
    }
  }

  return orgsByKey;
}

async function insertJobs(conn, usersByKey, pagesByKey, filterIds) {
  const jobsByKey = {};

  for (const seed of jobSeeds) {
    const [
      key,
      title,
      filterName,
      creatorKey,
      pageKey,
      description,
      requirements,
      benefits,
      shifts,
      jobTypes,
      salaryType,
      salaryAmount,
      currency,
      lat,
      lng,
      industry,
      educationLevel,
      experienceRequired,
      languageRequirements,
    ] = seed;

    const [result] = await conn.execute(
      `INSERT INTO jobs (
        filterId, title, description, requirements, benefits, shifts, jobTypes,
        salaryType, salaryAmount, currency, location, startDate, endDate, industry,
        educationLevel, experienceRequired, languageRequirements, isActive, createdBy, pageId
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, 'PKR', ST_GeomFromText(?, 4326), ?, ?, ?,
        ?, ?, ?, 1, ?, ?
      )`,
      [
        filterIds[filterName],
        title,
        description,
        requirements,
        csv(benefits),
        csv(shifts),
        csv(jobTypes),
        salaryType,
        salaryAmount,
        `POINT(${lng} ${lat})`,
        '2026-07-15',
        '2026-08-31',
        industry,
        educationLevel,
        experienceRequired,
        csv(languageRequirements),
        usersByKey[creatorKey],
        pageKey ? pagesByKey[pageKey] : null,
      ],
    );

    jobsByKey[key] = Number(result.insertId);
  }

  return jobsByKey;
}

async function insertApplications(conn, usersByKey, jobsByKey) {
  const applications = [];

  for (const [index, seed] of applicationSeeds.entries()) {
    const [jobKey, applicantKey, status] = seed;
    const createdDay = String(2 + (index % 20)).padStart(2, '0');
    const [result] = await conn.execute(
      `INSERT INTO job_applications (jobId, applicantId, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [
        jobsByKey[jobKey],
        usersByKey[applicantKey],
        status,
        `2026-07-${createdDay} 09:00:00`,
        `2026-07-${createdDay} 09:30:00`,
      ],
    );

    applications.push({
      id: Number(result.insertId),
      jobKey,
      applicantKey,
      applicantId: usersByKey[applicantKey],
      status,
    });
  }

  return applications;
}

async function insertChatMessages(conn, applications, usersByKey, jobCreatorsByKey) {
  const chatApplications = applications.slice(0, 10);

  for (const [index, app] of chatApplications.entries()) {
    const applicantId = app.applicantId;
    const creatorId = usersByKey[jobCreatorsByKey[app.jobKey]];
    const day = String(3 + index).padStart(2, '0');

    const messages = [
      {
        senderId: applicantId,
        content: 'Hello, I applied for this job and I am available for the listed shift.',
        createdAt: `2026-07-${day} 10:00:00`,
      },
      {
        senderId: creatorId,
        content: 'Thanks for applying. Please confirm your city and expected joining date.',
        createdAt: `2026-07-${day} 10:12:00`,
      },
      {
        senderId: applicantId,
        content: 'I can join this week and can come for a trial if needed.',
        createdAt: `2026-07-${day} 10:20:00`,
      },
    ];

    for (const message of messages) {
      await conn.execute(
        `INSERT INTO chat_messages (jobApplicationId, senderId, content, mediaUrl, messageType, createdAt)
         VALUES (?, ?, ?, NULL, 'text', ?)`,
        [app.id, message.senderId, message.content, message.createdAt],
      );
    }
  }
}

async function insertRatings(conn, applications, usersByKey, jobCreatorsByKey) {
  const acceptedApplications = applications.filter((app) => app.status === 'accepted');
  const starPairs = [
    [5, 5],
    [5, 4],
    [4, 5],
    [5, 5],
    [4, 4],
    [5, 4],
    [4, 5],
    [5, 5],
    [4, 4],
    [5, 5],
  ];

  for (const [index, app] of acceptedApplications.entries()) {
    const creatorId = usersByKey[jobCreatorsByKey[app.jobKey]];
    const applicantId = app.applicantId;
    const [applicantStars, creatorStars] = starPairs[index % starPairs.length];

    await conn.execute(
      `INSERT INTO ratings (
        jobApplicationId, givenBy, givenTo, stars, comment, raterId, ratedUserId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        app.id,
        applicantId,
        creatorId,
        applicantStars,
        'Professional communication and clear job expectations.',
        applicantId,
        creatorId,
        '2026-07-25 12:00:00',
        '2026-07-25 12:00:00',
      ],
    );

    await conn.execute(
      `INSERT INTO ratings (
        jobApplicationId, givenBy, givenTo, stars, comment, raterId, ratedUserId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        app.id,
        creatorId,
        applicantId,
        creatorStars,
        'Reliable applicant with a strong demo profile.',
        creatorId,
        applicantId,
        '2026-07-25 12:05:00',
        '2026-07-25 12:05:00',
      ],
    );
  }
}

async function recalculateUserRatings(conn, userIds) {
  if (!userIds.length) return;

  await conn.execute(
    `UPDATE users SET ratingAverage = 0, ratingCount = 0 WHERE id IN (${placeholders(userIds)})`,
    userIds,
  );

  const [rows] = await conn.execute(
    `SELECT givenTo AS userId, AVG(stars) AS avgStars, COUNT(*) AS ratingCount
     FROM ratings
     WHERE givenTo IN (${placeholders(userIds)})
     GROUP BY givenTo`,
    userIds,
  );

  for (const row of rows) {
    await conn.execute('UPDATE users SET ratingAverage = ?, ratingCount = ? WHERE id = ?', [
      Number(row.avgStars),
      Number(row.ratingCount),
      Number(row.userId),
    ]);
  }
}

async function tableCounts(conn) {
  const tables = [
    'users',
    'countries',
    'languages',
    'filters',
    'jobs',
    'job_applications',
    'chat_messages',
    'ratings',
    'pages',
    'page_members',
    'organizations',
    'org_members',
    'work_experience',
    'education',
    'certifications',
  ];

  const counts = {};
  for (const table of tables) {
    const [rows] = await conn.execute(`SELECT COUNT(*) AS total FROM ${table}`);
    counts[table] = Number(rows[0].total);
  }
  return counts;
}

async function run() {
  const conn = await mysql.createConnection(dbConfig());

  const jobCreatorsByKey = Object.fromEntries(jobSeeds.map((seed) => [seed[0], seed[3]]));

  try {
    await conn.beginTransaction();

    await cleanupOldDemoData(conn);

    const countryIds = await upsertCountries(conn);
    const languageIds = await upsertLanguages(conn);
    const usersByKey = await insertUsers(conn, countryIds, languageIds);
    const filterIds = await upsertFilters(conn, usersByKey.sara);
    await updateUserPreferences(conn, usersByKey, filterIds);
    await insertProfileChildren(conn, usersByKey);
    const pagesByKey = await insertPages(conn, usersByKey);
    await insertOrganizations(conn, usersByKey);
    const jobsByKey = await insertJobs(conn, usersByKey, pagesByKey, filterIds);
    const applications = await insertApplications(conn, usersByKey, jobsByKey);
    await insertChatMessages(conn, applications, usersByKey, jobCreatorsByKey);
    await insertRatings(conn, applications, usersByKey, jobCreatorsByKey);
    await recalculateUserRatings(conn, Object.values(usersByKey));

    await conn.commit();

    const counts = await tableCounts(conn);
    console.log('Demo database seed complete.');
    console.log(`Sample login: 0300001001 / ${DEMO_PASSWORD}`);
    console.log(`Sample login: 0300001005 / ${DEMO_PASSWORD}`);
    console.log(JSON.stringify(counts, null, 2));
  } catch (error) {
    await conn.rollback();
    console.error('Demo database seed failed.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

run();
