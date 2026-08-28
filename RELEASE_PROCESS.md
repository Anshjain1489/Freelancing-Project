# Release Management & Change Control Policy 🚀

## 1. Release Process Workflow
1. **Feature Branch & PR**: All changes must pass GitHub Actions CI/CD suites (`backend-ci.yml`, `frontend-ci.yml`).
2. **Pre-Deployment Check**: Execute `node backend/src/scripts/preDeploymentCheck.js`.
3. **Automated Test Suite**: Execute Phase 35–42 automated test suites (must achieve 100% pass rate).
4. **Tag Release**: Create semver Git tag (e.g. `v1.0.0`).
5. **Production Deployment**: Deploy backend via PM2 and frontend bundle to static host.

## 2. Release Approval Matrix
- Minor updates require Staff Software Engineer review.
- Major releases require QA Lead, Security Architect, and Product Lead sign-offs.
