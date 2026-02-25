import { z } from 'zod';
export const CreateFiveM1ESchema = z.object({
    body: z.object({
        title: z.string().min(3).optional(),
        supplier_id: z.number().int().positive().optional(),
        supplier_cn: z.string().optional(),
        vendor_id: z.string().optional(),
        item_id: z.string().optional(),
        site_id: z.number().int().positive().optional(),
        commodity_id: z.number().int().positive().optional(),
        model_id: z.number().int().positive().optional(),
        report_no: z.string().optional(),
        date_register: z.string().datetime().optional(),
        class_id: z.number().int().positive().optional(),
        class_type_id: z.number().int().positive().optional(),
        impact_date: z.string().optional(),
        engineer_remarks: z.string().optional(),
        attribute_01: z.string().optional(),
        attribute_02: z.string().optional(),
        attribute_03: z.string().optional(),
        attribute_04: z.string().optional(),
        status: z.string().default('DRAFT'),
    }),
});
export const UpdateFiveM1ESchema = z.object({
    params: z.object({
        id: z.string(), // We usually receive control_no or ID from params
    }),
    body: CreateFiveM1ESchema.shape.body.partial(),
});
