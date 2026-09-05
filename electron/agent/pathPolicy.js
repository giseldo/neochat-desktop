const fs = require('fs');
const path = require('path');

class WorkspaceBoundaryError extends Error {
  constructor(candidate, workspaceRoot) {
    super(`Path is outside the authorized workspace: ${candidate}`);
    this.name = 'WorkspaceBoundaryError';
    this.code = 'WORKSPACE_BOUNDARY_VIOLATION';
    this.workspaceRoot = workspaceRoot;
  }
}

function normalizeForComparison(value) {
  const normalized = path.resolve(value);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isWithinPath(parent, candidate) {
  const normalizedParent = normalizeForComparison(parent);
  const normalizedCandidate = normalizeForComparison(candidate);
  return normalizedCandidate === normalizedParent
    || normalizedCandidate.startsWith(`${normalizedParent}${path.sep}`);
}

function realpathExisting(value) {
  const realpath = fs.realpathSync.native || fs.realpathSync;
  return realpath(value);
}

function findExistingAncestor(candidate) {
  let current = candidate;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return current;
}

function resolveWorkspacePath(workspaceRoot, candidate = '.', options = {}) {
  if (typeof workspaceRoot !== 'string' || !workspaceRoot.trim()) {
    throw new TypeError('A valid workspace root is required.');
  }
  if (typeof candidate !== 'string' || !candidate.trim()) {
    throw new TypeError('A valid workspace-relative path is required.');
  }
  if (path.isAbsolute(candidate)) {
    throw new WorkspaceBoundaryError(candidate, path.resolve(workspaceRoot));
  }

  const lexicalRoot = path.resolve(workspaceRoot);
  if (!fs.existsSync(lexicalRoot) || !fs.statSync(lexicalRoot).isDirectory()) {
    throw new Error(`Workspace root does not exist or is not a directory: ${workspaceRoot}`);
  }

  const canonicalRoot = realpathExisting(lexicalRoot);
  const lexicalTarget = path.resolve(lexicalRoot, candidate);
  if (!isWithinPath(lexicalRoot, lexicalTarget)) {
    throw new WorkspaceBoundaryError(candidate, canonicalRoot);
  }

  const existingAncestor = findExistingAncestor(lexicalTarget);
  if (!existingAncestor) throw new WorkspaceBoundaryError(candidate, canonicalRoot);
  const canonicalAncestor = realpathExisting(existingAncestor);
  if (!isWithinPath(canonicalRoot, canonicalAncestor)) {
    throw new WorkspaceBoundaryError(candidate, canonicalRoot);
  }

  const unresolvedSuffix = path.relative(existingAncestor, lexicalTarget);
  const canonicalTarget = path.resolve(canonicalAncestor, unresolvedSuffix);
  if (!isWithinPath(canonicalRoot, canonicalTarget)) {
    throw new WorkspaceBoundaryError(candidate, canonicalRoot);
  }
  if (options.mustExist && !fs.existsSync(canonicalTarget)) {
    throw new Error(`Path does not exist: ${candidate}`);
  }
  return canonicalTarget;
}

module.exports = { WorkspaceBoundaryError, isWithinPath, resolveWorkspacePath };
