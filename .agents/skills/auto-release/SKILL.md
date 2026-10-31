---
name: auto-release
description: >-
  Automatically commit, push, and generate a new release after every code change,
  feature implementation, or bug fix. Ensures release titles and binary artifacts
  never include the version number.
---

# Auto Commit, Push & Release Skill

Whenever you implement any change, feature, or bug fix in the repository, you **must** complete the full delivery and release cycle before finishing your turn:

## Mandatory Workflow

1. **Verify & Build**
   - Run relevant verification scripts or `pnpm test` / `pnpm build` to make sure the change works cleanly.

2. **Commit & Push Changes**
   - Stage and commit your code changes with a Conventional Commits message (`feat:`, `fix:`, `chore:`, etc.):
     ```bash
     git add -A
     git commit -m "<type>(<scope>): <description>"
     git push origin main
     ```

3. **Generate a New Release**
   - Immediately trigger a new release using the automated release script:
     ```bash
     pnpm release:create patch
     ```
   - This bumps `package.json`, updates WinGet manifests, builds `dist/`, deletes older GitHub releases, commits the version bump, creates the `vX.Y.Z` git tag, and pushes both `main` and the tag to `origin` so GitHub Actions builds and publishes the release.

## Release Naming Rules (No Version Numbers)

- **Release Title**: Always use `"NeoChat Desktop"` without the version number (never `"NeoChat Desktop vX.Y.Z"`).
- **Binary Artifact Filenames**: Never include `${version}` in `electron-builder.yml` `artifactName` fields:
  - Windows NSIS: `NeoChat-desktop-Setup.exe`
  - Windows Portable: `NeoChat-desktop-Portable.exe`
  - macOS: `NeoChat-Desktop.dmg` / `NeoChat-Desktop.zip`
  - Linux: `NeoChat-Desktop.AppImage` / `NeoChat-Desktop.deb` / `NeoChat-Desktop.rpm`
