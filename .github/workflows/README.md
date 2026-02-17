# GitHub Actions Workflows

This directory contains automated workflows for the MMM-YandexWeather module.

## Workflows

### 1. PR Quality Checks (`pr-checks.yml`)

**Triggers:**
- Pull requests to `main` or `develop` branches
- Pushes to `main` branch

**Jobs:**

#### Quality Checks
Runs on Node.js 18.x, 20.x, and 22.x:
- ✅ ESLint code linting
- ✅ Security audit (npm audit)
- ✅ Check for outdated dependencies
- ✅ Validate JSON files
- ✅ Check file sizes
- ✅ Detect console.log statements
- ✅ Scan for hardcoded secrets

#### Build & Integration Test
- ✅ Verify module structure
- ✅ Check required files
- ✅ Validate translations

#### Summary
- Aggregates results from all jobs
- Fails if any check fails

**Usage:**
Automatically runs on every PR. Ensure all checks pass before merging.

---

### 2. Release (`release.yml`)

**Triggers:**
- Tags matching `v*.*.*` (e.g., `v1.0.0`)

**Jobs:**

#### Pre-release Quality Checks
- ✅ ESLint validation
- ✅ Security audit
- ✅ JSON validation

#### Create GitHub Release
- 📦 Creates release archive (ZIP)
- 🔒 Generates SHA256 checksums
- 📝 Extracts changelog from CHANGELOG.md
- 🚀 Creates GitHub release with:
  - Release notes
  - Installation instructions
  - Downloadable archive
  - Checksums

**Usage:**
```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# This will automatically:
# 1. Run quality checks
# 2. Create release archive
# 3. Publish GitHub release
```

---

### 3. Dependency Check (`dependency-check.yml`)

**Triggers:**
- Schedule: Every Monday at 9:00 UTC
- Manual: workflow_dispatch

**Jobs:**

#### Check Dependencies
- 🔍 Checks for outdated packages
- 🔒 Runs security audit
- 📝 Creates GitHub issue if vulnerabilities found

#### Auto-update Dependencies (manual only)
- 🔄 Updates dependencies
- 🔧 Applies security fixes
- 📬 Creates PR with updates

**Usage:**

**Automatic (weekly):**
- Runs every Monday
- Creates issue if problems found

**Manual:**
```bash
# Go to Actions tab → Dependency Check → Run workflow
# This will create a PR with dependency updates
```

---

## Status Badges

Add these badges to your README.md:

```markdown
[![PR Checks](https://github.com/YOUR_USERNAME/MMM-YandexWeather/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/YOUR_USERNAME/MMM-YandexWeather/actions/workflows/pr-checks.yml)
[![Release](https://github.com/YOUR_USERNAME/MMM-YandexWeather/actions/workflows/release.yml/badge.svg)](https://github.com/YOUR_USERNAME/MMM-YandexWeather/actions/workflows/release.yml)
```

---

## Required Secrets

No secrets required - workflows use default `GITHUB_TOKEN`.

---

## Configuration

### Matrix Testing (pr-checks.yml)

Test on multiple Node.js versions:
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]
```

### Schedule (dependency-check.yml)

Modify cron schedule:
```yaml
schedule:
  - cron: '0 9 * * 1'  # Every Monday at 9:00 UTC
```

---

## Troubleshooting

### Workflow fails with "npm ci" error
- Check `package-lock.json` is committed
- Ensure Node.js version compatibility

### Release not created
- Verify tag format: `v1.0.0` (must start with 'v')
- Check CHANGELOG.md has entry for version

### Dependency PR not created
- Ensure workflow is run manually via workflow_dispatch
- Check repository permissions for GitHub Actions

---

## Best Practices

1. **Always run checks locally first:**
   ```bash
   ./check.sh
   ```

2. **Update CHANGELOG.md before release:**
   - Add version section
   - Document all changes

3. **Test module after dependency updates:**
   - Run in MagicMirror instance
   - Verify all features work

4. **Review auto-generated PRs:**
   - Don't auto-merge dependency updates
   - Test breaking changes

---

## Contributing

When adding new workflows:
1. Test locally with [act](https://github.com/nektos/act)
2. Document in this README
3. Add appropriate triggers
4. Include error handling
