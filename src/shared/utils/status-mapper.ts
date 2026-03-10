export const mapStatusToDB = (status: string): string => {
  const map: Record<string, string> = {
      // Pre-Submission
      'DRAFT': 'DR',
      'NEW': 'NW',
      'PLANNED': 'PL',
      // Active Flow
      'SUBMITTED': 'SU', //5m1e and Ogi 

      // 1st cycle awaiting approval in awaiting approval menu of all module except the ogi
      'AWAITING_APPROVAL': 'AA',  // 1st cycle awaiting approval
      'AWAITING_CHECKED': 'CK', // 1st cycle awaiting checked
      // Evaluation
      // Final Stages
      'APPROVED': 'AP',
      'APPROVED_WC': 'AW',
      'REJECTED': 'RE',
      'REJECTED_AND_RETURNED': 'RR',
      // MNR Specific
      'ISSUED': 'IS',
      'REPORT': 'RP',
      'RESPONSE_': 'RW',
      'RESPONSE_WITH_INITIAL_REPORT': 'WI', 
      'RESPONSE_WITH_FINAL_REPORT': 'WF', 
      'RESPONSE_REJECTED': 'RJ',

      // this are all filtered in just oine place the mnr qmqa and the sqmplan response awaiting approval menu
      'RESPONSE_AWAITING_CHECKED': 'RC', //2nd cycle awaiting checked
      'RESPONSE_AWAITING_APPROVED': 'RA', //2nd cycle awaiting approval
      'CLOSED': 'CL',

      // Post-Process
      'RELEASE': 'RL',
      'CANCELLED': 'CA',
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
      'RRJ': 'RESPONSE_REJECTED', // Alias support or ensure logic handles it
      // QMQA Response Statuses
      'WI': 'WITH_INITIAL_REPORT',
      'WF': 'WITH_FINAL_REPORT',
      'RL': 'RELEASE',
      'HO': 'HOLD',
      'CA': 'CANCEL',
      'CC': 'CANCELLED', // Alias if needed or just CA
      'CL': 'CLOSED'
  };
  return map[code] || code;
};
