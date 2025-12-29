# Git Versioning Strategy

**Commit at every phase. No "where did the canvas go?" panic.**

## Phase Commits

1. **Phase 1**: `[Phase 1] UI: Stupid version - plain buttons, mock server integration`
2. **Phase 2**: `[Phase 2] UI: Connected to real backend endpoints`
3. **Phase 3**: `[Phase 3] UI: Real model integration`
4. **Phase 4**: `[Phase 4] UI: Real AI assistant integration`
5. **Phase 5**: `[Phase 5] UI: Added drag & drop, zoom, icons`
6. **Phase 6**: `[Phase 6] UI: Polish & animations`

## Branch Strategy

- `main` - Latest working version
- `phase-1-stupid-ui` - Stupid version (plain buttons)
- `phase-2-real-backend` - Real backend integration
- `phase-3-real-models` - Real model integration
- `phase-4-real-ai` - Real AI integration
- `phase-5-fancy-ui` - Fancy UI features
- `phase-6-polish` - Polish & animations

## Rollback Strategy

**Never delete branches. Keep them forever. They're your safety net.**

### Common Rollback Scenarios

1. **Hate Zero framework?**
   ```bash
   git checkout phase-1-stupid-ui
   # Start over with different framework
   ```

2. **Canvas broke?**
   ```bash
   git checkout phase-2-real-backend
   # Canvas was working here, go back
   ```

3. **Fancy UI too complex?**
   ```bash
   git checkout phase-4-real-ai
   # Simple UI that works with real AI
   ```

4. **Need to compare phases?**
   ```bash
   git diff phase-1-stupid-ui phase-5-fancy-ui
   # See what changed
   ```

## Commit Message Format

```
[Phase X] UI: Brief description

- What changed
- What works
- What doesn't work yet
```

Example:
```
[Phase 1] UI: Stupid version - plain buttons, mock server integration

- Added plain HTML buttons for all features
- Chat interface works with mock server
- Stack management works with mock server
- No fancy features yet (that's Phase 5)
```

## Tagging Strategy

Tag each phase for easy reference:

```bash
git tag phase-1-stupid-ui
git tag phase-2-real-backend
git tag phase-3-real-models
git tag phase-4-real-ai
git tag phase-5-fancy-ui
git tag phase-6-polish
```

Then you can:
```bash
git checkout phase-1-stupid-ui  # or use tag
```

## Workflow

1. **Start Phase 1**: Create branch `phase-1-stupid-ui`
2. **Build stupid UI**: Plain buttons, mock server
3. **Commit**: `[Phase 1] UI: Stupid version - plain buttons, mock server integration`
4. **Tag**: `git tag phase-1-stupid-ui`
5. **Merge to main**: `git checkout main && git merge phase-1-stupid-ui`
6. **Start Phase 2**: Create branch `phase-2-real-backend`
7. **Repeat for each phase**

## Safety Rules

1. **Never force push to main** - Main is sacred
2. **Never delete phase branches** - They're your safety net
3. **Always commit before switching phases** - No half-done work
4. **Always test before committing** - Each phase must work
5. **Always document what works/doesn't** - Future you will thank you

## Emergency Rollback

If everything breaks:

```bash
# Find last working phase
git log --oneline | grep "Phase"

# Checkout that phase
git checkout phase-X-working-phase

# Create emergency branch
git checkout -b emergency-fix

# Fix issues
# ...

# Commit fix
git commit -m "[Emergency] Fixed critical issue"

# Merge back to main
git checkout main
git merge emergency-fix
```

