# CRITICAL: Restore src/app/page.tsx

I accidentally broke the page.tsx file during editing. Here's how to fix it:

## Option 1: Restore from Git (RECOMMENDED)
Run this in PowerShell or Command Prompt:

```bash
cd "c:\Users\kirpe\Downloads\simplycrm\simplycrm\wacrm"
git checkout src/app/page.tsx
```

This will restore the file to the last committed version (which has the try-catch fix).

## Option 2: Manual Restore
If Option 1 doesn't work:
1. Go to your git repository
2. Open `.git/index` or use a Git GUI
3. Restore `src/app/page.tsx` to the committed version

## Verification
After restoring, check that `src/app/page.tsx` has:
- ✅ A `LandingPage()` component (around lines 11-397)
- ✅ An `export default async function HomePage()` (around line 399)
- ✅ `try { ... } catch { return <LandingPage /> }` block

Then commit and push:
```bash
git add src/app/page.tsx
git commit -m "fix: restore page.tsx"
git push
```

Wait 2-3 minutes for Vercel to redeploy, then test.
