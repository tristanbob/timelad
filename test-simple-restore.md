# Testing Simplified Restore Implementation

This document explains how to test the new simplified restore functionality.

## Setup

The simplified restore implementation is controlled by an environment variable:

```bash
# Enable simplified restore
set TIMELAD_SIMPLE_RESTORE=true

# Disable simplified restore (use original)
set TIMELAD_SIMPLE_RESTORE=false
```

## Implementation Summary

### New Methods Added:
- `createRestoreCommitSimple(commitHash, repoPath)` - Uses simple Git porcelain commands
- `restoreVersionSimple(commit, repoPath, skipConfirmation)` - Simplified restore flow

### Feature Flag Integration:
- Main `restoreVersion()` method checks `USE_SIMPLE_RESTORE` flag
- If enabled, delegates to `restoreVersionSimple()`
- If disabled, uses original complex implementation

## Key Differences

### Original Implementation:
```bash
# Complex Git plumbing commands
git read-tree <commit-hash>
git write-tree  
git commit-tree <tree> -p <parent>
git update-ref refs/heads/<branch>
git reset --hard
```

### Simplified Implementation:
```bash
# Simple Git porcelain commands
git checkout <commit-hash> -- .
git add .
git commit -m "Restore to version X"
```

## Testing Strategy

### 1. Manual Testing
1. Set environment variable: `TIMELAD_SIMPLE_RESTORE=true`
2. Use TimeLad to restore to a previous version
3. Verify:
   - Same user experience
   - Same commit message format
   - Same safety guarantees
   - Bidirectional time travel works (v5→v3→v5)

### 2. Comparison Testing
1. Test same restore operation with both implementations
2. Compare:
   - Final repository state (should be identical)
   - Commit messages (should match format)
   - Git history (both preserve history)
   - Error handling (both recover gracefully)

### 3. Edge Case Testing
- Restoring with uncommitted changes
- Restoring binary files
- Restoring with file deletions/renames
- Network interruption during restore
- Large repository performance

## Expected Benefits

### Complexity Reduction:
- **Lines of code**: ~50% reduction in restore methods
- **Git commands**: 8+ operations → 3 operations  
- **Temporary files**: 2 temp files → 0 temp files
- **Error paths**: Multiple complex recovery → Simple reset recovery

### Maintainability:
- Uses standard Git commands developers understand
- Easier to debug and troubleshoot
- Fewer dependencies on temporary file operations
- Cleaner error handling

### Same Functionality:
- ✅ Bidirectional time travel (v5→v3→v5)
- ✅ No history rewriting
- ✅ Same safety guarantees
- ✅ Same commit message format
- ✅ Same user confirmation flow

## Rollback Plan

If issues are discovered:
1. Set `TIMELAD_SIMPLE_RESTORE=false`
2. Extension immediately reverts to original implementation
3. No functionality lost
4. Can investigate and fix simplified version

## Next Steps

1. ✅ Implementation complete with feature flag
2. ✅ Compilation successful
3. ✅ Existing tests pass
4. 🔄 Manual testing in development
5. 🔄 Performance comparison
6. 🔄 Edge case validation
7. 🔄 Production rollout with monitoring

## Success Criteria

- [ ] Same user experience as original
- [ ] Same or better performance
- [ ] No regressions in functionality
- [ ] Cleaner, more maintainable code
- [ ] Easier debugging and troubleshooting