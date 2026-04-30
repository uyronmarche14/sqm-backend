-- =============================================================================
-- 5M1E FOREIGN KEY CONSTRAINTS (LEGACY NAMES)
-- =============================================================================
-- Targets: TBL_5M1E_Application

-- 1. PARTS (ItemID -> PARTS.part_id)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_5M1E_Parts')
BEGIN
    ALTER TABLE [dbo].[TBL_5M1E_Application] WITH CHECK 
    ADD CONSTRAINT [FK_5M1E_Parts] FOREIGN KEY([ItemID])
    REFERENCES [dbo].[PARTS] ([part_id]);

ALTER TABLE [dbo].[TBL_5M1E_Application] CHECK CONSTRAINT [FK_5M1E_Parts];

PRINT 'Added Constraint: FK_5M1E_Parts';

END

-- 2. SUPPLIERS (SupplierID -> SUPPLIERS.supplier_id)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_5M1E_Suppliers')
BEGIN
    ALTER TABLE [dbo].[TBL_5M1E_Application] WITH CHECK 
    ADD CONSTRAINT [FK_5M1E_Suppliers] FOREIGN KEY([SupplierID])
    REFERENCES [dbo].[SUPPLIERS] ([supplier_id]);

ALTER TABLE [dbo].[TBL_5M1E_Application] CHECK CONSTRAINT [FK_5M1E_Suppliers];

PRINT 'Added Constraint: FK_5M1E_Suppliers';

END

-- 3. SITES (SiteID -> MFG_SITES.site_id)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_5M1E_Sites')
BEGIN
    ALTER TABLE [dbo].[TBL_5M1E_Application] WITH CHECK 
    ADD CONSTRAINT [FK_5M1E_Sites] FOREIGN KEY([SiteID])
    REFERENCES [dbo].[MFG_SITES] ([site_id]);

ALTER TABLE [dbo].[TBL_5M1E_Application] CHECK CONSTRAINT [FK_5M1E_Sites];

PRINT 'Added Constraint: FK_5M1E_Sites';

END

-- 4. MODELS (ModelID -> MODELS.model_id)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_5M1E_Models')
BEGIN
    ALTER TABLE [dbo].[TBL_5M1E_Application] WITH CHECK 
    ADD CONSTRAINT [FK_5M1E_Models] FOREIGN KEY([ModelID])
    REFERENCES [dbo].[MODELS] ([model_id]);

ALTER TABLE [dbo].[TBL_5M1E_Application] CHECK CONSTRAINT [FK_5M1E_Models];

PRINT 'Added Constraint: FK_5M1E_Models';

END

-- 5. COMMODITIES / PART TYPES (CommodityID -> PARTTYPES.parttype_id)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_5M1E_Commodity')
BEGIN
    ALTER TABLE [dbo].[TBL_5M1E_Application] WITH CHECK 
    ADD CONSTRAINT [FK_5M1E_Commodity] FOREIGN KEY([CommodityID])
    REFERENCES [dbo].[PARTTYPES] ([parttype_id]);

ALTER TABLE [dbo].[TBL_5M1E_Application] CHECK CONSTRAINT [FK_5M1E_Commodity];

PRINT 'Added Constraint: FK_5M1E_Commodity';

END

GO