export const CHANNEL_TYPES = [
  'Agency', 'Retailer', 'Dealer', 'Mega Dealer', 'DSF', 'Moms & Pops', 'Installer'
] as const;

export const RESPONSIBILITIES = [
  'Collect Subscription', 'Activate Subscribers', 'Installations',
  'Marketing', 'Sale of Equipment', 'Swapping/Repair of Equipment',
  'Create/Update Records', 'Upgrades/Downgrades'
] as const;

export const APPLICATION_STATUSES = ['pending', 'approved', 'rejected'] as const;

export const FORM_STEPS = [
  { id: 'business', title: 'Business Details', description: 'Company information' },
  { id: 'representative', title: 'Representative', description: 'Contact details' },
  { id: 'channel', title: 'Sales Channel', description: 'Type & responsibilities' },
  { id: 'location', title: 'Zone & Territory', description: 'Area assignment' },
  { id: 'declaration', title: 'Declaration', description: 'Sign & attach documents' },
] as const;
