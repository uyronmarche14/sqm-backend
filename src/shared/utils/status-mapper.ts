export const mapStatusToDB = (status: string): string => {
  const map: Record<string, string> = {
      // Pre-Submission
      'DRAFT': 'DR',
      'NEW': 'NW',
      // Active Flow
      'PENDING': 'PN',
      'SUBMITTED': 'SU',
      'AAPPROVAL': 'AA',
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
      'RESPONSE_AWAIT_APPROVAL': 'RA',
      'RESPONSE_RECEIVED': 'RC',
      'RREJECTED': 'RJ',
      // Post-Process
      'RELEASE': 'RL',
      'HOLD': 'HO',
      'CANCEL': 'CA',
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
      'PD': 'PENDING',
      'PN': 'PENDING',
      'SU': 'SUBMITTED',
      'AA': 'AAPPROVAL',
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
      'RA': 'RESPONSE_AWAIT_APPROVAL',
      'RC': 'RESPONSE_RECEIVED',
      'RJ': 'RREJECTED',
      'RL': 'RELEASE',
      'HO': 'HOLD',
      'CA': 'CANCEL',
      'CL': 'CLOSED'
  };
  return map[code] || code;
};
