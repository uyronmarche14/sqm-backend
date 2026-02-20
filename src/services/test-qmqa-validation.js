/**
 * Test script for QMQA Service Validation Logic
 * Tests Task 5.3 - Validation of required fields, audit rating, dates, and foreign keys
 */

import { qmqaService } from './qmqa.service.js';
import db from '../config/db.js';

console.log('=======================================================');
console.log('🧪 QMQA SERVICE VALIDATION TESTS');
console.log('=======================================================\n');

const tests = {
    passed: 0,
    failed: 0,
    total: 0
};

const runTest = async (testName, testFn) => {
    tests.total++;
    try {
        await testFn();
        console.log(`✅ PASS: ${testName}`);
        tests.passed++;
    } catch (error) {
        console.log(`❌ FAIL: ${testName}`);
        console.log(`   Error: ${error.message}`);
        if (error.details) {
            console.log(`   Details:`, JSON.stringify(error.details, null, 2));
        }
        tests.failed++;
    }
};

const runTests = async () => {
    try {
        // Initialize database connection
        await db.getPool();
        console.log('✅ Database connected\n');

        // ==================== SCHEDULE VALIDATION TESTS ====================
        console.log('📋 Testing Schedule Validation...\n');

        await runTest('Schedule: Missing required field (site_id)', async () => {
            try {
                await qmqaService.createSchedule({
                    supplier_id: 'test-supplier',
                    audit_category_id: 'test-category',
                    audit_plan_date: '2026-03-15',
                    sqe_pic_id: 'test-user'
                    // Missing site_id
                }, 'test-user');
                throw new Error('Should have thrown validation error');
            } catch (error) {
                if (error.statusCode !== 400) throw error;
                if (!error.details?.some(d => d.field === 'site_id')) {
                    throw new Error('Should have site_id validation error');
                }
            }
        });

        await runTest('Schedule: Invalid date format', async () => {
            try {
                await qmqaService.createSchedule({
                    site_id: 'test-site',
                    supplier_id: 'test-supplier',
                    audit_category_id: 'test-category',
                    audit_plan_date: 'invalid-date',
                    sqe_pic_id: 'test-user'
                }, 'test-user');
                throw new Error('Should have thrown validation error');
            } catch (error) {
                if (error.statusCode !== 400) throw error;
                if (!error.details?.some(d => d.field === 'audit_plan_date')) {
                    throw new Error('Should have audit_plan_date validation error');
                }
            }
        });

        // ==================== AUDIT REPORT VALIDATION TESTS ====================
        console.log('\n📋 Testing Audit Report Validation...\n');

        await runTest('Audit Report: Missing required field (audit_type_id)', async () => {
            try {
                await qmqaService.createRecord({
                    from_schedule: false,
                    site_id: 'test-site',
                    supplier_id: 'test-supplier',
                    audit_category_id: 'test-category',
                    audit_plan_date: '2026-03-15',
                    sqe_pic_id: 'test-user',
                    audit_date: '2026-03-15',
                    checker_id: 'test-checker',
                    approver_id: 'test-approver'
                    // Missing audit_type_id
                }, 'test-user');
                throw new Error('Should have thrown validation error');
            } catch (error) {
                if (error.statusCode !== 400) throw error;
                if (!error.details?.some(d => d.field === 'audit_type_id')) {
                    throw new Error('Should have audit_type_id validation error');
                }
            }
        });

        await runTest('Audit Report: Invalid audit rating (negative)', async () => {
            try {
                await qmqaService.createRecord({
                    from_schedule: false,
                    site_id: 'test-site',
                    supplier_id: 'test-supplier',
                    audit_category_id: 'test-category',
                    audit_plan_date: '2026-03-15',
                    sqe_pic_id: 'test-user',
                    audit_type_id: 'test-type',
                    audit_date: '2026-03-15',
                    checker_id: 'test-checker',
                    approver_id: 'test-approver',
                    audit_rating: -10
                }, 'test-user');
                throw new Error('Should have thrown validation error');
            } catch (error) {
                if (error.statusCode !== 400) throw error;
                if (!error.details?.some(d => d.field === 'audit_rating')) {
                    throw new Error('Should have audit_rating validation error');
                }
            }
        });

        await runTest('Audit Report: Invalid audit rating (over 100)', async () => {
            try {
                await qmqaService.createRecord({
                    from_schedule: false,
                    site_id: 'test-site',
                    supplier_id: 'test-supplier',
                    audit_category_id: 'test-category',
                    audit_plan_date: '2026-03-15',
                    sqe_pic_id: 'test-user',
                    audit_type_id: 'test-type',
                    audit_date: '2026-03-15',
                    checker_id: 'test-checker',
                    approver_id: 'test-approver',
                    audit_rating: 150
                }, 'test-user');
                throw new Error('Should have thrown validation error');
            } catch (error) {
                if (error.statusCode !== 400) throw error;
                if (!error.details?.some(d => d.field === 'audit_rating')) {
                    throw new Error('Should have audit_rating validation error');
                }
            }
        });

        await runTest('Audit Report: Valid audit rating (0)', async () => {
            try {
                await qmqaService.createRecord({
                    from_schedule: false,
                    site_id: 'test-site',
                    supplier_id: 'test-supplier',
                    audit_category_id: 'test-category',
                    audit_plan_date: '2026-03-15',
                    sqe_pic_id: 'test-user',
                    audit_type_id: 'test-type',
                    audit_date: '2026-03-15',
                    checker_id: 'test-checker',
                    approver_id: 'test-approver',
                    audit_rating: 0
                }, 'test-user');
                throw new Error('Should have thrown foreign key validation error (expected)');
            } catch (error) {
                // Should fail on foreign key validation, not rating validation
                if (error.statusCode === 400 && error.details?.some(d => d.field === 'audit_rating')) {
                    throw new Error('Should NOT have audit_rating validation error for value 0');
                }
            }
        });

        await runTest('Audit Report: Valid audit rating (100)', async () => {
            try {
                await qmqaService.createRecord({
                    from_schedule: false,
                    site_id: 'test-site',
                    supplier_id: 'test-supplier',
                    audit_category_id: 'test-category',
                    audit_plan_date: '2026-03-15',
                    sqe_pic_id: 'test-user',
                    audit_type_id: 'test-type',
                    audit_date: '2026-03-15',
                    checker_id: 'test-checker',
                    approver_id: 'test-approver',
                    audit_rating: 100
                }, 'test-user');
                throw new Error('Should have thrown foreign key validation error (expected)');
            } catch (error) {
                // Should fail on foreign key validation, not rating validation
                if (error.statusCode === 400 && error.details?.some(d => d.field === 'audit_rating')) {
                    throw new Error('Should NOT have audit_rating validation error for value 100');
                }
            }
        });

        await runTest('Audit Report: Invalid date format (audit_date)', async () => {
            try {
                await qmqaService.createRecord({
                    from_schedule: false,
                    site_id: 'test-site',
                    supplier_id: 'test-supplier',
                    audit_category_id: 'test-category',
                    audit_plan_date: '2026-03-15',
                    sqe_pic_id: 'test-user',
                    audit_type_id: 'test-type',
                    audit_date: 'not-a-date',
                    checker_id: 'test-checker',
                    approver_id: 'test-approver'
                }, 'test-user');
                throw new Error('Should have thrown validation error');
            } catch (error) {
                if (error.statusCode !== 400) throw error;
                if (!error.details?.some(d => d.field === 'audit_date')) {
                    throw new Error('Should have audit_date validation error');
                }
            }
        });

        // ==================== UPDATE VALIDATION TESTS ====================
        console.log('\n📋 Testing Update Validation...\n');

        await runTest('Update: Invalid audit rating in update', async () => {
            try {
                await qmqaService.updateRecord('test-id', {
                    audit_rating: 200
                }, 'test-user');
                throw new Error('Should have thrown validation error');
            } catch (error) {
                if (error.statusCode !== 400) throw error;
                if (!error.details?.some(d => d.field === 'audit_rating')) {
                    throw new Error('Should have audit_rating validation error');
                }
            }
        });

        await runTest('Update: Invalid date format in update', async () => {
            try {
                await qmqaService.updateRecord('test-id', {
                    due_date: 'invalid-date'
                }, 'test-user');
                throw new Error('Should have thrown validation error');
            } catch (error) {
                if (error.statusCode !== 400) throw error;
                if (!error.details?.some(d => d.field === 'due_date')) {
                    throw new Error('Should have due_date validation error');
                }
            }
        });

        // ==================== SUMMARY ====================
        console.log('\n=======================================================');
        console.log('📊 TEST SUMMARY');
        console.log('=======================================================');
        console.log(`Total Tests: ${tests.total}`);
        console.log(`✅ Passed: ${tests.passed}`);
        console.log(`❌ Failed: ${tests.failed}`);
        console.log(`Success Rate: ${((tests.passed / tests.total) * 100).toFixed(1)}%`);
        console.log('=======================================================\n');

        if (tests.failed === 0) {
            console.log('🎉 All validation tests passed!\n');
        } else {
            console.log('⚠️  Some validation tests failed. Review the errors above.\n');
        }

    } catch (error) {
        console.error('❌ Test execution failed:', error);
    } finally {
        process.exit(tests.failed === 0 ? 0 : 1);
    }
};

// Run tests
runTests();
