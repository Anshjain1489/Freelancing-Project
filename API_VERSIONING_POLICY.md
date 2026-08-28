# API Versioning & Backward Compatibility Policy 📌

## 1. Versioning Scheme
Chaudhary Kirana Store API follows URL-based semver versioning (`/api/v1/...`).

## 2. Backward Compatibility Rules
- **Non-Breaking Changes**: Adding new fields to API responses, introducing optional query parameters, or creating new endpoints. These are released directly under `/api/v1`.
- **Breaking Changes**: Removing properties, renaming fields, altering field data types, or changing authentication requirements. Breaking changes require a major version bump (`/api/v2/...`).

## 3. Deprecation Cycle
Deprecated endpoints emit an `X-API-Deprecated: true` response header and `Sunset` HTTP header specifying the 90-day sunset date before total retirement.
