import { fileURLToPath } from 'node:url';

import { db } from '../../shared/infrastructure/db.js';
import { logDb } from '../lib/db-safety.js';
import {
  ensureTables,
  isYes,
  mapRowsBy,
  requireSeedRow,
  upsertByMatch,
  upsertSeedRows,
  withSeedMetadata,
} from './helpers.js';
import {
  auditReferenceSeed,
  coreMasterReferenceSeed,
  inspectionReferenceSeed,
  partsCatalogReferenceSeed,
  qualityReferenceSeed,
  secondaryMaintenanceReferenceSeed,
} from './reference.seed.data.js';

function resolveSiteId(siteByCode: Map<string, Record<string, unknown>>, siteCode: string) {
  return String(requireSeedRow(siteByCode, siteCode, 'site').site_id);
}

function resolveProductId(productByCode: Map<string, Record<string, unknown>>, productCode: string) {
  return String(requireSeedRow(productByCode, productCode, 'product').product_id);
}

function resolveSupplierId(supplierByName: Map<string, Record<string, unknown>>, supplierName: string) {
  return String(requireSeedRow(supplierByName, supplierName, 'supplier').supplier_id);
}

function resolvePartClassId(partClassByName: Map<string, Record<string, unknown>>, partClassName: string) {
  return String(requireSeedRow(partClassByName, partClassName, 'part class').partclass_id);
}

function resolvePartTypeId(partTypeByCode: Map<string, Record<string, unknown>>, partTypeCode: string) {
  return String(requireSeedRow(partTypeByCode, partTypeCode, 'part type').parttype_id);
}

function resolveAqlId(aqlByName: Map<string, Record<string, unknown>>, aqlName: string) {
  return String(requireSeedRow(aqlByName, aqlName, 'AQL').aql_id);
}

function resolveSeverityId(severityByName: Map<string, Record<string, unknown>>, severityName: string) {
  return String(requireSeedRow(severityByName, severityName, 'severity').severity_id);
}

function resolveDefectClassId(
  defectClassByName: Map<string, Record<string, unknown>>,
  defectClassName: string,
) {
  return String(requireSeedRow(defectClassByName, defectClassName, 'defect class').defectclass_id);
}

function resolvePartId(partByCode: Map<string, Record<string, unknown>>, partCode: string) {
  return String(requireSeedRow(partByCode, partCode, 'part').part_id);
}

function resolveAuditCategoryId(
  auditCategoryByCode: Map<string, Record<string, unknown>>,
  auditCategoryCode: string,
) {
  return String(requireSeedRow(auditCategoryByCode, auditCategoryCode, 'audit category').audit_category_id);
}

export async function runReferenceSeed(invocation = 'db:seed:reference') {
  if (!isYes(process.env.DB_REFERENCE_SEED)) {
    logDb(`${invocation}: skipped because DB_REFERENCE_SEED is not YES.`);
    return;
  }

  await ensureTables([
    'MFG_SITES',
    'SUPPLIERS',
    'PRODUCTS',
    'MODELS',
    'MFG_AREAS',
    'DEFECTCATEGORIES',
    'DEFECTS',
    'DEFECTCLASS',
    'DISPOSITIONS',
    'SEVERITY',
    'MNRTYPE',
    'INSPECTIONCATEGORIES',
    'INSPECTIONMETHODS',
    'INSPECTORS',
    'AQL',
    'AQLLEVEL',
    'AQLLEVELCLASS',
    'PARTCLASS',
    'PARTCLASSCATEGORIES',
    'PARTTYPES',
    'PARTDATACATEGORIES',
    'PARTDIMENSIONCATEGORIES',
    'PARTNOISECATEGORIES',
    'PARTS',
    'AUDITCATEGORY',
    'AUDITTYPE',
    'CRITERIAS',
    'SUPPLIER_INFORMATION',
    'CERTIFICATIONS',
    'GROUPS',
    'TRAINING_PROGRAMS',
    'FAQ_ITEM',
    'MESSAGE_INFO',
    'CUSTOMER',
    'NEWS',
  ]);

  const now = new Date();

  const sites = await upsertSeedRows({
    table: 'MFG_SITES',
    matchOn: ['site_code'],
    preserveOnUpdate: ['site_id'],
    rows: coreMasterReferenceSeed.sites.map((site) => withSeedMetadata(site, now)),
  });
  const siteByCode = mapRowsBy(sites, 'site_code');

  const suppliers = await upsertSeedRows({
    table: 'SUPPLIERS',
    matchOn: ['supplier_name'],
    preserveOnUpdate: ['supplier_id'],
    rows: coreMasterReferenceSeed.suppliers.map(({ site_code, ...supplier }) =>
      withSeedMetadata(
        {
          ...supplier,
          site_id: resolveSiteId(siteByCode, site_code),
        },
        now,
      ),
    ),
  });
  const supplierByName = mapRowsBy(suppliers, 'supplier_name');

  const products = await upsertSeedRows({
    table: 'PRODUCTS',
    matchOn: ['product_code'],
    preserveOnUpdate: ['product_id'],
    rows: coreMasterReferenceSeed.products.map(({ site_code, ...product }) =>
      withSeedMetadata(
        {
          ...product,
          site_id: resolveSiteId(siteByCode, site_code),
        },
        now,
      ),
    ),
  });
  const productByCode = mapRowsBy(products, 'product_code');

  const models = await upsertSeedRows({
    table: 'MODELS',
    matchOn: ['model_no'],
    preserveOnUpdate: ['model_id'],
    rows: coreMasterReferenceSeed.models.map(({ product_code, site_code, ...model }) =>
      withSeedMetadata(
        {
          ...model,
          product_id: resolveProductId(productByCode, product_code),
          site_id: resolveSiteId(siteByCode, site_code),
        },
        now,
      ),
    ),
  });

  const mfgAreas = await upsertSeedRows({
    table: 'MFG_AREAS',
    matchOn: ['mfg_area_name'],
    preserveOnUpdate: ['mfg_area_id'],
    rows: coreMasterReferenceSeed.mfgAreas.map((area) => withSeedMetadata(area, now)),
  });

  const defectCategories = await upsertSeedRows({
    table: 'DEFECTCATEGORIES',
    matchOn: ['defectcategory_name'],
    preserveOnUpdate: ['defectcategory_id'],
    rows: qualityReferenceSeed.defectCategories.map((row) => withSeedMetadata(row, now)),
  });

  const defects = await upsertSeedRows({
    table: 'DEFECTS',
    matchOn: ['defect_name'],
    preserveOnUpdate: ['defect_id'],
    rows: qualityReferenceSeed.defects.map((row) => withSeedMetadata(row, now)),
  });

  const defectClasses = await upsertSeedRows({
    table: 'DEFECTCLASS',
    matchOn: ['defectclass_name'],
    preserveOnUpdate: ['defectclass_id'],
    rows: qualityReferenceSeed.defectClasses.map((row) => withSeedMetadata(row, now)),
  });
  const defectClassByName = mapRowsBy(defectClasses, 'defectclass_name');

  const dispositions = await upsertSeedRows({
    table: 'DISPOSITIONS',
    matchOn: ['disposition_name'],
    preserveOnUpdate: ['disposition_id'],
    rows: qualityReferenceSeed.dispositions.map((row) => withSeedMetadata(row, now)),
  });

  const severities = await upsertSeedRows({
    table: 'SEVERITY',
    matchOn: ['severity_name'],
    preserveOnUpdate: ['severity_id'],
    rows: qualityReferenceSeed.severities.map((row) => withSeedMetadata(row, now)),
  });
  const severityByName = mapRowsBy(severities, 'severity_name');

  const mnrTypes = await upsertSeedRows({
    table: 'MNRTYPE',
    matchOn: ['mnrtype_name'],
    preserveOnUpdate: ['mnrtype_id'],
    rows: qualityReferenceSeed.mnrTypes.map((row) => withSeedMetadata(row, now)),
  });

  const inspectionCategories = await upsertSeedRows({
    table: 'INSPECTIONCATEGORIES',
    matchOn: ['inspectioncat_name'],
    preserveOnUpdate: ['inspectioncat_id'],
    rows: inspectionReferenceSeed.inspectionCategories.map((row) => withSeedMetadata(row, now)),
  });

  const inspectionMethods = await upsertSeedRows({
    table: 'INSPECTIONMETHODS',
    matchOn: ['inspectionmethod_name'],
    preserveOnUpdate: ['inspectionmethod_id'],
    rows: inspectionReferenceSeed.inspectionMethods.map((row) => withSeedMetadata(row, now)),
  });

  const inspectors = await upsertSeedRows({
    table: 'INSPECTORS',
    matchOn: ['inspector_name'],
    preserveOnUpdate: ['inspector_id'],
    rows: inspectionReferenceSeed.inspectors.map((row) => withSeedMetadata(row, now)),
  });

  const aqls = await upsertSeedRows({
    table: 'AQL',
    matchOn: ['aql_name', 'site_id'],
    preserveOnUpdate: ['aql_id'],
    rows: inspectionReferenceSeed.aqls.map(({ site_code, ...aql }) =>
      withSeedMetadata(
        {
          ...aql,
          site_id: resolveSiteId(siteByCode, site_code),
          creation_date: now,
        },
        now,
      ),
    ),
  });
  const aqlByName = mapRowsBy(aqls, 'aql_name');

  const aqlLevelByKey = new Map<string, Record<string, unknown>>();
  for (const level of inspectionReferenceSeed.aqlLevels) {
    const aqlLevel = await upsertByMatch({
      table: 'AQLLEVEL',
      matchOn: ['aql_id', 'severity_id'],
      preserveOnUpdate: ['aqllevel_id'],
      row: withSeedMetadata(
        {
          aqllevel_id: level.aqllevel_id,
          aql_id: resolveAqlId(aqlByName, level.aql_name),
          severity_id: resolveSeverityId(severityByName, level.severity_name),
          lot_size_min: level.lot_size_min,
          lot_size_max: level.lot_size_max,
        },
        now,
      ),
    });

    aqlLevelByKey.set(`${level.aql_name}::${level.severity_name}`, aqlLevel);
  }

  for (const level of inspectionReferenceSeed.aqlLevels) {
    const aqlLevel = requireSeedRow(
      aqlLevelByKey,
      `${level.aql_name}::${level.severity_name}`,
      'AQL level',
    );

    for (const sampling of inspectionReferenceSeed.aqlLevelClasses) {
      await upsertByMatch({
        table: 'AQLLEVELCLASS',
        matchOn: ['aqllevel_id', 'defectclass_id'],
        preserveOnUpdate: ['aqllevelclass_id'],
        row: {
          aqllevelclass_id: `${String(aqlLevel.aqllevel_id)}-${sampling.defectclass_name}`.slice(0, 36),
          aqllevel_id: String(aqlLevel.aqllevel_id),
          defectclass_id: resolveDefectClassId(defectClassByName, sampling.defectclass_name),
          samplesize: sampling.samplesize,
          accept: sampling.accept,
          reject: sampling.reject,
        },
      });
    }
  }

  const partClasses = await upsertSeedRows({
    table: 'PARTCLASS',
    matchOn: ['partclass_name', 'site_id'],
    preserveOnUpdate: ['partclass_id'],
    rows: partsCatalogReferenceSeed.partClasses.map(({ site_code, ...partClass }) =>
      withSeedMetadata(
        {
          ...partClass,
          site_id: resolveSiteId(siteByCode, site_code),
        },
        now,
      ),
    ),
  });
  const partClassByName = mapRowsBy(partClasses, 'partclass_name');

  const partTypes = await upsertSeedRows({
    table: 'PARTTYPES',
    matchOn: ['parttype_code'],
    preserveOnUpdate: ['parttype_id'],
    rows: partsCatalogReferenceSeed.partTypes.map((row) => withSeedMetadata(row, now)),
  });
  const partTypeByCode = mapRowsBy(partTypes, 'parttype_code');

  const parts = await upsertSeedRows({
    table: 'PARTS',
    matchOn: ['part_code'],
    preserveOnUpdate: ['part_id'],
    rows: partsCatalogReferenceSeed.parts.map(
      ({ site_code, partclass_name, parttype_code, aql_name, ...part }) => ({
        ...withSeedMetadata(part, now),
        site_id: resolveSiteId(siteByCode, site_code),
        partclass_id: resolvePartClassId(partClassByName, partclass_name),
        parttype_id: resolvePartTypeId(partTypeByCode, parttype_code),
        aql_id: resolveAqlId(aqlByName, aql_name),
      }),
    ),
  });
  const partByCode = mapRowsBy(parts, 'part_code');

  const partClassCategories = await upsertSeedRows({
    table: 'PARTCLASSCATEGORIES',
    matchOn: ['Category_name', 'Partclass_id'],
    preserveOnUpdate: ['Category_ID'],
    rows: partsCatalogReferenceSeed.partClassCategories.map(({ partclass_name, ...category }) => ({
      ...withSeedMetadata(category, now),
      Partclass_id: resolvePartClassId(partClassByName, partclass_name),
    })),
  });

  const partDataCategories = await upsertSeedRows({
    table: 'PARTDATACATEGORIES',
    matchOn: ['partdatacategory_name', 'part_id'],
    preserveOnUpdate: ['partdatacategory_id'],
    rows: partsCatalogReferenceSeed.partDataCategories.map(({ part_code, ...category }) =>
      withSeedMetadata(
        {
          ...category,
          part_id: resolvePartId(partByCode, part_code),
        },
        now,
      ),
    ),
  });

  const partDimensionCategories = await upsertSeedRows({
    table: 'PARTDIMENSIONCATEGORIES',
    matchOn: ['partdimensioncategory_name', 'part_id'],
    preserveOnUpdate: ['partdimensioncategory_id'],
    rows: partsCatalogReferenceSeed.partDimensionCategories.map(({ part_code, ...category }) =>
      withSeedMetadata(
        {
          ...category,
          part_id: resolvePartId(partByCode, part_code),
        },
        now,
      ),
    ),
  });

  const partNoiseCategories = await upsertSeedRows({
    table: 'PARTNOISECATEGORIES',
    matchOn: ['partnoisecategory_name', 'part_id'],
    preserveOnUpdate: ['partnoisecategory_id'],
    rows: partsCatalogReferenceSeed.partNoiseCategories.map(({ part_code, ...category }) =>
      withSeedMetadata(
        {
          ...category,
          part_id: resolvePartId(partByCode, part_code),
        },
        now,
      ),
    ),
  });

  const auditCategories = await upsertSeedRows({
    table: 'AUDITCATEGORY',
    matchOn: ['audit_category_code'],
    preserveOnUpdate: ['audit_category_id'],
    rows: auditReferenceSeed.categories.map((row) => withSeedMetadata(row, now)),
  });
  const auditCategoryByCode = mapRowsBy(auditCategories, 'audit_category_code');

  const auditTypes = await upsertSeedRows({
    table: 'AUDITTYPE',
    matchOn: ['audit_type_name', 'audit_category_id'],
    preserveOnUpdate: ['audit_type_id'],
    rows: auditReferenceSeed.types.map(({ audit_category_code, ...auditType }) =>
      withSeedMetadata(
        {
          ...auditType,
          audit_category_id: resolveAuditCategoryId(auditCategoryByCode, audit_category_code),
        },
        now,
      ),
    ),
  });

  const criterias = await upsertSeedRows({
    table: 'CRITERIAS',
    matchOn: ['criteria_name'],
    preserveOnUpdate: ['criteria_id'],
    rows: auditReferenceSeed.criterias.map((row) => withSeedMetadata(row, now)),
  });

  const supplierInformation = await upsertSeedRows({
    table: 'SUPPLIER_INFORMATION',
    matchOn: ['supplier_id', 'first_name', 'last_name'],
    preserveOnUpdate: ['supplier_information_id'],
    rows: secondaryMaintenanceReferenceSeed.supplierInformation.map(({ supplier_name, ...contact }) =>
      withSeedMetadata(
        {
          ...contact,
          supplier_id: resolveSupplierId(supplierByName, supplier_name),
        },
        now,
      ),
    ),
  });

  const certifications = await upsertSeedRows({
    table: 'CERTIFICATIONS',
    matchOn: ['certification_name'],
    preserveOnUpdate: ['certification_id'],
    rows: secondaryMaintenanceReferenceSeed.certifications.map((row) => withSeedMetadata(row, now)),
  });

  const groups = await upsertSeedRows({
    table: 'GROUPS',
    matchOn: ['group_name'],
    preserveOnUpdate: ['group_id'],
    rows: secondaryMaintenanceReferenceSeed.groups.map((row) => withSeedMetadata(row, now)),
  });

  const trainingPrograms = await upsertSeedRows({
    table: 'TRAINING_PROGRAMS',
    matchOn: ['training_program_name'],
    preserveOnUpdate: ['training_program_id'],
    rows: secondaryMaintenanceReferenceSeed.trainingPrograms.map((row) => withSeedMetadata(row, now)),
  });

  const faqItems = await upsertSeedRows({
    table: 'FAQ_ITEM',
    matchOn: ['sequence'],
    preserveOnUpdate: ['faq_item_id'],
    rows: secondaryMaintenanceReferenceSeed.faqItems.map((row) => withSeedMetadata(row, now)),
  });

  const messageInfo = await upsertSeedRows({
    table: 'MESSAGE_INFO',
    matchOn: ['key_name'],
    preserveOnUpdate: ['messageinfo_id'],
    rows: secondaryMaintenanceReferenceSeed.messageInfo.map((row) => withSeedMetadata(row, now)),
  });

  const customers = await upsertSeedRows({
    table: 'CUSTOMER',
    matchOn: ['customer_name'],
    preserveOnUpdate: ['customer_id'],
    rows: secondaryMaintenanceReferenceSeed.customers.map((row) => withSeedMetadata(row, now)),
  });

  const newsItems = await upsertSeedRows({
    table: 'NEWS',
    matchOn: ['news_name'],
    preserveOnUpdate: ['news_id'],
    rows: secondaryMaintenanceReferenceSeed.newsItems.map((row) => withSeedMetadata(row, now)),
  });

  logDb(
    `${invocation}: reference seed complete ` +
      `(sites=${sites.length}, suppliers=${suppliers.length}, products=${products.length}, ` +
      `models=${models.length}, mfgAreas=${mfgAreas.length}, defectCategories=${defectCategories.length}, ` +
      `defects=${defects.length}, dispositions=${dispositions.length}, mnrTypes=${mnrTypes.length}, ` +
      `inspectionCategories=${inspectionCategories.length}, inspectionMethods=${inspectionMethods.length}, ` +
      `inspectors=${inspectors.length}, parts=${parts.length}, partClassCategories=${partClassCategories.length}, ` +
      `partDataCategories=${partDataCategories.length}, partDimensionCategories=${partDimensionCategories.length}, ` +
      `partNoiseCategories=${partNoiseCategories.length}, auditTypes=${auditTypes.length}, criteria=${criterias.length}, ` +
      `supplierInformation=${supplierInformation.length}, certifications=${certifications.length}, groups=${groups.length}, ` +
      `trainingPrograms=${trainingPrograms.length}, faqItems=${faqItems.length}, messages=${messageInfo.length}, ` +
      `customers=${customers.length}, news=${newsItems.length}).`,
  );
}

const isDirectInvocation = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  runReferenceSeed()
    .then(async () => {
      await db.destroy();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('[db] Reference seed failed:', error);
      await db.destroy();
      process.exit(1);
    });
}
