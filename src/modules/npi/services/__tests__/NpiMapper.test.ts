/**
 * NpiMapper Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { NpiMapper } from '../NpiMapper';

describe('NpiMapper', () => {
  const mapper = new NpiMapper();

  describe('toListDTO', () => {
    it('should map database record to list DTO', () => {
      const record = {
        npi_lot_id: '123',
        control_no: 'NPI-001',
        request_status: 'DR',
        datecreated: new Date('2024-01-01'),
        site_name: 'Tokyo Plant',
        supplier_name: 'ABC Corp'
      };

      const result = mapper.toListDTO(record);

      expect(result.status).toBe('draft');
      expect(result.created_at).toEqual(record.datecreated);
      expect(result.control_no).toBe('NPI-001');
    });

    it('should handle missing status gracefully', () => {
      const record = {
        npi_lot_id: '123',
        control_no: 'NPI-001',
        request_status: null,
        datecreated: new Date()
      };

      const result = mapper.toListDTO(record);

      expect(result).toBeDefined();
    });
  });

  describe('toListDTOs', () => {
    it('should map multiple records', () => {
      const records = [
        { npi_lot_id: '1', control_no: 'NPI-001', request_status: 'DR', datecreated: new Date() },
        { npi_lot_id: '2', control_no: 'NPI-002', request_status: 'SU', datecreated: new Date() }
      ];

      const result = mapper.toListDTOs(records);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('draft');
      expect(result[1].status).toBe('submitted');
    });

    it('should handle empty array', () => {
      const result = mapper.toListDTOs([]);
      expect(result).toEqual([]);
    });
  });

  describe('toDetailDTO', () => {
    it('should map record with all relations', () => {
      const data = {
        record: {
          npi_lot_id: '123',
          control_no: 'NPI-001',
          request_status: 'AP',
          site_name: 'Tokyo Plant'
        },
        attachments: [{ file_name: 'test.pdf' }],
        visual_categories: [{ defect_id: '1' }],
        data_categories: [{ partdatacategory_name: 'Dimension' }],
        dimension_categories: [{ partdimensioncategory_name: 'Length' }],
        cc_list: [{ user_id: 'user1' }]
      };

      const result = mapper.toDetailDTO(data);

      expect(result.status).toBe('approved');
      expect(result.attachments).toHaveLength(1);
      expect(result.visual_categories).toHaveLength(1);
      expect(result.data_categories).toHaveLength(1);
      expect(result.dimension_categories).toHaveLength(1);
      expect(result.cc_list).toHaveLength(1);
    });

    it('should handle missing relations', () => {
      const data = {
        record: {
          npi_lot_id: '123',
          control_no: 'NPI-001',
          request_status: 'DR'
        },
        attachments: [],
        visual_categories: [],
        data_categories: [],
        dimension_categories: [],
        cc_list: []
      };

      const result = mapper.toDetailDTO(data);

      expect(result.attachments).toEqual([]);
      expect(result.visual_categories).toEqual([]);
    });
  });

  describe('parseDate', () => {
    it('should parse valid date string', () => {
      const result = mapper.parseDate('2024-01-01');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should parse Date object', () => {
      const date = new Date('2024-01-01');
      const result = mapper.parseDate(date);
      expect(result).toEqual(date);
    });

    it('should return null for invalid date', () => {
      const result = mapper.parseDate('invalid-date');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = mapper.parseDate(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = mapper.parseDate(undefined);
      expect(result).toBeNull();
    });
  });
});
