/**
 * Master Data CRUD Implementation Verification Script
 * 
 * This script verifies that all master data endpoints are properly implemented
 * with full CRUD functionality (Create, Read, Update, Delete).
 * 
 * Run with: npx ts-node src/db/seeds/verify_master_data_implementation.ts
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const TOKEN = process.env.TEST_TOKEN || '';

interface TestResult {
  endpoint: string;
  resource: string;
  get: boolean;
  post: boolean;
  put: boolean;
  delete: boolean;
  errors: string[];
}

const masterDataEndpoints = [
  // Core Lookups
  { name: 'Sites', path: 'sites', testData: { name: 'Test Site', code: 'TST', isActive: true } },
  { name: 'Suppliers', path: 'suppliers', testData: { name: 'Test Supplier', siteId: null, isActive: true } },
  { name: 'Roles', path: 'roles', testData: { name: 'Test Role', isActive: true } },
  { name: 'Products', path: 'products', testData: { name: 'Test Product', code: 'TST', siteId: null, isActive: true } },
  { name: 'Models', path: 'models', testData: { name: 'Test Model', code: 'TST', productId: null, siteId: null, isActive: true } },
  { name: 'Mfg Areas', path: 'mfg-areas', testData: { mfg_area_name: 'Test Area', active_flag: true } },
  
  // Defects & Quality
  { name: 'Defect Categories', path: 'defect-categories', testData: { name: 'Test Category', acronym: 'TST', isActive: true } },
  { name: 'Defects', path: 'defects', testData: { name: 'Test Defect', isActive: true } },
  { name: 'Defect Classes', path: 'defect-classes', testData: { name: 'Test Class', isActive: true } },
  { name: 'Dispositions', path: 'dispositions', testData: { name: 'Test Disposition', isActive: true } },
  { name: 'Severity', path: 'severity', testData: { name: 'Test Severity', isActive: true } },
  { name: 'AQL', path: 'aql', testData: { name: 'Test AQL', minor: '1.0', major: '1.5', siteId: null, isActive: true } },
  
  // Inspection
  { name: 'Inspection Categories', path: 'inspection-categories', testData: { name: 'Test Inspection Cat', isActive: true } },
  { name: 'Inspection Methods', path: 'inspection-methods', testData: { name: 'Test Method', defaultTemp: 25, defaultHum: 50, isActive: true } },
  { name: 'Inspectors', path: 'inspectors', testData: { name: 'Test Inspector', isActive: true } },
  
  // Parts
  { name: 'Part Classes', path: 'parts', testData: { name: 'Test Part Class', siteId: null, isActive: true } },
  { name: 'Part Types', path: 'part-types', testData: { name: 'Test Part Type', code: 'TST', isActive: true } },
  { name: 'Part Data Categories', path: 'part-data-categories', testData: { name: 'Test Data Cat', parentId: null, isActive: true } },
  { name: 'Part Dim Categories', path: 'part-dim-categories', testData: { name: 'Test Dim Cat', parentId: null, isActive: true } },
  { name: 'Part Noise Categories', path: 'part-noise-categories', testData: { name: 'Test Noise Cat', parentId: null, isActive: true } },
  { name: 'Parts Catalog', path: 'parts-catalog', testData: { code: 'TST-001', name: 'Test Part', siteId: null, active_flag: true } },
  
  // MNR
  { name: 'MNR Types', path: 'mnr-types', testData: { mnrtype_name: 'Test MNR Type', active_flag: true } },
  
  // Forms & Security
  { name: 'Forms', path: 'forms', testData: { name: 'Test Form', url: '/test', isActive: true } },
  { name: 'Role Access', path: 'role-access', testData: { roleId: 'test-role', formId: 'test-form', permissions: {}, isActive: true } },
  
  // Suppliers Extended
  { name: 'Supplier Incharges', path: 'supplier-incharges', testData: { supplierId: 'test-sup', userId: 'test-user', isActive: true } },
  { name: 'Supplier Information', path: 'supplier-information', testData: { supplierId: 'test-sup', firstName: 'Test', lastName: 'User', isActive: true } },
  
  // Audit & QMS
  { name: 'Audit Categories', path: 'audit-categories', testData: { name: 'Test Audit Cat', code: 'TST', withRating: true, withAuditees: true, withAuditors: true, withAttendees: false, withAuditPlan: true, isActive: true } },
  { name: 'Audit Types', path: 'audit-types', testData: { name: 'Test Audit Type', categoryId: null, isActive: true } },
  { name: 'Criterias', path: 'criterias', testData: { name: 'Test Criteria', isActive: true } },
  { name: '5M1E Categories', path: 'five-m1e-categories', testData: { name: 'Test 5M1E', partClassId: null, isActive: true } },
  { name: 'Registrations', path: 'registrations', testData: { confirmationCode: 'TEST123', userId: 'test-user', isActive: true } },
  
  // Admin
  { name: 'FAQ Items', path: 'faq', testData: { question: 'Test Question?', answer: 'Test Answer', active_flag: true } },
  { name: 'Certifications', path: 'certifications', testData: { certification_name: 'Test Cert', active_flag: true } },
  { name: 'Groups', path: 'groups', testData: { group_name: 'Test Group', active_flag: true } },
  { name: 'Training Programs', path: 'training-programs', testData: { training_program_name: 'Test Training', active_flag: true } },
  { name: 'Messages', path: 'messages', testData: { key_name: 'test_key', value: 'test value', active_flag: true } },
];

class MasterDataVerifier {
  private results: TestResult[] = [];
  private headers: any;

  constructor(token: string) {
    this.headers = token ? { Authorization: `Bearer ${token}` } : {};
  }

  async verifyEndpoint(endpoint: { name: string; path: string; testData: any }): Promise<TestResult> {
    const result: TestResult = {
      endpoint: endpoint.name,
      resource: endpoint.path,
      get: false,
      post: false,
      put: false,
      delete: false,
      errors: []
    };

    const url = `${BASE_URL}/master/${endpoint.path}`;
    let createdId: string | null = null;

    try {
      // Test GET (List All)
      console.log(`\n[${endpoint.name}] Testing GET ${url}`);
      const getResponse = await axios.get(url, { headers: this.headers });
      if (getResponse.status === 200 && Array.isArray(getResponse.data)) {
        result.get = true;
        console.log(`  ✓ GET successful (${getResponse.data.length} records)`);
      }
    } catch (error: any) {
      result.errors.push(`GET failed: ${error.response?.status} - ${error.message}`);
      console.log(`  ✗ GET failed: ${error.response?.status}`);
    }

    try {
      // Test POST (Create)
      console.log(`[${endpoint.name}] Testing POST ${url}`);
      const postResponse = await axios.post(url, endpoint.testData, { headers: this.headers });
      if (postResponse.status === 201 && postResponse.data.id) {
        result.post = true;
        createdId = postResponse.data.id;
        console.log(`  ✓ POST successful (ID: ${createdId})`);
      }
    } catch (error: any) {
      result.errors.push(`POST failed: ${error.response?.status} - ${error.message}`);
      console.log(`  ✗ POST failed: ${error.response?.status}`);
    }

    if (createdId) {
      try {
        // Test PUT (Update)
        console.log(`[${endpoint.name}] Testing PUT ${url}/${createdId}`);
        const updateData = { ...endpoint.testData, name: endpoint.testData.name ? endpoint.testData.name + ' Updated' : undefined };
        const putResponse = await axios.put(`${url}/${createdId}`, updateData, { headers: this.headers });
        if (putResponse.status === 200) {
          result.put = true;
          console.log(`  ✓ PUT successful`);
        }
      } catch (error: any) {
        result.errors.push(`PUT failed: ${error.response?.status} - ${error.message}`);
        console.log(`  ✗ PUT failed: ${error.response?.status}`);
      }

      try {
        // Test DELETE
        console.log(`[${endpoint.name}] Testing DELETE ${url}/${createdId}`);
        const deleteResponse = await axios.delete(`${url}/${createdId}`, { headers: this.headers });
        if (deleteResponse.status === 200) {
          result.delete = true;
          console.log(`  ✓ DELETE successful`);
        }
      } catch (error: any) {
        result.errors.push(`DELETE failed: ${error.response?.status} - ${error.message}`);
        console.log(`  ✗ DELETE failed: ${error.response?.status}`);
      }
    }

    return result;
  }

  async verifyAll(): Promise<void> {
    console.log('='.repeat(80));
    console.log('MASTER DATA CRUD VERIFICATION');
    console.log('='.repeat(80));
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Token: ${TOKEN ? 'Provided' : 'Not provided (may fail auth checks)'}`);
    console.log('='.repeat(80));

    for (const endpoint of masterDataEndpoints) {
      const result = await this.verifyEndpoint(endpoint);
      this.results.push(result);
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.printSummary();
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(80));

    const passed = this.results.filter(r => r.get && r.post && r.put && r.delete);
    const failed = this.results.filter(r => !(r.get && r.post && r.put && r.delete));

    console.log(`\nTotal Endpoints: ${this.results.length}`);
    console.log(`Fully Working: ${passed.length} ✓`);
    console.log(`Issues Found: ${failed.length} ✗`);

    if (failed.length > 0) {
      console.log('\n' + '-'.repeat(80));
      console.log('ENDPOINTS WITH ISSUES:');
      console.log('-'.repeat(80));
      
      failed.forEach(result => {
        console.log(`\n${result.endpoint} (${result.resource}):`);
        console.log(`  GET: ${result.get ? '✓' : '✗'}`);
        console.log(`  POST: ${result.post ? '✓' : '✗'}`);
        console.log(`  PUT: ${result.put ? '✓' : '✗'}`);
        console.log(`  DELETE: ${result.delete ? '✓' : '✗'}`);
        
        if (result.errors.length > 0) {
          console.log(`  Errors:`);
          result.errors.forEach(err => console.log(`    - ${err}`));
        }
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('DETAILED RESULTS BY CATEGORY:');
    console.log('='.repeat(80));

    const categories = {
      'Core Lookups': ['sites', 'suppliers', 'roles', 'products', 'models', 'mfg-areas'],
      'Defects & Quality': ['defect-categories', 'defects', 'defect-classes', 'dispositions', 'severity', 'aql'],
      'Inspection': ['inspection-categories', 'inspection-methods', 'inspectors'],
      'Parts': ['parts', 'part-types', 'part-data-categories', 'part-dim-categories', 'part-noise-categories', 'parts-catalog'],
      'MNR': ['mnr-types'],
      'Forms & Security': ['forms', 'role-access'],
      'Suppliers Extended': ['supplier-incharges', 'supplier-information'],
      'Audit & QMS': ['audit-categories', 'audit-types', 'criterias', 'five-m1e-categories', 'registrations'],
      'Admin': ['faq', 'certifications', 'groups', 'training-programs', 'messages']
    };

    Object.entries(categories).forEach(([category, paths]) => {
      console.log(`\n${category}:`);
      const categoryResults = this.results.filter(r => paths.includes(r.resource));
      const categoryPassed = categoryResults.filter(r => r.get && r.post && r.put && r.delete).length;
      console.log(`  ${categoryPassed}/${categoryResults.length} endpoints fully working`);
      
      categoryResults.forEach(r => {
        const status = (r.get && r.post && r.put && r.delete) ? '✓' : '✗';
        console.log(`    ${status} ${r.endpoint}`);
      });
    });

    console.log('\n' + '='.repeat(80));
  }
}

// Run verification
async function main() {
  if (!TOKEN) {
    console.warn('\n⚠️  WARNING: No authentication token provided!');
    console.warn('Set TEST_TOKEN environment variable to test authenticated endpoints.');
    console.warn('Example: TEST_TOKEN=your_token_here npm run verify-master-data\n');
  }

  const verifier = new MasterDataVerifier(TOKEN);
  await verifier.verifyAll();
}

main().catch(console.error);

export { MasterDataVerifier };
