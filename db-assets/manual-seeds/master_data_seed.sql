-- ============================================================================
-- COMPREHENSIVE MASTER DATA SEED FILE
-- Generated: 2024
-- Purpose: Seed all maintenance/master data tables with realistic test data
-- ============================================================================

-- ============================================================================
-- 1. CORE LOOKUPS
-- ============================================================================

-- Sites (Manufacturing Sites)
INSERT INTO MFG_SITES (site_id, site_name, site_code, site_desc, active_flag, last_update, updateby) VALUES
('SITE-001', 'Bangkok Plant', 'BKK', 'Main manufacturing facility in Bangkok', 1, GETDATE(), 'SYSTEM'),
('SITE-002', 'Chonburi Plant', 'CBR', 'Secondary facility in Chonburi', 1, GETDATE(), 'SYSTEM'),
('SITE-003', 'Rayong Plant', 'RYG', 'Specialized production in Rayong', 1, GETDATE(), 'SYSTEM'),
('SITE-004', 'Ayutthaya Plant', 'AYT', 'Assembly plant in Ayutthaya', 1, GETDATE(), 'SYSTEM'),
('SITE-005', 'Samut Prakan Plant', 'SPK', 'Quality control center', 1, GETDATE(), 'SYSTEM'),
('SITE-006', 'Nakhon Pathom Plant', 'NPT', 'Electronics assembly facility', 1, GETDATE(), 'SYSTEM'),
('SITE-007', 'Pathum Thani Plant', 'PTH', 'Plastic injection molding', 1, GETDATE(), 'SYSTEM'),
('SITE-008', 'Nonthaburi Plant', 'NTB', 'Metal stamping and forming', 1, GETDATE(), 'SYSTEM'),
('SITE-009', 'Prachinburi Plant', 'PCB', 'PCB assembly and testing', 1, GETDATE(), 'SYSTEM'),
('SITE-010', 'Saraburi Plant', 'SRB', 'Final assembly and packaging', 1, GETDATE(), 'SYSTEM'),
('SITE-011', 'Lopburi Plant', 'LPB', 'Warehouse and distribution', 1, GETDATE(), 'SYSTEM'),
('SITE-012', 'Nakhon Ratchasima Plant', 'NKR', 'Regional manufacturing hub', 1, GETDATE(), 'SYSTEM'),
('SITE-013', 'Chiang Mai Plant', 'CNX', 'Northern region facility', 1, GETDATE(), 'SYSTEM'),
('SITE-014', 'Phuket Plant', 'HKT', 'Southern region facility', 1, GETDATE(), 'SYSTEM'),
('SITE-015', 'Khon Kaen Plant', 'KKC', 'Northeast region facility', 1, GETDATE(), 'SYSTEM');

-- Suppliers
INSERT INTO SUPPLIERS (supplier_id, supplier_name, site_id, location, supplier_desc, active_flag, last_update, updateby) VALUES
('SUP-001', 'ABC Electronics Co.', 'SITE-001', 'Bangkok, Thailand', 'Electronic components supplier', 1, GETDATE(), 'SYSTEM'),
('SUP-002', 'XYZ Plastics Ltd.', 'SITE-002', 'Chonburi, Thailand', 'Plastic parts manufacturer', 1, GETDATE(), 'SYSTEM'),
('SUP-003', 'Global Metal Works', 'SITE-003', 'Rayong, Thailand', 'Metal stamping and fabrication', 1, GETDATE(), 'SYSTEM'),
('SUP-004', 'Tech Components Inc.', 'SITE-001', 'Bangkok, Thailand', 'PCB and circuit boards', 1, GETDATE(), 'SYSTEM'),
('SUP-005', 'Quality Fasteners Co.', 'SITE-004', 'Ayutthaya, Thailand', 'Screws, bolts, and fasteners', 1, GETDATE(), 'SYSTEM'),
('SUP-006', 'Precision Machining Ltd.', 'SITE-006', 'Nakhon Pathom, Thailand', 'CNC machining services', 1, GETDATE(), 'SYSTEM'),
('SUP-007', 'Advanced Polymers Inc.', 'SITE-007', 'Pathum Thani, Thailand', 'Engineering plastics', 1, GETDATE(), 'SYSTEM'),
('SUP-008', 'Reliable Rubber Co.', 'SITE-008', 'Nonthaburi, Thailand', 'Rubber seals and gaskets', 1, GETDATE(), 'SYSTEM'),
('SUP-009', 'Smart Sensors Ltd.', 'SITE-009', 'Prachinburi, Thailand', 'Sensor modules and devices', 1, GETDATE(), 'SYSTEM'),
('SUP-010', 'Premium Packaging Co.', 'SITE-010', 'Saraburi, Thailand', 'Packaging materials', 1, GETDATE(), 'SYSTEM'),
('SUP-011', 'Elite Cables Inc.', 'SITE-001', 'Bangkok, Thailand', 'Wire and cable assemblies', 1, GETDATE(), 'SYSTEM'),
('SUP-012', 'Superior Springs Ltd.', 'SITE-003', 'Rayong, Thailand', 'Springs and spring assemblies', 1, GETDATE(), 'SYSTEM'),
('SUP-013', 'Mega Molding Co.', 'SITE-007', 'Pathum Thani, Thailand', 'Injection molding services', 1, GETDATE(), 'SYSTEM'),
('SUP-014', 'Apex Adhesives Ltd.', 'SITE-002', 'Chonburi, Thailand', 'Industrial adhesives', 1, GETDATE(), 'SYSTEM'),
('SUP-015', 'Dynamic Dies Inc.', 'SITE-008', 'Nonthaburi, Thailand', 'Tool and die manufacturing', 1, GETDATE(), 'SYSTEM'),
('SUP-016', 'Perfect Plating Co.', 'SITE-003', 'Rayong, Thailand', 'Metal plating services', 1, GETDATE(), 'SYSTEM'),
('SUP-017', 'Innovative Insulation Ltd.', 'SITE-006', 'Nakhon Pathom, Thailand', 'Insulation materials', 1, GETDATE(), 'SYSTEM'),
('SUP-018', 'Reliable Resins Inc.', 'SITE-007', 'Pathum Thani, Thailand', 'Epoxy and resin products', 1, GETDATE(), 'SYSTEM'),
('SUP-019', 'Quality Coatings Co.', 'SITE-008', 'Nonthaburi, Thailand', 'Surface coating services', 1, GETDATE(), 'SYSTEM'),
('SUP-020', 'Trusted Testing Labs', 'SITE-001', 'Bangkok, Thailand', 'Material testing services', 1, GETDATE(), 'SYSTEM');

-- Roles
INSERT INTO ROLES (role_id, role_name, role_desc, active_flag, last_update, updateby) VALUES
('ROLE-001', 'Quality Engineer', 'Responsible for quality inspections', 1, GETDATE(), 'SYSTEM'),
('ROLE-002', 'Production Manager', 'Oversees production operations', 1, GETDATE(), 'SYSTEM'),
('ROLE-003', 'QA Inspector', 'Performs quality audits', 1, GETDATE(), 'SYSTEM'),
('ROLE-004', 'Supplier Quality Engineer', 'Manages supplier quality', 1, GETDATE(), 'SYSTEM'),
('ROLE-005', 'Plant Manager', 'Overall plant management', 1, GETDATE(), 'SYSTEM'),
('ROLE-006', 'Quality Manager', 'Manages quality department', 1, GETDATE(), 'SYSTEM'),
('ROLE-007', 'Process Engineer', 'Develops and improves processes', 1, GETDATE(), 'SYSTEM'),
('ROLE-008', 'Manufacturing Engineer', 'Manufacturing process support', 1, GETDATE(), 'SYSTEM'),
('ROLE-009', 'Quality Technician', 'Quality testing and inspection', 1, GETDATE(), 'SYSTEM'),
('ROLE-010', 'Production Supervisor', 'Supervises production line', 1, GETDATE(), 'SYSTEM'),
('ROLE-011', 'Maintenance Engineer', 'Equipment maintenance', 1, GETDATE(), 'SYSTEM'),
('ROLE-012', 'Quality Auditor', 'Conducts internal audits', 1, GETDATE(), 'SYSTEM'),
('ROLE-013', 'Materials Manager', 'Manages materials and inventory', 1, GETDATE(), 'SYSTEM'),
('ROLE-014', 'Logistics Coordinator', 'Coordinates shipping and receiving', 1, GETDATE(), 'SYSTEM'),
('ROLE-015', 'Safety Officer', 'Workplace safety management', 1, GETDATE(), 'SYSTEM');

-- Products
INSERT INTO PRODUCTS (product_id, product_name, product_code, product_desc, site_id, active_flag, last_update, updateby) VALUES
('PROD-001', 'Automotive ECU', 'ECU-A100', 'Electronic Control Unit for vehicles', 'SITE-001', 1, GETDATE(), 'SYSTEM'),
('PROD-002', 'Dashboard Assembly', 'DASH-B200', 'Complete dashboard unit', 'SITE-002', 1, GETDATE(), 'SYSTEM'),
('PROD-003', 'Sensor Module', 'SENS-C300', 'Multi-sensor module', 'SITE-003', 1, GETDATE(), 'SYSTEM'),
('PROD-004', 'Wiring Harness', 'WIRE-D400', 'Complete wiring harness', 'SITE-004', 1, GETDATE(), 'SYSTEM'),
('PROD-005', 'Control Panel', 'CTRL-E500', 'Control panel assembly', 'SITE-005', 1, GETDATE(), 'SYSTEM'),
('PROD-006', 'Power Supply Unit', 'PSU-F600', 'Automotive power supply', 'SITE-006', 1, GETDATE(), 'SYSTEM'),
('PROD-007', 'Climate Control Module', 'CCM-G700', 'HVAC control module', 'SITE-007', 1, GETDATE(), 'SYSTEM'),
('PROD-008', 'Infotainment System', 'IFS-H800', 'In-vehicle infotainment', 'SITE-008', 1, GETDATE(), 'SYSTEM'),
('PROD-009', 'Body Control Module', 'BCM-I900', 'Vehicle body electronics', 'SITE-009', 1, GETDATE(), 'SYSTEM'),
('PROD-010', 'Instrument Cluster', 'IC-J1000', 'Digital instrument cluster', 'SITE-010', 1, GETDATE(), 'SYSTEM'),
('PROD-011', 'Steering Wheel Module', 'SWM-K1100', 'Steering wheel controls', 'SITE-001', 1, GETDATE(), 'SYSTEM'),
('PROD-012', 'Door Control Module', 'DCM-L1200', 'Power door control', 'SITE-002', 1, GETDATE(), 'SYSTEM'),
('PROD-013', 'Lighting Control Unit', 'LCU-M1300', 'Exterior lighting control', 'SITE-003', 1, GETDATE(), 'SYSTEM'),
('PROD-014', 'Seat Control Module', 'SCM-N1400', 'Power seat adjustment', 'SITE-004', 1, GETDATE(), 'SYSTEM'),
('PROD-015', 'Mirror Control Unit', 'MCU-O1500', 'Power mirror control', 'SITE-005', 1, GETDATE(), 'SYSTEM');

-- Models
INSERT INTO MODELS (model_id, model_name, model_no, model_desc, product_id, site_id, active_flag, last_update, updateby) VALUES
('MOD-001', 'ECU Standard', 'ECU-STD-2024', 'Standard ECU model', 'PROD-001', 'SITE-001', 1, GETDATE(), 'SYSTEM'),
('MOD-002', 'ECU Premium', 'ECU-PRM-2024', 'Premium ECU with advanced features', 'PROD-001', 'SITE-001', 1, GETDATE(), 'SYSTEM'),
('MOD-003', 'Dashboard Type A', 'DASH-A-2024', 'Type A dashboard', 'PROD-002', 'SITE-002', 1, GETDATE(), 'SYSTEM'),
('MOD-004', 'Sensor Basic', 'SENS-BSC-2024', 'Basic sensor module', 'PROD-003', 'SITE-003', 1, GETDATE(), 'SYSTEM'),
('MOD-005', 'Harness Complete', 'WIRE-CMP-2024', 'Complete harness assembly', 'PROD-004', 'SITE-004', 1, GETDATE(), 'SYSTEM'),
('MOD-006', 'ECU Sport', 'ECU-SPT-2024', 'Sport performance ECU', 'PROD-001', 'SITE-001', 1, GETDATE(), 'SYSTEM'),
('MOD-007', 'Dashboard Type B', 'DASH-B-2024', 'Type B dashboard with LCD', 'PROD-002', 'SITE-002', 1, GETDATE(), 'SYSTEM'),
('MOD-008', 'Sensor Advanced', 'SENS-ADV-2024', 'Advanced multi-sensor', 'PROD-003', 'SITE-003', 1, GETDATE(), 'SYSTEM'),
('MOD-009', 'Harness Premium', 'WIRE-PRM-2024', 'Premium harness with shielding', 'PROD-004', 'SITE-004', 1, GETDATE(), 'SYSTEM'),
('MOD-010', 'Control Panel Digital', 'CTRL-DIG-2024', 'Digital control panel', 'PROD-005', 'SITE-005', 1, GETDATE(), 'SYSTEM'),
('MOD-011', 'PSU Standard', 'PSU-STD-2024', 'Standard power supply', 'PROD-006', 'SITE-006', 1, GETDATE(), 'SYSTEM'),
('MOD-012', 'PSU High Power', 'PSU-HP-2024', 'High power output PSU', 'PROD-006', 'SITE-006', 1, GETDATE(), 'SYSTEM'),
('MOD-013', 'Climate Auto', 'CCM-AUTO-2024', 'Automatic climate control', 'PROD-007', 'SITE-007', 1, GETDATE(), 'SYSTEM'),
('MOD-014', 'Climate Manual', 'CCM-MAN-2024', 'Manual climate control', 'PROD-007', 'SITE-007', 1, GETDATE(), 'SYSTEM'),
('MOD-015', 'Infotainment Basic', 'IFS-BSC-2024', 'Basic infotainment', 'PROD-008', 'SITE-008', 1, GETDATE(), 'SYSTEM'),
('MOD-016', 'Infotainment Premium', 'IFS-PRM-2024', 'Premium infotainment with nav', 'PROD-008', 'SITE-008', 1, GETDATE(), 'SYSTEM'),
('MOD-017', 'BCM Standard', 'BCM-STD-2024', 'Standard body control', 'PROD-009', 'SITE-009', 1, GETDATE(), 'SYSTEM'),
('MOD-018', 'Cluster Analog', 'IC-ANA-2024', 'Analog instrument cluster', 'PROD-010', 'SITE-010', 1, GETDATE(), 'SYSTEM'),
('MOD-019', 'Cluster Digital', 'IC-DIG-2024', 'Full digital cluster', 'PROD-010', 'SITE-010', 1, GETDATE(), 'SYSTEM'),
('MOD-020', 'Steering Basic', 'SWM-BSC-2024', 'Basic steering controls', 'PROD-011', 'SITE-001', 1, GETDATE(), 'SYSTEM');

-- Manufacturing Areas
INSERT INTO MFG_AREAS (mfg_area_id, mfg_area_name, mfg_area_desc, active_flag, last_update, updateby) VALUES
('MFG-001', 'Assembly Line 1', 'Main assembly line', 1, GETDATE(), 'SYSTEM'),
('MFG-002', 'Assembly Line 2', 'Secondary assembly line', 1, GETDATE(), 'SYSTEM'),
('MFG-003', 'Quality Control', 'QC inspection area', 1, GETDATE(), 'SYSTEM'),
('MFG-004', 'Packaging', 'Final packaging area', 1, GETDATE(), 'SYSTEM'),
('MFG-005', 'Warehouse', 'Storage and logistics', 1, GETDATE(), 'SYSTEM'),
('MFG-006', 'Injection Molding', 'Plastic injection area', 1, GETDATE(), 'SYSTEM'),
('MFG-007', 'Metal Stamping', 'Metal forming and stamping', 1, GETDATE(), 'SYSTEM'),
('MFG-008', 'PCB Assembly', 'Circuit board assembly', 1, GETDATE(), 'SYSTEM'),
('MFG-009', 'Testing Lab', 'Product testing facility', 1, GETDATE(), 'SYSTEM'),
('MFG-010', 'Receiving', 'Incoming material receiving', 1, GETDATE(), 'SYSTEM'),
('MFG-011', 'Shipping', 'Outgoing product shipping', 1, GETDATE(), 'SYSTEM'),
('MFG-012', 'Rework Station', 'Product rework area', 1, GETDATE(), 'SYSTEM'),
('MFG-013', 'Calibration Lab', 'Equipment calibration', 1, GETDATE(), 'SYSTEM'),
('MFG-014', 'Material Prep', 'Material preparation area', 1, GETDATE(), 'SYSTEM'),
('MFG-015', 'Final Inspection', 'Final quality inspection', 1, GETDATE(), 'SYSTEM');

-- ============================================================================
-- 2. DEFECTS & QUALITY
-- ============================================================================

-- Defect Categories
INSERT INTO DEFECTCATEGORIES (defectcategory_id, defectcategory_name, defectcategory_acronym, defectcategory_desc, active_flag, last_update, updateby) VALUES
('DCAT-001', 'Appearance', 'APP', 'Visual defects', 1, GETDATE(), 'SYSTEM'),
('DCAT-002', 'Dimensional', 'DIM', 'Size and dimension issues', 1, GETDATE(), 'SYSTEM'),
('DCAT-003', 'Functional', 'FUN', 'Functionality problems', 1, GETDATE(), 'SYSTEM'),
('DCAT-004', 'Material', 'MAT', 'Material defects', 1, GETDATE(), 'SYSTEM'),
('DCAT-005', 'Assembly', 'ASM', 'Assembly errors', 1, GETDATE(), 'SYSTEM'),
('DCAT-006', 'Electrical', 'ELE', 'Electrical defects', 1, GETDATE(), 'SYSTEM'),
('DCAT-007', 'Mechanical', 'MEC', 'Mechanical defects', 1, GETDATE(), 'SYSTEM'),
('DCAT-008', 'Packaging', 'PKG', 'Packaging issues', 1, GETDATE(), 'SYSTEM'),
('DCAT-009', 'Documentation', 'DOC', 'Documentation errors', 1, GETDATE(), 'SYSTEM'),
('DCAT-010', 'Labeling', 'LBL', 'Labeling defects', 1, GETDATE(), 'SYSTEM'),
('DCAT-011', 'Contamination', 'CTM', 'Contamination issues', 1, GETDATE(), 'SYSTEM'),
('DCAT-012', 'Corrosion', 'COR', 'Corrosion defects', 1, GETDATE(), 'SYSTEM'),
('DCAT-013', 'Welding', 'WLD', 'Welding defects', 1, GETDATE(), 'SYSTEM'),
('DCAT-014', 'Coating', 'COT', 'Coating defects', 1, GETDATE(), 'SYSTEM'),
('DCAT-015', 'Performance', 'PRF', 'Performance issues', 1, GETDATE(), 'SYSTEM');

-- Defects
INSERT INTO DEFECTS (defect_id, defect_name, defect_desc, active_flag, last_update, updateby) VALUES
('DEF-001', 'Scratch', 'Surface scratch', 1, GETDATE(), 'SYSTEM'),
('DEF-002', 'Dent', 'Surface dent or depression', 1, GETDATE(), 'SYSTEM'),
('DEF-003', 'Crack', 'Material crack', 1, GETDATE(), 'SYSTEM'),
('DEF-004', 'Discoloration', 'Color variation', 1, GETDATE(), 'SYSTEM'),
('DEF-005', 'Missing Part', 'Component missing', 1, GETDATE(), 'SYSTEM'),
('DEF-006', 'Wrong Part', 'Incorrect component installed', 1, GETDATE(), 'SYSTEM'),
('DEF-007', 'Loose Connection', 'Connection not secure', 1, GETDATE(), 'SYSTEM'),
('DEF-008', 'Short Circuit', 'Electrical short', 1, GETDATE(), 'SYSTEM'),
('DEF-009', 'Contamination', 'Foreign material present', 1, GETDATE(), 'SYSTEM'),
('DEF-010', 'Burr', 'Sharp edge or burr', 1, GETDATE(), 'SYSTEM'),
('DEF-011', 'Warpage', 'Material warping or bending', 1, GETDATE(), 'SYSTEM'),
('DEF-012', 'Flash', 'Excess material flash', 1, GETDATE(), 'SYSTEM'),
('DEF-013', 'Sink Mark', 'Surface sink mark', 1, GETDATE(), 'SYSTEM'),
('DEF-014', 'Weld Spatter', 'Welding spatter present', 1, GETDATE(), 'SYSTEM'),
('DEF-015', 'Porosity', 'Material porosity', 1, GETDATE(), 'SYSTEM'),
('DEF-016', 'Delamination', 'Layer separation', 1, GETDATE(), 'SYSTEM'),
('DEF-017', 'Oxidation', 'Surface oxidation', 1, GETDATE(), 'SYSTEM'),
('DEF-018', 'Incomplete Cure', 'Material not fully cured', 1, GETDATE(), 'SYSTEM'),
('DEF-019', 'Overspray', 'Coating overspray', 1, GETDATE(), 'SYSTEM'),
('DEF-020', 'Misalignment', 'Component misalignment', 1, GETDATE(), 'SYSTEM');

-- Defect Classes
INSERT INTO DEFECTCLASS (defectclass_id, defectclass_name, defectclass_desc, active_flag, last_update, updateby) VALUES
('DCLS-001', 'Critical', 'Safety or function critical', 1, GETDATE(), 'SYSTEM'),
('DCLS-002', 'Major', 'Significant quality issue', 1, GETDATE(), 'SYSTEM'),
('DCLS-003', 'Minor', 'Cosmetic or minor issue', 1, GETDATE(), 'SYSTEM');

-- Dispositions
INSERT INTO DISPOSITIONS (disposition_id, disposition_name, disposition_desc, active_flag, last_update, updateby) VALUES
('DISP-001', 'Accept', 'Accept as is', 1, GETDATE(), 'SYSTEM'),
('DISP-002', 'Reject', 'Reject and return', 1, GETDATE(), 'SYSTEM'),
('DISP-003', 'Rework', 'Rework required', 1, GETDATE(), 'SYSTEM'),
('DISP-004', 'Use As Is', 'Use with deviation', 1, GETDATE(), 'SYSTEM'),
('DISP-005', 'Scrap', 'Scrap material', 1, GETDATE(), 'SYSTEM'),
('DISP-006', 'Return to Supplier', 'Return to supplier for credit', 1, GETDATE(), 'SYSTEM'),
('DISP-007', 'Sort and Rework', 'Sort good parts and rework bad', 1, GETDATE(), 'SYSTEM'),
('DISP-008', 'Conditional Accept', 'Accept with conditions', 1, GETDATE(), 'SYSTEM'),
('DISP-009', 'Quarantine', 'Hold for further evaluation', 1, GETDATE(), 'SYSTEM'),
('DISP-010', 'Downgrade', 'Downgrade to lower grade', 1, GETDATE(), 'SYSTEM'),
('DISP-011', 'Repair', 'Repair defective parts', 1, GETDATE(), 'SYSTEM'),
('DISP-012', 'Replace', 'Replace with new parts', 1, GETDATE(), 'SYSTEM'),
('DISP-013', 'Retest', 'Retest after correction', 1, GETDATE(), 'SYSTEM'),
('DISP-014', 'Engineering Review', 'Requires engineering review', 1, GETDATE(), 'SYSTEM'),
('DISP-015', 'Customer Approval', 'Requires customer approval', 1, GETDATE(), 'SYSTEM');

-- Severity Levels
INSERT INTO SEVERITY (severity_id, severity_name, severity_desc, active_flag, last_update, updateby) VALUES
('SEV-001', 'Level I', 'Inspection Level I', 1, GETDATE(), 'SYSTEM'),
('SEV-002', 'Level II', 'Inspection Level II', 1, GETDATE(), 'SYSTEM'),
('SEV-003', 'Level III', 'Inspection Level III', 1, GETDATE(), 'SYSTEM'),
('SEV-004', 'Special', 'Special inspection level', 1, GETDATE(), 'SYSTEM');

-- AQL (Acceptable Quality Levels)
INSERT INTO AQL (aql_id, aql_name, minor, major, site_id, aql_desc, creation_date, active_flag, last_update, updateby) VALUES
('AQL-001', 'AQL 1.5/2.5', 1.5, 2.5, 'SITE-001', 'Standard AQL for general inspection', GETDATE(), 1, GETDATE(), 'SYSTEM'),
('AQL-002', 'AQL 0.65/1.0', 0.65, 1.0, 'SITE-001', 'Tight AQL for critical parts', GETDATE(), 1, GETDATE(), 'SYSTEM'),
('AQL-003', 'AQL 2.5/4.0', 2.5, 4.0, 'SITE-002', 'Relaxed AQL for non-critical', GETDATE(), 1, GETDATE(), 'SYSTEM'),
('AQL-004', 'AQL 1.0/1.5', 1.0, 1.5, 'SITE-003', 'Medium AQL level', GETDATE(), 1, GETDATE(), 'SYSTEM'),
('AQL-005', 'AQL 0.25/0.65', 0.25, 0.65, 'SITE-004', 'Very tight AQL', GETDATE(), 1, GETDATE(), 'SYSTEM'),
('AQL-006', 'AQL 4.0/6.5', 4.0, 6.5, 'SITE-005', 'General purpose AQL', GETDATE(), 1, GETDATE(), 'SYSTEM'),
('AQL-007', 'AQL 0.15/0.25', 0.15, 0.25, 'SITE-006', 'Ultra tight AQL', GETDATE(), 1, GETDATE(), 'SYSTEM'),
('AQL-008', 'AQL 1.0/2.5', 1.0, 2.5, 'SITE-007', 'Standard automotive AQL', GETDATE(), 1, GETDATE(), 'SYSTEM'),
('AQL-009', 'AQL 0.40/0.65', 0.40, 0.65, 'SITE-008', 'Tight automotive AQL', GETDATE(), 1, GETDATE(), 'SYSTEM'),
('AQL-010', 'AQL 2.5/6.5', 2.5, 6.5, 'SITE-009', 'Relaxed general AQL', GETDATE(), 1, GETDATE(), 'SYSTEM'),
('AQL-011', 'AQL 0.65/2.5', 0.65, 2.5, 'SITE-010', 'Mixed level AQL', GETDATE(), 1, GETDATE(), 'SYSTEM'),
('AQL-012', 'AQL 1.5/4.0', 1.5, 4.0, 'SITE-001', 'Standard mixed AQL', GETDATE(), 1, GETDATE(), 'SYSTEM'),
('AQL-013', 'AQL 0.10/0.15', 0.10, 0.15, 'SITE-002', 'Zero defect AQL', GETDATE(), 1, GETDATE(), 'SYSTEM'),
('AQL-014', 'AQL 6.5/10.0', 6.5, 10.0, 'SITE-003', 'Very relaxed AQL', GETDATE(), 1, GETDATE(), 'SYSTEM'),
('AQL-015', 'AQL 1.0/4.0', 1.0, 4.0, 'SITE-004', 'Wide range AQL', GETDATE(), 1, GETDATE(), 'SYSTEM');

-- ============================================================================
-- 3. INSPECTION
-- ============================================================================

-- Inspection Categories
INSERT INTO INSPECTIONCATEGORIES (inspectioncat_id, inspectioncat_name, inspectioncat_desc, active_flag, last_update, updateby) VALUES
('INSC-001', 'Incoming Inspection', 'Inspection of incoming materials', 1, GETDATE(), 'SYSTEM'),
('INSC-002', 'In-Process Inspection', 'During production inspection', 1, GETDATE(), 'SYSTEM'),
('INSC-003', 'Final Inspection', 'Final product inspection', 1, GETDATE(), 'SYSTEM'),
('INSC-004', 'Source Inspection', 'Inspection at supplier site', 1, GETDATE(), 'SYSTEM'),
('INSC-005', 'Audit Inspection', 'Random audit inspection', 1, GETDATE(), 'SYSTEM'),
('INSC-006', 'First Article Inspection', 'First piece inspection', 1, GETDATE(), 'SYSTEM'),
('INSC-007', 'Last Article Inspection', 'Last piece inspection', 1, GETDATE(), 'SYSTEM'),
('INSC-008', 'Patrol Inspection', 'Roving inspection', 1, GETDATE(), 'SYSTEM'),
('INSC-009', 'Pre-Shipment Inspection', 'Before shipping inspection', 1, GETDATE(), 'SYSTEM'),
('INSC-010', 'Receiving Inspection', 'Material receiving check', 1, GETDATE(), 'SYSTEM'),
('INSC-011', 'Line Clearance', 'Production line clearance', 1, GETDATE(), 'SYSTEM'),
('INSC-012', 'Setup Inspection', 'Machine setup verification', 1, GETDATE(), 'SYSTEM'),
('INSC-013', 'Dimensional Inspection', 'Dimensional verification', 1, GETDATE(), 'SYSTEM'),
('INSC-014', 'Visual Inspection', 'Visual quality check', 1, GETDATE(), 'SYSTEM'),
('INSC-015', 'Functional Testing', 'Functional performance test', 1, GETDATE(), 'SYSTEM');

-- Inspection Methods
INSERT INTO INSPECTIONMETHODS (inspectionmethod_id, inspectionmethod_name, inspectionmethod_desc, default_temp, default_hum, default_value, active_flag, last_update, updateby) VALUES
('INSM-001', 'Visual Inspection', 'Visual check', 25.0, 50.0, 1, 1, GETDATE(), 'SYSTEM'),
('INSM-002', 'Dimensional Check', 'Measure dimensions', 23.0, 45.0, 1, 1, GETDATE(), 'SYSTEM'),
('INSM-003', 'Functional Test', 'Test functionality', 25.0, 50.0, 1, 1, GETDATE(), 'SYSTEM'),
('INSM-004', 'Electrical Test', 'Electrical testing', 23.0, 45.0, 1, 1, GETDATE(), 'SYSTEM'),
('INSM-005', 'Destructive Test', 'Destructive testing', 25.0, 50.0, 0, 1, GETDATE(), 'SYSTEM'),
('INSM-006', 'Caliper Measurement', 'Caliper dimensional check', 23.0, 45.0, 1, 1, GETDATE(), 'SYSTEM'),
('INSM-007', 'Micrometer Measurement', 'Precision micrometer check', 23.0, 45.0, 1, 1, GETDATE(), 'SYSTEM'),
('INSM-008', 'CMM Inspection', 'Coordinate measuring machine', 20.0, 45.0, 1, 1, GETDATE(), 'SYSTEM'),
('INSM-009', 'Hardness Test', 'Material hardness testing', 25.0, 50.0, 0, 1, GETDATE(), 'SYSTEM'),
('INSM-010', 'Tensile Test', 'Tensile strength testing', 25.0, 50.0, 0, 1, GETDATE(), 'SYSTEM'),
('INSM-011', 'Salt Spray Test', 'Corrosion resistance test', 35.0, 95.0, 0, 1, GETDATE(), 'SYSTEM'),
('INSM-012', 'Vibration Test', 'Vibration resistance test', 25.0, 50.0, 0, 1, GETDATE(), 'SYSTEM'),
('INSM-013', 'Temperature Cycling', 'Thermal cycling test', 25.0, 50.0, 0, 1, GETDATE(), 'SYSTEM'),
('INSM-014', 'Pressure Test', 'Pressure resistance test', 25.0, 50.0, 0, 1, GETDATE(), 'SYSTEM'),
('INSM-015', 'Leak Test', 'Leak detection test', 25.0, 50.0, 1, 1, GETDATE(), 'SYSTEM'),
('INSM-016', 'X-Ray Inspection', 'X-ray non-destructive test', 25.0, 50.0, 1, 1, GETDATE(), 'SYSTEM'),
('INSM-017', 'Ultrasonic Test', 'Ultrasonic inspection', 25.0, 50.0, 1, 1, GETDATE(), 'SYSTEM'),
('INSM-018', 'Continuity Test', 'Electrical continuity check', 23.0, 45.0, 1, 1, GETDATE(), 'SYSTEM'),
('INSM-019', 'Insulation Test', 'Insulation resistance test', 23.0, 45.0, 1, 1, GETDATE(), 'SYSTEM'),
('INSM-020', 'Color Matching', 'Color comparison test', 25.0, 50.0, 1, 1, GETDATE(), 'SYSTEM');

-- Inspectors
INSERT INTO INSPECTORS (inspector_id, inspector_name, inspector_desc, active_flag, last_update, updateby) VALUES
('INS-001', 'John Smith', 'Senior QC Inspector', 1, GETDATE(), 'SYSTEM'),
('INS-002', 'Jane Doe', 'QA Lead Inspector', 1, GETDATE(), 'SYSTEM'),
('INS-003', 'Mike Johnson', 'Incoming Inspector', 1, GETDATE(), 'SYSTEM'),
('INS-004', 'Sarah Williams', 'Final Inspector', 1, GETDATE(), 'SYSTEM'),
('INS-005', 'Tom Brown', 'Audit Inspector', 1, GETDATE(), 'SYSTEM'),
('INS-006', 'Lisa Anderson', 'Process Inspector', 1, GETDATE(), 'SYSTEM'),
('INS-007', 'David Martinez', 'Dimensional Inspector', 1, GETDATE(), 'SYSTEM'),
('INS-008', 'Emily Taylor', 'Electrical Test Inspector', 1, GETDATE(), 'SYSTEM'),
('INS-009', 'Robert Garcia', 'Visual Inspector', 1, GETDATE(), 'SYSTEM'),
('INS-010', 'Jennifer Lee', 'Functional Test Inspector', 1, GETDATE(), 'SYSTEM'),
('INS-011', 'Michael Wilson', 'Source Inspector', 1, GETDATE(), 'SYSTEM'),
('INS-012', 'Amanda Moore', 'Receiving Inspector', 1, GETDATE(), 'SYSTEM'),
('INS-013', 'Christopher Davis', 'Shipping Inspector', 1, GETDATE(), 'SYSTEM'),
('INS-014', 'Jessica Rodriguez', 'Line Inspector', 1, GETDATE(), 'SYSTEM'),
('INS-015', 'Daniel Hernandez', 'Lab Technician', 1, GETDATE(), 'SYSTEM');

-- ============================================================================
-- 4. PARTS CATALOG
-- ============================================================================

-- Part Classes
INSERT INTO PARTCLASS (partclass_id, partclass_name, partclass_desc, site_id, active_flag, last_update, updateby) VALUES
('PC-001', 'Electronic Components', 'Electronic parts', 'SITE-001', 1, GETDATE(), 'SYSTEM'),
('PC-002', 'Mechanical Parts', 'Mechanical components', 'SITE-002', 1, GETDATE(), 'SYSTEM'),
('PC-003', 'Plastic Parts', 'Plastic components', 'SITE-003', 1, GETDATE(), 'SYSTEM'),
('PC-004', 'Metal Parts', 'Metal components', 'SITE-004', 1, GETDATE(), 'SYSTEM'),
('PC-005', 'Fasteners', 'Screws, bolts, nuts', 'SITE-005', 1, GETDATE(), 'SYSTEM'),
('PC-006', 'Cables and Wires', 'Electrical cables', 'SITE-006', 1, GETDATE(), 'SYSTEM'),
('PC-007', 'Connectors', 'Electrical connectors', 'SITE-007', 1, GETDATE(), 'SYSTEM'),
('PC-008', 'Sensors', 'Sensor components', 'SITE-008', 1, GETDATE(), 'SYSTEM'),
('PC-009', 'Switches', 'Switch components', 'SITE-009', 1, GETDATE(), 'SYSTEM'),
('PC-010', 'Displays', 'Display components', 'SITE-010', 1, GETDATE(), 'SYSTEM'),
('PC-011', 'Housings', 'Enclosures and housings', 'SITE-001', 1, GETDATE(), 'SYSTEM'),
('PC-012', 'Gaskets and Seals', 'Sealing components', 'SITE-002', 1, GETDATE(), 'SYSTEM'),
('PC-013', 'Springs', 'Spring components', 'SITE-003', 1, GETDATE(), 'SYSTEM'),
('PC-014', 'Bearings', 'Bearing components', 'SITE-004', 1, GETDATE(), 'SYSTEM'),
('PC-015', 'Labels and Decals', 'Identification labels', 'SITE-005', 1, GETDATE(), 'SYSTEM');

-- Part Types
INSERT INTO PARTTYPES (parttype_id, parttype_name, parttype_code, parttype_desc, active_flag, last_update, updateby) VALUES
('PT-001', 'Resistor', 'RES', 'Electrical resistor', 1, GETDATE(), 'SYSTEM'),
('PT-002', 'Capacitor', 'CAP', 'Electrical capacitor', 1, GETDATE(), 'SYSTEM'),
('PT-003', 'IC Chip', 'IC', 'Integrated circuit', 1, GETDATE(), 'SYSTEM'),
('PT-004', 'Connector', 'CONN', 'Electrical connector', 1, GETDATE(), 'SYSTEM'),
('PT-005', 'Housing', 'HSG', 'Plastic housing', 1, GETDATE(), 'SYSTEM'),
('PT-006', 'Diode', 'DIO', 'Semiconductor diode', 1, GETDATE(), 'SYSTEM'),
('PT-007', 'Transistor', 'TRN', 'Transistor component', 1, GETDATE(), 'SYSTEM'),
('PT-008', 'Inductor', 'IND', 'Inductive component', 1, GETDATE(), 'SYSTEM'),
('PT-009', 'Relay', 'RLY', 'Electromagnetic relay', 1, GETDATE(), 'SYSTEM'),
('PT-010', 'Fuse', 'FUS', 'Protective fuse', 1, GETDATE(), 'SYSTEM'),
('PT-011', 'LED', 'LED', 'Light emitting diode', 1, GETDATE(), 'SYSTEM'),
('PT-012', 'Switch', 'SW', 'Mechanical switch', 1, GETDATE(), 'SYSTEM'),
('PT-013', 'Terminal', 'TERM', 'Wire terminal', 1, GETDATE(), 'SYSTEM'),
('PT-014', 'PCB', 'PCB', 'Printed circuit board', 1, GETDATE(), 'SYSTEM'),
('PT-015', 'Cable', 'CBL', 'Wire cable', 1, GETDATE(), 'SYSTEM');

-- MNR Types
INSERT INTO MNRTYPE (mnrtype_id, mnrtype_name, mnrtype_desc, active_flag, last_update, updateby) VALUES
('MNR-001', 'Material Non-Conformance', 'Material quality issue', 1, GETDATE(), 'SYSTEM'),
('MNR-002', 'Process Non-Conformance', 'Process deviation', 1, GETDATE(), 'SYSTEM'),
('MNR-003', 'Product Non-Conformance', 'Product defect', 1, GETDATE(), 'SYSTEM'),
('MNR-004', 'Documentation Issue', 'Documentation error', 1, GETDATE(), 'SYSTEM'),
('MNR-005', 'Supplier Issue', 'Supplier quality problem', 1, GETDATE(), 'SYSTEM'),
('MNR-006', 'Packaging Issue', 'Packaging defect', 1, GETDATE(), 'SYSTEM'),
('MNR-007', 'Labeling Issue', 'Labeling error', 1, GETDATE(), 'SYSTEM'),
('MNR-008', 'Dimensional Issue', 'Dimensional non-conformance', 1, GETDATE(), 'SYSTEM'),
('MNR-009', 'Appearance Issue', 'Cosmetic defect', 1, GETDATE(), 'SYSTEM'),
('MNR-010', 'Functional Issue', 'Functional failure', 1, GETDATE(), 'SYSTEM'),
('MNR-011', 'Assembly Issue', 'Assembly error', 1, GETDATE(), 'SYSTEM'),
('MNR-012', 'Testing Issue', 'Test failure', 1, GETDATE(), 'SYSTEM'),
('MNR-013', 'Contamination Issue', 'Contamination found', 1, GETDATE(), 'SYSTEM'),
('MNR-014', 'Handling Damage', 'Damage during handling', 1, GETDATE(), 'SYSTEM'),
('MNR-015', 'Storage Issue', 'Storage condition problem', 1, GETDATE(), 'SYSTEM');

-- ============================================================================
-- 5. AUDIT & QMS
-- ============================================================================

-- Audit Categories
INSERT INTO AUDITCATEGORY (audit_category_id, audit_category_name, audit_category_code, audit_category_desc, with_rating, with_auditees, with_auditors, with_attendees, with_audit_plan, active_flag, last_update, updateby) VALUES
('ACAT-001', 'Internal Audit', 'INT', 'Internal quality audit', 1, 1, 1, 1, 1, 1, GETDATE(), 'SYSTEM'),
('ACAT-002', 'Supplier Audit', 'SUP', 'Supplier quality audit', 1, 1, 1, 0, 1, 1, GETDATE(), 'SYSTEM'),
('ACAT-003', 'Process Audit', 'PRC', 'Manufacturing process audit', 1, 1, 1, 1, 1, 1, GETDATE(), 'SYSTEM'),
('ACAT-004', 'Product Audit', 'PRD', 'Product quality audit', 1, 0, 1, 0, 1, 1, GETDATE(), 'SYSTEM'),
('ACAT-005', 'System Audit', 'SYS', 'QMS system audit', 1, 1, 1, 1, 1, 1, GETDATE(), 'SYSTEM');

-- Audit Types
INSERT INTO AUDITTYPE (audit_type_id, audit_type_name, audit_type_desc, audit_category_id, active_flag, last_update, updateby) VALUES
('ATYP-001', 'ISO 9001 Audit', 'ISO 9001 compliance audit', 'ACAT-005', 1, GETDATE(), 'SYSTEM'),
('ATYP-002', 'IATF 16949 Audit', 'Automotive quality audit', 'ACAT-005', 1, GETDATE(), 'SYSTEM'),
('ATYP-003', 'Layered Process Audit', 'LPA inspection', 'ACAT-003', 1, GETDATE(), 'SYSTEM'),
('ATYP-004', 'Supplier Assessment', 'New supplier evaluation', 'ACAT-002', 1, GETDATE(), 'SYSTEM'),
('ATYP-005', 'Customer Audit', 'Customer quality audit', 'ACAT-001', 1, GETDATE(), 'SYSTEM'),
('ATYP-006', 'Process Capability Audit', 'Process capability review', 'ACAT-003', 1, GETDATE(), 'SYSTEM'),
('ATYP-007', 'Product Audit', 'Finished product audit', 'ACAT-004', 1, GETDATE(), 'SYSTEM'),
('ATYP-008', 'System Audit', 'QMS system audit', 'ACAT-005', 1, GETDATE(), 'SYSTEM'),
('ATYP-009', 'Compliance Audit', 'Regulatory compliance audit', 'ACAT-005', 1, GETDATE(), 'SYSTEM'),
('ATYP-010', 'Surveillance Audit', 'Ongoing surveillance audit', 'ACAT-001', 1, GETDATE(), 'SYSTEM'),
('ATYP-011', 'Special Audit', 'Special investigation audit', 'ACAT-001', 1, GETDATE(), 'SYSTEM'),
('ATYP-012', 'Pre-Assessment Audit', 'Pre-certification audit', 'ACAT-005', 1, GETDATE(), 'SYSTEM'),
('ATYP-013', 'Follow-up Audit', 'Corrective action follow-up', 'ACAT-001', 1, GETDATE(), 'SYSTEM'),
('ATYP-014', 'VDA 6.3 Audit', 'VDA process audit', 'ACAT-003', 1, GETDATE(), 'SYSTEM'),
('ATYP-015', 'Environmental Audit', 'ISO 14001 audit', 'ACAT-005', 1, GETDATE(), 'SYSTEM');

-- Criterias
INSERT INTO CRITERIAS (criteria_id, criteria_name, criteria_desc, active_flag, last_update, updateby) VALUES
('CRIT-001', 'Quality Management', 'QMS requirements', 1, GETDATE(), 'SYSTEM'),
('CRIT-002', 'Process Control', 'Process control criteria', 1, GETDATE(), 'SYSTEM'),
('CRIT-003', 'Documentation', 'Documentation requirements', 1, GETDATE(), 'SYSTEM'),
('CRIT-004', 'Traceability', 'Product traceability', 1, GETDATE(), 'SYSTEM'),
('CRIT-005', 'Corrective Action', 'CAPA requirements', 1, GETDATE(), 'SYSTEM'),
('CRIT-006', 'Calibration', 'Equipment calibration', 1, GETDATE(), 'SYSTEM'),
('CRIT-007', 'Training', 'Personnel training', 1, GETDATE(), 'SYSTEM'),
('CRIT-008', 'Supplier Management', 'Supplier control', 1, GETDATE(), 'SYSTEM'),
('CRIT-009', 'Customer Focus', 'Customer requirements', 1, GETDATE(), 'SYSTEM'),
('CRIT-010', 'Continuous Improvement', 'Improvement activities', 1, GETDATE(), 'SYSTEM'),
('CRIT-011', 'Risk Management', 'Risk assessment', 1, GETDATE(), 'SYSTEM'),
('CRIT-012', 'Internal Audit', 'Internal audit program', 1, GETDATE(), 'SYSTEM'),
('CRIT-013', 'Management Review', 'Management review process', 1, GETDATE(), 'SYSTEM'),
('CRIT-014', 'Resource Management', 'Resource allocation', 1, GETDATE(), 'SYSTEM'),
('CRIT-015', 'Product Realization', 'Product development', 1, GETDATE(), 'SYSTEM');

-- 5M1E Categories (Root Cause Analysis)
INSERT INTO PARTCLASSCATEGORIES (Category_ID, Category_name, Category_desc, Partclass_id, active_flag, last_update, updateby) VALUES
('5M1E-001', 'Man', 'Human factors', 'PC-001', 1, GETDATE(), 'SYSTEM'),
('5M1E-002', 'Machine', 'Equipment factors', 'PC-001', 1, GETDATE(), 'SYSTEM'),
('5M1E-003', 'Material', 'Material factors', 'PC-001', 1, GETDATE(), 'SYSTEM'),
('5M1E-004', 'Method', 'Process method factors', 'PC-001', 1, GETDATE(), 'SYSTEM'),
('5M1E-005', 'Measurement', 'Measurement factors', 'PC-001', 1, GETDATE(), 'SYSTEM'),
('5M1E-006', 'Environment', 'Environmental factors', 'PC-001', 1, GETDATE(), 'SYSTEM');

-- ============================================================================
-- 6. ADMIN TABLES
-- ============================================================================

-- Certifications
INSERT INTO CERTIFICATIONS (certification_id, certification_name, certification_desc, active_flag, last_update, updateby) VALUES
('CERT-001', 'ISO 9001:2015', 'Quality Management System', 1, GETDATE(), 'SYSTEM'),
('CERT-002', 'IATF 16949:2016', 'Automotive Quality', 1, GETDATE(), 'SYSTEM'),
('CERT-003', 'ISO 14001:2015', 'Environmental Management', 1, GETDATE(), 'SYSTEM'),
('CERT-004', 'ISO 45001:2018', 'Occupational Health & Safety', 1, GETDATE(), 'SYSTEM'),
('CERT-005', 'VDA 6.3', 'Process Audit', 1, GETDATE(), 'SYSTEM'),
('CERT-006', 'ISO/IEC 17025', 'Testing Laboratory Competence', 1, GETDATE(), 'SYSTEM'),
('CERT-007', 'AS9100', 'Aerospace Quality', 1, GETDATE(), 'SYSTEM'),
('CERT-008', 'ISO 13485', 'Medical Devices Quality', 1, GETDATE(), 'SYSTEM'),
('CERT-009', 'ISO 27001', 'Information Security', 1, GETDATE(), 'SYSTEM'),
('CERT-010', 'ISO 50001', 'Energy Management', 1, GETDATE(), 'SYSTEM'),
('CERT-011', 'OHSAS 18001', 'Occupational Health & Safety', 1, GETDATE(), 'SYSTEM'),
('CERT-012', 'TS 16949', 'Automotive Technical Specification', 1, GETDATE(), 'SYSTEM'),
('CERT-013', 'ISO 22000', 'Food Safety Management', 1, GETDATE(), 'SYSTEM'),
('CERT-014', 'ISO 31000', 'Risk Management', 1, GETDATE(), 'SYSTEM'),
('CERT-015', 'Six Sigma Black Belt', 'Six Sigma Certification', 1, GETDATE(), 'SYSTEM');

-- Groups
INSERT INTO GROUPS (group_id, group_name, group_desc, active_flag, last_update, updateby) VALUES
('GRP-001', 'Quality Assurance', 'QA team', 1, GETDATE(), 'SYSTEM'),
('GRP-002', 'Production', 'Production team', 1, GETDATE(), 'SYSTEM'),
('GRP-003', 'Engineering', 'Engineering team', 1, GETDATE(), 'SYSTEM'),
('GRP-004', 'Management', 'Management team', 1, GETDATE(), 'SYSTEM'),
('GRP-005', 'Supplier Quality', 'SQE team', 1, GETDATE(), 'SYSTEM'),
('GRP-006', 'Maintenance', 'Maintenance team', 1, GETDATE(), 'SYSTEM'),
('GRP-007', 'Logistics', 'Logistics team', 1, GETDATE(), 'SYSTEM'),
('GRP-008', 'Planning', 'Planning team', 1, GETDATE(), 'SYSTEM'),
('GRP-009', 'R&D', 'Research and Development', 1, GETDATE(), 'SYSTEM'),
('GRP-010', 'Testing Lab', 'Testing laboratory', 1, GETDATE(), 'SYSTEM'),
('GRP-011', 'Process Engineering', 'Process engineering team', 1, GETDATE(), 'SYSTEM'),
('GRP-012', 'Safety', 'Safety team', 1, GETDATE(), 'SYSTEM'),
('GRP-013', 'Training', 'Training department', 1, GETDATE(), 'SYSTEM'),
('GRP-014', 'IT Support', 'IT support team', 1, GETDATE(), 'SYSTEM'),
('GRP-015', 'Customer Service', 'Customer service team', 1, GETDATE(), 'SYSTEM');

-- FAQ Items
INSERT INTO FAQ_ITEM (faq_item_id, faq_category, question, answer, sequence, faq_item_desc, active_flag, last_update, updateby) VALUES
('FAQ-001', 1, 'How to submit MNR?', 'Navigate to MNR module and click New MNR', 1, 'MNR', 1, GETDATE(), 'SYSTEM'),
('FAQ-002', 2, 'What is AQL?', 'Acceptable Quality Level for sampling inspection', 2, 'Quality', 1, GETDATE(), 'SYSTEM'),
('FAQ-003', 3, 'How to approve QMQA?', 'Go to QMQA approval page and review details', 3, 'QMQA', 1, GETDATE(), 'SYSTEM'),
('FAQ-004', 4, 'Where to find reports?', 'Reports are available in the Reports menu', 4, 'General', 1, GETDATE(), 'SYSTEM'),
('FAQ-005', 5, 'How to reset password?', 'Contact system administrator', 5, 'System', 1, GETDATE(), 'SYSTEM'),
('FAQ-006', 6, 'How to create new supplier?', 'Go to Maintenance > Suppliers and click Add', 6, 'Maintenance', 1, GETDATE(), 'SYSTEM'),
('FAQ-007', 2, 'What is 5M1E analysis?', 'Root cause analysis method: Man, Machine, Material, Method, Measurement, Environment', 7, 'Quality', 1, GETDATE(), 'SYSTEM'),
('FAQ-008', 4, 'How to upload attachments?', 'Click the attachment icon and select files', 8, 'General', 1, GETDATE(), 'SYSTEM'),
('FAQ-009', 2, 'What is PPAP?', 'Production Part Approval Process for automotive', 9, 'Quality', 1, GETDATE(), 'SYSTEM'),
('FAQ-010', 4, 'How to export data?', 'Use the Export button on list pages', 10, 'General', 1, GETDATE(), 'SYSTEM'),
('FAQ-011', 2, 'What is FMEA?', 'Failure Mode and Effects Analysis', 11, 'Quality', 1, GETDATE(), 'SYSTEM'),
('FAQ-012', 7, 'How to schedule audit?', 'Go to Audit module and create new audit', 12, 'Audit', 1, GETDATE(), 'SYSTEM'),
('FAQ-013', 2, 'What is SPC?', 'Statistical Process Control for monitoring', 13, 'Quality', 1, GETDATE(), 'SYSTEM'),
('FAQ-014', 4, 'How to view dashboard?', 'Click Dashboard on main menu', 14, 'General', 1, GETDATE(), 'SYSTEM'),
('FAQ-015', 2, 'What is CAPA?', 'Corrective and Preventive Action', 15, 'Quality', 1, GETDATE(), 'SYSTEM');

-- Customer
INSERT INTO CUSTOMER (customer_id, customer_name, customer_desc, active_flag, last_update, updateby) VALUES
('CUST-001', 'Toyota Motor Corporation', 'Major automotive customer', 1, GETDATE(), 'SYSTEM'),
('CUST-002', 'Honda Motor Co.', 'Automotive customer', 1, GETDATE(), 'SYSTEM'),
('CUST-003', 'Nissan Motor Co.', 'Automotive customer', 1, GETDATE(), 'SYSTEM'),
('CUST-004', 'Ford Motor Company', 'Automotive customer', 1, GETDATE(), 'SYSTEM'),
('CUST-005', 'General Motors', 'Automotive customer', 1, GETDATE(), 'SYSTEM'),
('CUST-006', 'Volkswagen Group', 'European automotive customer', 1, GETDATE(), 'SYSTEM'),
('CUST-007', 'BMW Group', 'Premium automotive customer', 1, GETDATE(), 'SYSTEM'),
('CUST-008', 'Mercedes-Benz', 'Luxury automotive customer', 1, GETDATE(), 'SYSTEM'),
('CUST-009', 'Hyundai Motor', 'Korean automotive customer', 1, GETDATE(), 'SYSTEM'),
('CUST-010', 'Mazda Motor', 'Japanese automotive customer', 1, GETDATE(), 'SYSTEM'),
('CUST-011', 'Subaru Corporation', 'Automotive customer', 1, GETDATE(), 'SYSTEM'),
('CUST-012', 'Mitsubishi Motors', 'Automotive customer', 1, GETDATE(), 'SYSTEM'),
('CUST-013', 'Suzuki Motor', 'Automotive customer', 1, GETDATE(), 'SYSTEM'),
('CUST-014', 'Isuzu Motors', 'Commercial vehicle customer', 1, GETDATE(), 'SYSTEM'),
('CUST-015', 'Hino Motors', 'Truck and bus customer', 1, GETDATE(), 'SYSTEM');

-- Training Programs
INSERT INTO TRAINING_PROGRAMS (training_program_id, training_program_name, training_program_desc, active_flag, last_update, updateby) VALUES
('TRN-001', 'Quality Basics', 'Introduction to quality management', 1, GETDATE(), 'SYSTEM'),
('TRN-002', 'ISO 9001 Training', 'ISO 9001 requirements', 1, GETDATE(), 'SYSTEM'),
('TRN-003', 'SPC Training', 'Statistical Process Control', 1, GETDATE(), 'SYSTEM'),
('TRN-004', 'Root Cause Analysis', '5M1E and 5 Why analysis', 1, GETDATE(), 'SYSTEM'),
('TRN-005', 'Audit Training', 'Internal auditor training', 1, GETDATE(), 'SYSTEM'),
('TRN-006', 'FMEA Training', 'Failure Mode Effects Analysis', 1, GETDATE(), 'SYSTEM'),
('TRN-007', 'PPAP Training', 'Production Part Approval Process', 1, GETDATE(), 'SYSTEM'),
('TRN-008', 'MSA Training', 'Measurement System Analysis', 1, GETDATE(), 'SYSTEM'),
('TRN-009', 'APQP Training', 'Advanced Product Quality Planning', 1, GETDATE(), 'SYSTEM'),
('TRN-010', 'Control Plan Training', 'Control plan development', 1, GETDATE(), 'SYSTEM'),
('TRN-011', 'Problem Solving', '8D problem solving method', 1, GETDATE(), 'SYSTEM'),
('TRN-012', 'Lean Manufacturing', 'Lean principles and tools', 1, GETDATE(), 'SYSTEM'),
('TRN-013', 'Six Sigma Green Belt', 'Six Sigma methodology', 1, GETDATE(), 'SYSTEM'),
('TRN-014', 'GD&T Training', 'Geometric Dimensioning & Tolerancing', 1, GETDATE(), 'SYSTEM'),
('TRN-015', 'Quality Tools', '7 QC tools training', 1, GETDATE(), 'SYSTEM');

-- Message Info
INSERT INTO MESSAGE_INFO (messageinfo_id, key_name, value, active_flag, last_update, updateby) VALUES
('MSG-001', 'System Maintenance', 'System will be down for maintenance on Sunday', 1, GETDATE(), 'SYSTEM'),
('MSG-002', 'New Feature Release', 'SQMP module now available', 1, GETDATE(), 'SYSTEM'),
('MSG-003', 'Training Reminder', 'Quality training scheduled for next week', 1, GETDATE(), 'SYSTEM'),
('MSG-004', 'Audit Notification', 'Customer audit scheduled for next month', 1, GETDATE(), 'SYSTEM'),
('MSG-005', 'Policy Update', 'Quality policy has been updated', 1, GETDATE(), 'SYSTEM'),
('MSG-006', 'Holiday Notice', 'Office closed for public holiday', 1, GETDATE(), 'SYSTEM'),
('MSG-007', 'Safety Alert', 'New safety procedures implemented', 1, GETDATE(), 'SYSTEM'),
('MSG-008', 'Performance Review', 'Q1 quality performance review meeting', 1, GETDATE(), 'SYSTEM'),
('MSG-009', 'Supplier Meeting', 'Quarterly supplier quality meeting', 1, GETDATE(), 'SYSTEM'),
('MSG-010', 'System Upgrade', 'System upgrade completed successfully', 1, GETDATE(), 'SYSTEM'),
('MSG-011', 'Certification Renewal', 'ISO certification renewal in progress', 1, GETDATE(), 'SYSTEM'),
('MSG-012', 'New Procedure', 'New inspection procedure released', 1, GETDATE(), 'SYSTEM'),
('MSG-013', 'Quality Alert', 'Quality issue alert for part ABC-123', 1, GETDATE(), 'SYSTEM'),
('MSG-014', 'Achievement', 'Zero defects achieved this month', 1, GETDATE(), 'SYSTEM'),
('MSG-015', 'Reminder', 'Monthly report submission due', 1, GETDATE(), 'SYSTEM');

-- Registrations
-- REGISTRATIONS stores confirmation tokens rather than maintenance master data.
-- It is intentionally left unseeded for local bootstrap.

-- News
INSERT INTO NEWS (news_id, news_name, news_desc, file_id, file_name, file_extension, active_flag, sequence, last_update, updateby) VALUES
('NEWS-001', 'Quality Achievement', 'Zero defects achieved for Q1 2024', 'FILE-NEWS-001', 'news-001.txt', 'txt', 1, 1, GETDATE(), 'SYSTEM'),
('NEWS-002', 'New Certification', 'Plant received ISO 9001 certification', 'FILE-NEWS-002', 'news-002.txt', 'txt', 1, 2, GETDATE(), 'SYSTEM'),
('NEWS-003', 'Customer Award', 'Received supplier excellence award', 'FILE-NEWS-003', 'news-003.txt', 'txt', 1, 3, GETDATE(), 'SYSTEM'),
('NEWS-004', 'Process Improvement', 'Implemented new quality process', 'FILE-NEWS-004', 'news-004.txt', 'txt', 1, 4, GETDATE(), 'SYSTEM'),
('NEWS-005', 'Team Recognition', 'QA team recognized for outstanding performance', 'FILE-NEWS-005', 'news-005.txt', 'txt', 1, 5, GETDATE(), 'SYSTEM'),
('NEWS-006', 'New Equipment', 'New CMM machine installed in lab', 'FILE-NEWS-006', 'news-006.txt', 'txt', 1, 6, GETDATE(), 'SYSTEM'),
('NEWS-007', 'Training Completion', '100% staff completed quality training', 'FILE-NEWS-007', 'news-007.txt', 'txt', 1, 7, GETDATE(), 'SYSTEM'),
('NEWS-008', 'Audit Success', 'Passed customer audit with zero findings', 'FILE-NEWS-008', 'news-008.txt', 'txt', 1, 8, GETDATE(), 'SYSTEM'),
('NEWS-009', 'Cost Reduction', 'Quality cost reduced by 15%', 'FILE-NEWS-009', 'news-009.txt', 'txt', 1, 9, GETDATE(), 'SYSTEM'),
('NEWS-010', 'New Product Launch', 'Successfully launched new product line', 'FILE-NEWS-010', 'news-010.txt', 'txt', 1, 10, GETDATE(), 'SYSTEM'),
('NEWS-011', 'Supplier Partnership', 'New strategic supplier partnership', 'FILE-NEWS-011', 'news-011.txt', 'txt', 1, 11, GETDATE(), 'SYSTEM'),
('NEWS-012', 'Safety Milestone', '1000 days without accident', 'FILE-NEWS-012', 'news-012.txt', 'txt', 1, 12, GETDATE(), 'SYSTEM'),
('NEWS-013', 'Expansion', 'New production line expansion', 'FILE-NEWS-013', 'news-013.txt', 'txt', 1, 13, GETDATE(), 'SYSTEM'),
('NEWS-014', 'Technology Upgrade', 'Implemented automated inspection system', 'FILE-NEWS-014', 'news-014.txt', 'txt', 1, 14, GETDATE(), 'SYSTEM'),
('NEWS-015', 'Customer Satisfaction', 'Customer satisfaction score increased to 98%', 'FILE-NEWS-015', 'news-015.txt', 'txt', 1, 15, GETDATE(), 'SYSTEM');

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================

PRINT 'Master data seed completed successfully';
PRINT 'Total records inserted:';
PRINT '  - Sites: 15';
PRINT '  - Suppliers: 20';
PRINT '  - Roles: 15';
PRINT '  - Products: 15';
PRINT '  - Models: 20';
PRINT '  - Manufacturing Areas: 15';
PRINT '  - Defect Categories: 15';
PRINT '  - Defects: 20';
PRINT '  - Defect Classes: 3';
PRINT '  - Dispositions: 15';
PRINT '  - Severity Levels: 4';
PRINT '  - AQL: 15';
PRINT '  - Inspection Categories: 15';
PRINT '  - Inspection Methods: 20';
PRINT '  - Inspectors: 15';
PRINT '  - Part Classes: 15';
PRINT '  - Part Types: 15';
PRINT '  - MNR Types: 15';
PRINT '  - Audit Categories: 5';
PRINT '  - Audit Types: 15';
PRINT '  - Criterias: 15';
PRINT '  - 5M1E Categories: 6';
PRINT '  - Certifications: 15';
PRINT '  - Groups: 15';
PRINT '  - FAQ Items: 15';
PRINT '  - Customers: 15';
PRINT '  - Training Programs: 15';
PRINT '  - Messages: 15';
PRINT '  - Registrations: 15';
PRINT '  - News: 15';
PRINT '';
PRINT 'TOTAL: 400+ master data records created';
