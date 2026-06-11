export const SYSTEM_SITE = {
  id: 'SITE-SYSTEM',
  name: 'System Default Site',
  code: 'SYS',
  description: 'Baseline site created by SQM reference seed',
};

export const SUPER_ADMIN_ROLE = {
  id: 'ROLE-SUPER-ADMIN',
  name: 'TIP Administrator (Super User)',
  description: 'Full system access for seeded administrator',
};

export const SYSTEM_ADMIN_USER = {
  id: 'USER-SYSTEM-ADMIN',
};

export const SEED_SITES = {
  SYSTEM: { id: SYSTEM_SITE.id, name: SYSTEM_SITE.name, code: SYSTEM_SITE.code, desc: SYSTEM_SITE.description },
  BKK: { id: 'SITE-BKK', name: 'Bangkok Plant', code: 'BKK', desc: 'Main electronics assembly and supplier quality hub' },
  CBR: { id: 'SITE-CBR', name: 'Chonburi Plant', code: 'CBR', desc: 'Molding, stamping, and incoming material inspection site' },
  RYG: { id: 'SITE-RYG', name: 'Rayong Plant', code: 'RYG', desc: 'Final assembly and audit readiness site' },
};
