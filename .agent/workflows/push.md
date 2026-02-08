---
description: Safely push changes to GitHub. Automatically pulls remote changes (rebase) first to prevent conflicts.
---

1. Safely push changes to the remote repository.
```bash
BRANCH=$(git branch --show-current)
echo "Preparing to push to $BRANCH..."

# Check if we are ahead/behind
echo "Fetching latest changes..."
git fetch origin $BRANCH

# Pull changes first to ensure we are up to date (minimizing rejection)
echo "Integrating remote changes..."
git pull --rebase origin $BRANCH

# Push
echo "Pushing to remote..."
git push origin $BRANCH

echo "Push complete!"
```
