// Validate-only entry used by tools/content/validate.mjs and by the config repo workflow.
import { join } from 'node:path';
import { loadTree } from './load.mjs';
import { countLabel, formatErrors, lintTree, validateTree } from './validate.mjs';

/** Returns the process exit code: 0 when the tree is valid, 1 otherwise. */
export function validateMain({ root, env, argv, out = console.log, err = console.error, load = loadTree }) {
  const source = argv[0] ?? env.CONTENT_SRC ?? join(root, 'content-src');
  const tree = load(source);
  const errors = validateTree(tree);
  const warnings = lintTree(tree);
  if (warnings.length > 0) err(`content: ${countLabel(warnings.length, 'warning')}
${formatErrors(warnings)}`);
  if (errors.length > 0) {
    err(`content: ${errors.length} error${errors.length === 1 ? '' : 's'}\n${formatErrors(errors)}`);
    return 1;
  }
  out('content: valid');
  return 0;
}
