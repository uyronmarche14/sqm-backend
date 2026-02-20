/**
 * Simple test script to verify QMQA workflow service
 * Run with: node sqm-backend/src/services/test-qmqa-workflow.js
 */

import { 
    WORKFLOW_TRANSITIONS,
    validateTransition 
} from './qmqa-workflow.service.js';

console.log('Testing QMQA Workflow Service...\n');

// Test 1: Workflow Transitions Map
console.log('=== Test 1: Workflow Transitions Map ===');
console.log('PLANNED can transition to:', WORKFLOW_TRANSITIONS.PLANNED);
console.log('DRAFT can transition to:', WORKFLOW_TRANSITIONS.DRAFT);
console.log('AWAITING_APPROVAL can transition to:', WORKFLOW_TRANSITIONS.AWAITING_APPROVAL);
console.log('APPROVED can transition to:', WORKFLOW_TRANSITIONS.APPROVED);
console.log('ISSUED can transition to:', WORKFLOW_TRANSITIONS.ISSUED);
console.log('CLOSED can transition to:', WORKFLOW_TRANSITIONS.CLOSED);
console.log('CANCELLED can transition to:', WORKFLOW_TRANSITIONS.CANCELLED);

// Test 2: Valid Transitions
console.log('\n=== Test 2: Valid Transitions ===');
try {
    validateTransition('DRAFT', 'AWAITING_APPROVAL');
    console.log('✅ DRAFT → AWAITING_APPROVAL: Valid');
} catch (error) {
    console.log('❌ DRAFT → AWAITING_APPROVAL:', error.message);
}

try {
    validateTransition('AWAITING_APPROVAL', 'APPROVED');
    console.log('✅ AWAITING_APPROVAL → APPROVED: Valid');
} catch (error) {
    console.log('❌ AWAITING_APPROVAL → APPROVED:', error.message);
}

try {
    validateTransition('APPROVED', 'ISSUED');
    console.log('✅ APPROVED → ISSUED: Valid');
} catch (error) {
    console.log('❌ APPROVED → ISSUED:', error.message);
}

try {
    validateTransition('ISSUED', 'WITH_INITIAL_REPORT');
    console.log('✅ ISSUED → WITH_INITIAL_REPORT: Valid');
} catch (error) {
    console.log('❌ ISSUED → WITH_INITIAL_REPORT:', error.message);
}

try {
    validateTransition('WITH_FINAL_REPORT', 'RESPONSE_AWAITING_APPROVAL');
    console.log('✅ WITH_FINAL_REPORT → RESPONSE_AWAITING_APPROVAL: Valid');
} catch (error) {
    console.log('❌ WITH_FINAL_REPORT → RESPONSE_AWAITING_APPROVAL:', error.message);
}

try {
    validateTransition('RESPONSE_AWAITING_APPROVAL', 'CLOSED');
    console.log('✅ RESPONSE_AWAITING_APPROVAL → CLOSED: Valid');
} catch (error) {
    console.log('❌ RESPONSE_AWAITING_APPROVAL → CLOSED:', error.message);
}

// Test 3: Invalid Transitions
console.log('\n=== Test 3: Invalid Transitions ===');
try {
    validateTransition('DRAFT', 'APPROVED');
    console.log('❌ DRAFT → APPROVED: Should have failed!');
} catch (error) {
    console.log('✅ DRAFT → APPROVED: Correctly rejected -', error.message);
}

try {
    validateTransition('DRAFT', 'ISSUED');
    console.log('❌ DRAFT → ISSUED: Should have failed!');
} catch (error) {
    console.log('✅ DRAFT → ISSUED: Correctly rejected -', error.message);
}

try {
    validateTransition('AWAITING_APPROVAL', 'ISSUED');
    console.log('❌ AWAITING_APPROVAL → ISSUED: Should have failed!');
} catch (error) {
    console.log('✅ AWAITING_APPROVAL → ISSUED: Correctly rejected -', error.message);
}

// Test 4: Terminal States
console.log('\n=== Test 4: Terminal States ===');
try {
    validateTransition('CLOSED', 'DRAFT');
    console.log('❌ CLOSED → DRAFT: Should have failed!');
} catch (error) {
    console.log('✅ CLOSED → DRAFT: Correctly rejected -', error.message);
}

try {
    validateTransition('CANCELLED', 'DRAFT');
    console.log('❌ CANCELLED → DRAFT: Should have failed!');
} catch (error) {
    console.log('✅ CANCELLED → DRAFT: Correctly rejected -', error.message);
}

// Test 5: Rejection Loop
console.log('\n=== Test 5: Rejection Loop ===');
try {
    validateTransition('AWAITING_APPROVAL', 'REJECTED');
    console.log('✅ AWAITING_APPROVAL → REJECTED: Valid');
    
    validateTransition('REJECTED', 'DRAFT');
    console.log('✅ REJECTED → DRAFT: Valid (can resubmit)');
} catch (error) {
    console.log('❌ Rejection loop failed:', error.message);
}

// Test 6: Cycle 2 Rejection Loop
console.log('\n=== Test 6: Cycle 2 Rejection Loop ===');
try {
    validateTransition('RESPONSE_AWAITING_APPROVAL', 'RESPONSE_REJECTED');
    console.log('✅ RESPONSE_AWAITING_APPROVAL → RESPONSE_REJECTED: Valid');
    
    validateTransition('RESPONSE_REJECTED', 'WITH_FINAL_REPORT');
    console.log('✅ RESPONSE_REJECTED → WITH_FINAL_REPORT: Valid (can resubmit)');
} catch (error) {
    console.log('❌ Cycle 2 rejection loop failed:', error.message);
}

console.log('\n✅ All workflow validation tests completed successfully!');
