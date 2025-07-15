# Code Cleanup Plan

## Issues Identified

### 1. Outdated TODO Comments
- `src/discovery/crypto.ts` - Still has TODO comments about implementing AES encryption when MIB-003 is complete, but we already have full crypto implementation
- `src/discoveryClient.ts` - Same outdated TODO comments about AES encryption

### 2. Console.log Statements in Production Code
- Multiple console.log/warn/error statements throughout the codebase
- Should be replaced with proper logging system or removed from production modules

### 3. Duplicate Type Definitions
- `ContactInfo` interface is defined in multiple places:
  - `src/crypto/types.ts`
  - `src/discovery/types.ts` 
  - `src/crypto.ts`
  - `src/discoveryClient.ts`

### 4. Disabled Key Validation
- TODO comment about re-enabling key pair validation in validator files
- This should be addressed or properly documented

### 5. Orphaned Code Patterns
- Some modular functions may not be used yet
- Original monolithic files still exist alongside modular versions

## Cleanup Actions

### Phase 1: Remove Outdated TODO Comments
- Update discovery crypto functions to use proper AES encryption
- Remove placeholder implementations

### Phase 2: Consolidate Type Definitions
- Create single source of truth for shared types
- Update imports accordingly

### Phase 3: Clean Up Console Statements
- Replace with proper logging or remove from production code
- Keep essential user-facing messages in CLI modules

### Phase 4: Address Key Validation
- Either fix or properly document the disabled validation

### Phase 5: Remove Debug Code
- Clean up any remaining debug statements
- Ensure production-ready code quality
