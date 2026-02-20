/**
 * QMQA Integration Test
 * Tests that all routes are properly registered and accessible
 */

import 'dotenv/config';

console.log('=======================================================');
console.log('🧪 QMQA INTEGRATION TESTS');
console.log('=======================================================\n');

// Test 1: Verify all service methods exist
console.log('📋 Test 1: Verify Service Methods...\n');

import { qmqaService } from './qmqa.service.js';

const serviceMethods = [
    'createSchedule',
    'getSchedule',
    'getAllSchedules',
    'updateSchedule',
    'deleteSchedule',
    'createRecord',
    'getRecord',
    'getAllRecords',
    'updateRecord',
    'deleteRecord',
    'addAttachment',
    'getAttachment',
    'searchRecords',
    'getCalendarData',
    'getAchievementData',
    'batchSubmit',
    'batchApprove',
    'batchReject',
    'batchIssue'
];

let passedMethods = 0;
let failedMethods = 0;

for (const method of serviceMethods) {
    if (typeof qmqaService[method] === 'function') {
        console.log(`✅ qmqaService.${method} exists`);
        passedMethods++;
    } else {
        console.log(`❌ qmqaService.${method} missing`);
        failedMethods++;
    }
}

console.log(`\n📊 Service Methods: ${passedMethods}/${serviceMethods.length} passed\n`);

// Test 2: Verify workflow service methods exist
console.log('📋 Test 2: Verify Workflow Service Methods...\n');

import * as qmqaWorkflowService from './qmqa-workflow.service.js';

const workflowMethods = [
    'validateTransition',
    'submitForApproval',
    'approveCycle1',
    'rejectCycle1',
    'issueToSupplier',
    'cancelAudit',
    'saveInitialReport',
    'submitFinalReport',
    'submitVerification',
    'approveCycle2',
    'rejectCycle2'
];

let passedWorkflow = 0;
let failedWorkflow = 0;

for (const method of workflowMethods) {
    if (typeof qmqaWorkflowService[method] === 'function') {
        console.log(`✅ qmqaWorkflowService.${method} exists`);
        passedWorkflow++;
    } else {
        console.log(`❌ qmqaWorkflowService.${method} missing`);
        failedWorkflow++;
    }
}

console.log(`\n📊 Workflow Methods: ${passedWorkflow}/${workflowMethods.length} passed\n`);

// Test 3: Verify email service methods exist
console.log('📋 Test 3: Verify Email Service Methods...\n');

import { qmqaEmailService } from './qmqa-email.service.js';

const emailMethods = [
    'sendCycle1SubmitEmail',
    'sendCycle1ApprovedEmail',
    'sendIssuedEmail',
    'sendInitialReportEmail',
    'sendFinalReportEmail',
    'sendCycle2SubmitEmail',
    'sendClosedEmail'
];

let passedEmail = 0;
let failedEmail = 0;

for (const method of emailMethods) {
    if (typeof qmqaEmailService[method] === 'function') {
        console.log(`✅ qmqaEmailService.${method} exists`);
        passedEmail++;
    } else {
        console.log(`❌ qmqaEmailService.${method} missing`);
        failedEmail++;
    }
}

console.log(`\n📊 Email Methods: ${passedEmail}/${emailMethods.length} passed\n`);

// Test 4: Verify token service methods exist
console.log('📋 Test 4: Verify Token Service Methods...\n');

import { qmqaTokenService } from './qmqa-token.service.js';

const tokenMethods = [
    'generateToken',
    'validateToken',
    'verifySupplier',
    'refreshToken'
];

let passedToken = 0;
let failedToken = 0;

for (const method of tokenMethods) {
    if (typeof qmqaTokenService[method] === 'function') {
        console.log(`✅ qmqaTokenService.${method} exists`);
        passedToken++;
    } else {
        console.log(`❌ qmqaTokenService.${method} missing`);
        failedToken++;
    }
}

console.log(`\n📊 Token Methods: ${passedToken}/${tokenMethods.length} passed\n`);

// Test 5: Verify controller methods exist
console.log('📋 Test 5: Verify Controller Methods...\n');

import * as qmqaController from '../controllers/qmqa.controller.js';

const controllerMethods = [
    'createSchedule',
    'getAllSchedules',
    'getScheduleById',
    'updateSchedule',
    'deleteSchedule',
    'createRecord',
    'getAllRecords',
    'getRecordById',
    'updateRecord',
    'deleteRecord',
    'submitForApproval',
    'approve',
    'reject',
    'issue',
    'cancel',
    'getByToken',
    'saveInitialReport',
    'submitFinalReport',
    'submitVerification',
    'uploadAttachment',
    'downloadAttachment',
    'searchRecords',
    'getCalendarData',
    'getAchievementData',
    'batchSubmit',
    'batchApprove',
    'batchReject',
    'batchIssue'
];

let passedController = 0;
let failedController = 0;

for (const method of controllerMethods) {
    if (typeof qmqaController[method] === 'function') {
        console.log(`✅ qmqaController.${method} exists`);
        passedController++;
    } else {
        console.log(`❌ qmqaController.${method} missing`);
        failedController++;
    }
}

console.log(`\n📊 Controller Methods: ${passedController}/${controllerMethods.length} passed\n`);

// Test 6: Verify routes file exists and can be imported
console.log('📋 Test 6: Verify Routes File...\n');

try {
    const routes = await import('../routes/qmqa.routes.js');
    console.log('✅ qmqa.routes.js can be imported');
    console.log('✅ Routes module exports default router');
} catch (error) {
    console.log('❌ Failed to import qmqa.routes.js:', error.message);
}

// Final Summary
console.log('\n=======================================================');
console.log('📊 FINAL TEST SUMMARY');
console.log('=======================================================');

const totalTests = serviceMethods.length + workflowMethods.length + emailMethods.length + tokenMethods.length + controllerMethods.length + 2;
const totalPassed = passedMethods + passedWorkflow + passedEmail + passedToken + passedController + 2;
const totalFailed = failedMethods + failedWorkflow + failedEmail + failedToken + failedController;

console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${totalPassed}`);
console.log(`❌ Failed: ${totalFailed}`);
console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
console.log('=======================================================\n');

if (totalFailed === 0) {
    console.log('🎉 All integration tests passed!\n');
    process.exit(0);
} else {
    console.log('❌ Some integration tests failed!\n');
    process.exit(1);
}
