export const mapStatusToDB = (status: string): string => {
  const map: Record<string, string> = {
      // Pre-Submission
      'DRAFT': 'DR',
      'NEW': 'NW',
      'PLANNED': 'PL',
      // Active Flow
      'PENDING': 'PN',
      'SUBMITTED': 'SU',
      'AAPPROVAL': 'AA',
      'AWAITING_APPROVAL': 'AA',
      'CHECKED': 'CK',
      // Evaluation
      'FAPPROVED': 'FA',
      'EVALUATION': 'EV',
      // Final Stages
      'APPROVED': 'AP',
      'APPROVED_WC': 'AW',
      'APPROVEDWC': 'AW',
      'REJECTED': 'RE',
      'RAR': 'RR',
      // MNR Specific
      'ISSUED': 'IS',
      'FR': 'FR',
      'IR': 'IR',
      'REPORT': 'RP',
      'RESPONSE_AWAITING': 'RW',
      'RESPONSE_SUBMITTED': 'RS',
      'RESPONSE_AWAIT_APPROVAL': 'RA',
      'RESPONSE_AWAITING_APPROVAL': 'RA',
      'RESPONSE_CHECKED': 'RC',
      'RREJECTED': 'RJ',
      // QMQA Response Statuses
      'WITH_INITIAL_REPORT': 'WI',
      'WITH_FINAL_REPORT': 'WF',
      'RESPONSE_REJECTED': 'RJ',
      // Post-Process
      'RELEASE': 'RL',
      'HOLD': 'HO',
      'CANCEL': 'CA',
      'CANCELLED': 'CA',
      'CLOSED': 'CL'
  };
  const upperStatus = (status || '').toUpperCase();
  const mapped = map[upperStatus];
  if (!mapped) return 'DR'; // Default
  return mapped;
};

export const mapStatusFromDB = (code: string): string => {
  const map: Record<string, string> = {
      'DR': 'DRAFT',
      'NW': 'NEW',
      'PL': 'PLANNED',
      'PD': 'PENDING',
      'PN': 'PENDING',
      'SU': 'SUBMITTED',
      'AA': 'AAPPROVAL',
      'CK': 'CHECKED',
      'FA': 'FAPPROVED',
      'EV': 'EVALUATION',
      'AP': 'APPROVED',
      'AW': 'APPROVED_WC',
      'RE': 'REJECTED',
      'RR': 'RAR',
      'IS': 'ISSUED',
      'FR': 'FR',
      'IR': 'IR',
      'RP': 'REPORT',
      'RW': 'RESPONSE_AWAITING',
      'RS': 'RESPONSE_SUBMITTED',
      'RA': 'RESPONSE_AWAIT_APPROVAL',
      'RC': 'RESPONSE_CHECKED',
      'RJ': 'RREJECTED',
      // QMQA Response Statuses
      'WI': 'WITH_INITIAL_REPORT',
      'WF': 'WITH_FINAL_REPORT',
      'RL': 'RELEASE',
      'HO': 'HOLD',
      'CA': 'CANCEL',
      'CL': 'CLOSED'
  };
  return map[code] || code;
};
