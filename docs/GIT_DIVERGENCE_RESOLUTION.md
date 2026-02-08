# Git Divergence Resolution Documentation

> **Date:** February 8, 2026  
> **Repository:** outcome-master  
> **Resolved By:** Force push with backup preservation

---

## 📋 Table of Contents

1. [What Happened](#what-happened)
2. [The Problem](#the-problem)
3. [The Solution](#the-solution)
4. [Step-by-Step Resolution](#step-by-step-resolution)
5. [Available Backups](#available-backups)
6. [How to Recover](#how-to-recover)
7. [Lessons Learned](#lessons-learned)

---

## What Happened

Two developers were working on the same repository simultaneously without syncing:

| Developer | Work Done | Commits |
|-----------|-----------|---------|
| **Developer 1 (Other)** | WebSocket server, messaging system, feedback system, DB scripts | 19 commits |
| **Developer 2 (You)** | Analytics dashboards, CO/PO attainment, test suites, core fixes | 6 commits |

Both developers had committed their changes to their local `main` branch, but the branches had **diverged** because neither synced with remote before starting their work.

---

## The Problem

When trying to push, Git showed this error:

```
Your branch and 'origin/main' have diverged,
and have 6 and 19 different commits each, respectively.
```

This meant:
- **Local branch:** 6 commits ahead of the common ancestor
- **Remote branch:** 19 commits ahead of the common ancestor
- **Total divergence:** 676 files changed, ~114,575 lines affected

### Why a Normal Merge Wouldn't Work

A standard `git pull` would have caused **hundreds of merge conflicts** because:
- Both developers modified many of the same files
- The implementations had different approaches
- The local code was already fully tested and deployable

---

## The Solution

Since the local code was:
- ✅ Fully functional
- ✅ Tested and deployable
- ✅ The priority to keep

We chose **force push with backup preservation**:
1. Create backups of BOTH versions
2. Force push local code to remote
3. Preserve remote commits in a backup branch for future reference

---

## Step-by-Step Resolution

### Step 1: Check Current Status

```bash
git status
```

Output showed:
```
On branch main
Your branch and 'origin/main' have diverged,
and have 6 and 19 different commits each, respectively.
```

### Step 2: Fetch Latest Remote Changes

```bash
git fetch origin
```

### Step 3: Create Backup of Local Working Code

```bash
# Create a branch backup
git branch backup-local-working-state

# Create a tagged backup with timestamp
git tag backup-before-force-push-20260208-145120 HEAD
```

### Step 4: Create Backup of Remote Commits (Other Developer's Work)

```bash
# Create a branch pointing to remote
git branch backup-remote-19-commits origin/main

# Create a tag for easy reference
git tag backup-remote-19-commits origin/main
```

### Step 5: Verify Backups Exist

```bash
git branch -a
git tag -l
```

Output:
```
  backup-local-working-state
  backup-remote-19-commits
* main
  remotes/origin/main

Tags:
backup-before-force-push-20260208-145120
backup-remote-19-commits
```

### Step 6: Force Push Local to Remote

```bash
git push --force-with-lease origin main
```

> **Note:** `--force-with-lease` is safer than `--force` because it will fail if someone else pushed new commits while you were working.

Output:
```
+ d15ab94...e5a0ab5 main -> main (forced update)
```

### Step 7: Verify Sync is Complete

```bash
git fetch origin
git status
```

Output:
```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

---

## Available Backups

### Backup 1: Your Local Working Code

| Property | Value |
|----------|-------|
| **Branch Name** | `backup-local-working-state` |
| **Tag Name** | `backup-before-force-push-20260208-145120` |
| **Commit** | `e5a0ab5` |
| **Status** | Now live on `main` branch |

**Commits included:**
```
e5a0ab5 feat: Introduce comprehensive analytics dashboards, CO version history, trend charts
a2c28ff feat: Add comprehensive test suite including load, unit, and E2E tests
c08f8d9 feat: Introduce semester model, principal override, export functionality
b18eb49 feat: Implement core academic models, CO/PO analytics, RBAC enforcement
6d92fce feat: Enhance analytics with PO contribution, enrich cohort and exam responses
(+ 1 more)
```

### Backup 2: Other Developer's Remote Commits

| Property | Value |
|----------|-------|
| **Branch Name** | `backup-remote-19-commits` |
| **Tag Name** | `backup-remote-19-commits` |
| **Commit** | `d15ab94` |
| **Status** | Preserved locally only |

**Commits included:**
```
d15ab94 feat: Implement WebSocket server, database management scripts, Marks Entry page
0019173 feat: Implement real-time messaging context with WebSocket integration
0b73950 feat: Introduce real-time messaging system with chat UI components
61211f4 everything fixed up, set up Express application with middleware
99a509d basic feedback system implemented
(+ 14 more)
```

---

## How to Recover

This section covers **all possible recovery scenarios** you might need. Choose the one that matches your situation.

---

### 🔍 Scenario 1: Just Want to VIEW Other Developer's Code

**Purpose:** Browse files, understand what was implemented, without changing anything.

```bash
# Step 1: Switch to the backup branch
git checkout backup-remote-19-commits

# Step 2: Now you can browse all files
# Open in your IDE, run the app, explore everything
# The files are from the other developer's version

# Step 3: When done, switch back to main
git checkout main
```

> **Note:** Your working directory will change to show the backup code. Any uncommitted changes will be lost, so commit first!

---

### 📊 Scenario 2: Compare Differences Between Two Versions

**Purpose:** See exactly what's different between your code and the other developer's code.

```bash
# Compare ALL file differences
git diff main backup-remote-19-commits

# Compare only file NAMES (no content)
git diff --name-only main backup-remote-19-commits

# Compare specific file
git diff main backup-remote-19-commits -- src/pages/MarksEntry.tsx

# Compare specific folder
git diff main backup-remote-19-commits -- src/components/messaging/

# See which files exist ONLY in backup (not in main)
git diff --name-status main backup-remote-19-commits | grep "^A"

# See which files exist ONLY in main (deleted in backup)
git diff --name-status main backup-remote-19-commits | grep "^D"
```

**Tip:** For visual comparison, use:
```bash
# If you have VS Code
code --diff file1.tsx file2.tsx
```

---

### 📁 Scenario 3: Copy Specific Files from Backup to Main

**Purpose:** You need one or more specific files from the backup, not the whole commit.

```bash
# Step 1: Make sure you're on main
git checkout main

# Step 2: Copy a specific file from backup
git checkout backup-remote-19-commits -- src/components/messaging/ChatWindow.tsx

# Step 3: Copy an entire folder from backup
git checkout backup-remote-19-commits -- src/components/messaging/

# Step 4: The files are now in your working directory
# Review them, then commit
git add .
git commit -m "feat: Add messaging components from backup branch"
git push origin main
```

**Files you might want from backup (based on our analysis):**
- `src/components/messaging/` - Real-time chat components
- `src/contexts/MessagingContext.tsx` - Messaging state management
- `src/contexts/FeedbackContext.tsx` - Feedback system
- `src/pages/Messages.tsx` - Messages page
- `src/pages/StudentFeedback.tsx` - Feedback page
- `src/api/feedbackApi.ts` - Feedback API calls

---

### 🍒 Scenario 4: Cherry-Pick a SINGLE Commit

**Purpose:** You want to apply one specific commit from the backup (all changes in that commit).

```bash
# Step 1: Find the commit you want
git log --oneline backup-remote-19-commits
# Output:
# d15ab94 feat: Implement WebSocket server...
# 0019173 feat: Implement real-time messaging context...
# 0b73950 feat: Introduce real-time messaging system...
# ...

# Step 2: Cherry-pick the commit you want
git cherry-pick 0019173

# Step 3a: If NO conflicts - done! Commit is applied.
git push origin main

# Step 3b: If CONFLICTS occur:
# - Open the conflicting files in your editor
# - Look for <<<<<<< HEAD and >>>>>>> markers
# - Manually choose which code to keep
# - Save the files

# Step 4: After resolving all conflicts
git add .
git cherry-pick --continue

# Step 5: Push your changes
git push origin main
```

**To cancel a cherry-pick with conflicts:**
```bash
git cherry-pick --abort
```

---

### 🔀 Scenario 5: Cherry-Pick MULTIPLE Commits

**Purpose:** You want to apply several commits from the backup.

```bash
# Method 1: One by one
git cherry-pick abc1234
git cherry-pick def5678
git cherry-pick ghi9012

# Method 2: Range of commits (oldest..newest)
git cherry-pick abc1234^..ghi9012

# Method 3: Interactive (most control)
git cherry-pick -n abc1234 def5678 ghi9012
# -n means "no commit" - all changes staged but not committed
# This lets you review everything before one combined commit
git commit -m "feat: Add messaging and feedback features from backup"
```

---

### 🌿 Scenario 6: Create a Feature Branch to Work on Backup Features

**Purpose:** You want to carefully integrate backup features with testing before merging to main.

```bash
# Step 1: Create a new branch from main
git checkout main
git checkout -b feature/integrate-messaging

# Step 2: Cherry-pick or copy files from backup
git cherry-pick 0019173  # messaging context commit
# or
git checkout backup-remote-19-commits -- src/components/messaging/

# Step 3: Test everything works
npm run dev
# Run your app, test the features

# Step 4: If tests pass, push the feature branch
git push origin feature/integrate-messaging

# Step 5: Create a Pull Request on GitHub
# OR merge locally:
git checkout main
git merge feature/integrate-messaging
git push origin main
```

---

### ☁️ Scenario 7: Push Backup Branch to Remote (For Other Developers)

**Purpose:** Other team members need access to the backup branch.

```bash
# Push the backup branch to GitHub
git push origin backup-remote-19-commits

# Now others can access it:
git fetch origin
git checkout backup-remote-19-commits
```

**To also push the backup of your local code:**
```bash
git push origin backup-local-working-state
```

---

### ⚠️ Scenario 8: FULL ROLLBACK (Restore Other Developer's Code)

**Purpose:** Something went wrong with your code and you need to completely restore the other developer's version.

> ⚠️ **DANGER:** This will REPLACE all your current code on main with the backup version. Your 6 commits will become the backup instead.

```bash
# Step 1: Make sure you have a backup of current state
git branch emergency-backup-before-rollback

# Step 2: Switch to main
git checkout main

# Step 3: Reset main to the backup commits
git reset --hard backup-remote-19-commits

# Step 4: Force push to remote
git push --force-with-lease origin main

# Now main contains the other developer's 19 commits
# Your code is backed up in emergency-backup-before-rollback
```

**To undo this rollback:**
```bash
git checkout main
git reset --hard emergency-backup-before-rollback
# or use the original backup:
git reset --hard backup-local-working-state
git push --force-with-lease origin main
```

---

### 🔄 Scenario 9: Merge Both Codebases (Advanced)

**Purpose:** You want to combine BOTH versions - yours and the other developer's.

> ⚠️ **Warning:** This will likely cause many conflicts. Only do this if you have time to resolve them.

```bash
# Step 1: Create a merge branch
git checkout main
git checkout -b merge-both-versions

# Step 2: Attempt the merge
git merge backup-remote-19-commits

# You will see MANY conflicts
# CONFLICT (content): Merge conflict in src/App.tsx
# CONFLICT (content): Merge conflict in src/pages/MarksEntry.tsx
# ...

# Step 3: Resolve each conflict manually
# Open each file, look for:
# <<<<<<< HEAD
# (your code)
# =======
# (their code)
# >>>>>>> backup-remote-19-commits

# Choose which to keep, or combine both

# Step 4: After resolving ALL conflicts
git add .
git commit -m "merge: Combine local analytics with remote messaging features"

# Step 5: Test thoroughly before merging to main
npm run dev
npm run build
npm test

# Step 6: If all tests pass
git checkout main
git merge merge-both-versions
git push origin main
```

---

### 📋 Quick Recovery Reference Table

| I want to... | Command |
|--------------|---------|
| View backup code | `git checkout backup-remote-19-commits` |
| Return to my code | `git checkout main` |
| See file differences | `git diff main backup-remote-19-commits` |
| Copy one file from backup | `git checkout backup-remote-19-commits -- path/to/file` |
| Copy folder from backup | `git checkout backup-remote-19-commits -- path/to/folder/` |
| Apply one commit | `git cherry-pick <hash>` |
| Apply multiple commits | `git cherry-pick <hash1> <hash2> <hash3>` |
| Cancel failed cherry-pick | `git cherry-pick --abort` |
| Push backup to remote | `git push origin backup-remote-19-commits` |
| Full rollback to backup | `git reset --hard backup-remote-19-commits && git push --force-with-lease` |

---

## Lessons Learned

### ❌ What Went Wrong

1. Started working without pulling latest changes
2. Worked for several days without syncing
3. Both developers modified overlapping files

### ✅ Best Practices to Follow

1. **Always pull before starting work:**
   ```bash
   git pull origin main
   ```

2. **Commit and push frequently** (at least daily)

3. **Communicate with team** about which files/features you're working on

4. **Create feature branches** for longer work:
   ```bash
   git checkout -b feature/my-feature
   # work...
   git push origin feature/my-feature
   # Then create a Pull Request
   ```

5. **Before force pushing, ALWAYS create backups**

---

## Quick Reference Commands

| Action | Command |
|--------|---------|
| Check divergence status | `git status` |
| View all branches | `git branch -a` |
| View all tags | `git tag -l` |
| Create backup branch | `git branch backup-name` |
| Create backup tag | `git tag tag-name HEAD` |
| Force push safely | `git push --force-with-lease origin main` |
| Switch to backup | `git checkout backup-remote-19-commits` |
| Cherry-pick a commit | `git cherry-pick <hash>` |
| View commit history | `git log --oneline -10` |

---

## Files Affected Summary

The divergence involved approximately:
- **676 files changed**
- **~58,798 lines added** (in one version)
- **~55,777 lines deleted** (in one version)

Key areas of difference:
- `/src/pages/` - Multiple page implementations
- `/src/components/` - Dashboard and UI components
- `/src/hooks/` - Custom React hooks
- `/backend/` - Python FastAPI services
- `/src/contexts/` - React contexts

---

> **Document maintained by:** Development Team  
> **Last updated:** February 8, 2026
