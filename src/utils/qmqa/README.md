# QMQA Utilities

This directory contains utility modules for the QMQA (Quality Meeting / Quality Audit) backend integration.

## Modules

### 1. Control Number Generator (`control-no-generator.js`)

Generates unique control numbers for QMQA records with proper prefixes.

**Features:**
- Generates control numbers in format `P-YYYY-NNN` (schedule-based) or `YYYY-NNN` (direct)
- Validates control number format
- Extracts year from control numbers
- Checks if control number is schedule-based

**Key Functions:**
- `generateControlNo(year, fromSchedule)` - Generate new control number
- `validateControlNo(controlNo)` - Validate format
- `extractYear(controlNo)` - Extract year
- `isScheduleBased(controlNo)` - Check if from schedule

### 2. Status Mapper (`status-mapper.js`)

Maps between database status codes and frontend status names.

**Status Mappings:**
- `PL` ↔ `PLANNED`
- `DR` ↔ `DRAFT`
- `AW` ↔ `AWAITING_APPROVAL`
- `AP` ↔ `APPROVED`
- `RJ` ↔ `REJECTED`
- `IS` ↔ `ISSUED`
- `CN` ↔ `CANCELLED`
- `IR` ↔ `WITH_INITIAL_REPORT`
- `FR` ↔ `WITH_FINAL_REPORT`
- `RA` ↔ `RESPONSE_AWAITING_APPROVAL`
- `RR` ↔ `RESPONSE_REJECTED`
- `CL` ↔ `CLOSED`

**Key Functions:**
- `toDBStatus(status)` - Convert frontend name to DB code
- `fromDBStatus(code)` - Convert DB code to frontend name
- `isValidStatusCode(code)` - Validate status code
- `isValidStatusName(name)` - Validate status name
- `getStatusInfo(statusCodeOrName)` - Get full status information

### 3. Response Formatter (`response-formatter.js`)

Formats API responses with consistent structure and camelCase field names.

**Features:**
- Converts snake_case to camelCase
- Formats schedule records
- Formats full audit records
- Formats supplier response data
- Formats attachments and CC list entries
- Provides success/error response wrappers
- Generates pagination metadata

**Key Functions:**
- `formatSchedule(dbRecord)` - Format schedule record
- `formatRecord(dbRecord)` - Format full audit record
- `formatResponse(dbResponse)` - Format supplier response
- `formatAttachment(dbAttachment)` - Format attachment
- `formatCCEntry(dbCC)` - Format CC list entry
- `formatSuccessResponse(data, meta)` - Wrap success response
- `formatErrorResponse(message, details)` - Wrap error response
- `formatPaginationMeta(total, page, pageSize)` - Generate pagination metadata

## Usage

```javascript
import { 
    generateControlNo, 
    validateControlNo 
} from './utils/qmqa/control-no-generator.js';

import { 
    toDBStatus, 
    fromDBStatus 
} from './utils/qmqa/status-mapper.js';

import { 
    formatRecord, 
    formatSuccessResponse 
} from './utils/qmqa/response-formatter.js';

// Generate control number
const controlNo = await generateControlNo(2024, true); // "P-2024-001"

// Convert status
const dbStatus = toDBStatus('DRAFT'); // "DR"
const frontendStatus = fromDBStatus('DR'); // "DRAFT"

// Format response
const formattedRecord = formatRecord(dbRecord);
const response = formatSuccessResponse(formattedRecord);
```

## Testing

Run the test script to verify all utilities:

```bash
node sqm-backend/src/utils/qmqa/test-utilities.js
```

## Requirements Satisfied

This implementation satisfies the following requirements from the QMQA Backend Integration spec:

- **Requirement 2.1**: Control number generation with P- prefix for schedules
- **Requirement 2.2**: Control number generation without prefix for direct audits
- **Requirement 2.3**: Control number prefix preservation from schedules
- **Requirement 19.4**: CamelCase field name conversion
- **Requirement 19.5**: Related entity names included in responses
