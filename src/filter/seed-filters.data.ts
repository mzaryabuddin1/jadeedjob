/**
 * Job category filters seeded with Tabler icon names.
 * Mobile (React Native): `@tabler/icons-react-native`
 * e.g. name "briefcase" → import { IconBriefcase } from '@tabler/icons-react-native'
 *
 * Browse icons: https://tabler.io/icons
 */

export type SeedFilterIcon =
  | { type: 'tabler'; name: string }
  | { type: 'custom'; svg: string };

export type SeedFilter = {
  name: string;
  icon: SeedFilterIcon;
};

export const SEED_FILTERS: SeedFilter[] = [
  { name: 'Labor', icon: { type: 'tabler', name: 'bolt' } },
  { name: 'Housekeeping', icon: { type: 'tabler', name: 'home' } },
  { name: 'Delivery', icon: { type: 'tabler', name: 'bike' } },
  { name: 'Kitchen', icon: { type: 'tabler', name: 'tools-kitchen-2' } },
  { name: 'Admin', icon: { type: 'tabler', name: 'file-text' } },
  { name: 'Electrician', icon: { type: 'tabler', name: 'bolt' } },
  { name: 'Plumber', icon: { type: 'tabler', name: 'droplet' } },
  { name: 'Driver', icon: { type: 'tabler', name: 'car' } },
  { name: 'Painter', icon: { type: 'tabler', name: 'paint' } },
  { name: 'Security', icon: { type: 'tabler', name: 'shield' } },
  { name: 'Loader', icon: { type: 'tabler', name: 'truck' } },
  { name: 'Cook', icon: { type: 'tabler', name: 'chef-hat' } },
  { name: 'Mechanic', icon: { type: 'tabler', name: 'engine' } },
  { name: 'Cleaner', icon: { type: 'tabler', name: 'sparkles' } },
  { name: 'Office helper', icon: { type: 'tabler', name: 'briefcase' } },
  { name: 'Construction', icon: { type: 'tabler', name: 'building' } },
  { name: 'Warehouse', icon: { type: 'tabler', name: 'building-warehouse' } },
  { name: 'Retail', icon: { type: 'tabler', name: 'shopping-bag' } },
  { name: 'Healthcare', icon: { type: 'tabler', name: 'heartbeat' } },
  { name: 'Teaching', icon: { type: 'tabler', name: 'school' } },
  { name: 'IT & software', icon: { type: 'tabler', name: 'device-laptop' } },
  { name: 'Beauty & salon', icon: { type: 'tabler', name: 'scissors' } },
  { name: 'Gardening', icon: { type: 'tabler', name: 'plant' } },
  { name: 'Tailoring', icon: { type: 'tabler', name: 'shirt' } },
  { name: 'Other', icon: { type: 'tabler', name: 'dots' } },
];
