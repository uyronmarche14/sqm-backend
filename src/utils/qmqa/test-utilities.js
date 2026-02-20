/**
 * Simple test script to verify QMQA utilities
 * Run with: node sqm-backend/src/utils/qmqa/test-utilities.js
 */

import { 
    validateControlNo, 
    extractYear, 
    isScheduleBased 
} from './control-no-generator.js';

import { 
    toDBStatus, 
    fromDBStatus, 
    isValidStatusCode,
    isValidStatusName,
    getStatusInfo 
} from './status-mapper.js';

import { 
    formatSchedule,
    formatRecord,
    formatSuccessResponse,
    formatErrorResponse,
    formatPaginationMeta
} from './response-formatter.js';

console.log('Testing QMQA Utilities...\n');

// Test Control Number Generator
console.log('=== Control Number Generator ===');
console.log('validateControlNo("P-2024-001"):', validateControlNo('P-2024-001'));
console.log('validateControlNo("2024-001"):', validateControlNo('2024-001'));
console.log('validateControlNo("invalid"):', validateControlNo('invalid'));
console.log('extractYear("P-2024-001"):', extractYear('P-2024-001'));
console.log('extractYear("2024-001"):', extractYear('2024-001'));
console.log('isScheduleBased("P-2024-001"):', isScheduleBased('P-2024-001'));
console.log('isScheduleBased("2024-001"):', isScheduleBased('2024-001'));

// Test Status Mapper
console.log('\n=== Status Mapper ===');
console.log('toDBStatus("DRAFT"):', toDBStatus('DRAFT'));
console.log('toDBStatus("AWAITING_APPROVAL"):', toDBStatus('AWAITING_APPROVAL'));
console.log('fromDBStatus("DR"):', fromDBStatus('DR'));
console.log('fromDBStatus("AW"):', fromDBStatus('AW'));
console.log('isValidStatusCode("DR"):', isValidStatusCode('DR'));
console.log('isValidStatusCode("XX"):', isValidStatusCode('XX'));
console.log('isValidStatusName("DRAFT"):', isValidStatusName('DRAFT'));
console.log('isValidStatusName("INVALID"):', isValidStatusName('INVALID'));
console.log('getStatusInfo("DR"):', JSON.stringify(getStatusInfo('DR'), null, 2));

// Test Response Formatter
console.log('\n=== Response Formatter ===');

const mockSchedule = {
    qmqa_audit_plan_id: 'test-id-123',
    control_no: 'P-2024-001',
    request_status: 'PL',
    created_date: new Date('2024-01-01'),
    audit_plan_date: new Date('2024-02-01'),
    site_id: 'site-1',
    site_name: 'Test Site',
    supplier_id: 'supp-1',
    supplier_name: 'Test Supplier',
    audit_category_id: 'cat-1',
    category_name: 'Quality Audit',
    sqe_pic_id: 'user-1',
    sqe_pic_name: 'John Doe',
    remarks: 'Test remarks',
    last_update: new Date('2024-01-01'),
    updateby: 'admin'
};

console.log('formatSchedule:', JSON.stringify(formatSchedule(mockSchedule), null, 2));

const successResponse = formatSuccessResponse({ id: 1, name: 'Test' });
console.log('\nformatSuccessResponse:', JSON.stringify(successResponse, null, 2));

const errorResponse = formatErrorResponse('Test error', { field: 'test' });
console.log('\nformatErrorResponse:', JSON.stringify(errorResponse, null, 2));

const paginationMeta = formatPaginationMeta(100, 2, 10);
console.log('\nformatPaginationMeta:', JSON.stringify(paginationMeta, null, 2));

console.log('\n✅ All utility tests completed successfully!');
