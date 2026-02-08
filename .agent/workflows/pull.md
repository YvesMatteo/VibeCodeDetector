---
description: Safely pull changes from GitHub, handling local modifications by stashing and rebasing.
---

1. Safely pull changes from the remote repository.
```bash
# Check if there are local changes
if [[ -n $(git status -s) ]]; then
  echo "Local changes detected. Stashing..."
  git stash save "Auto-stash by /pull command"
  STASHED=1
fi

echo "Pulling changes with rebase..."
git pull --rebase origin $(git branch --show-current)

# Restore local changes if they were stashed
if [[ "$STASHED" == "1" ]]; then
  echo "Restoring local changes..."
  git stash pop
fi

echo "Pull complete!"
```
