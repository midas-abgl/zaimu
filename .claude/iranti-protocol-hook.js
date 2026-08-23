#!/usr/bin/env node
'use strict';
// Iranti protocol reminder hook — fires on UserPromptSubmit for any Iranti project.
// Cross-platform: runs on Windows, macOS, Linux via Node.js.
// Exits cleanly with no output for non-Iranti projects.
const fs = require('fs');
const path = require('path');

const envFile = path.join(process.cwd(), '.env.iranti');
if (!fs.existsSync(envFile)) process.exit(0);

const content = [
  'IRANTI PROTOCOL (required this turn):',
  '1. iranti_attend(phase=pre-response) BEFORE replying',
  '2. iranti_attend BEFORE each Read / Grep / Glob / Bash / WebSearch / WebFetch',
  '3. iranti_write AFTER each Edit or Write:',
  '   entity: project/[id]/file/[filename] -- not the broad project entity',
  '   value must include: absolutePath, lines, before, after, verify, why',
  '4. iranti_write AFTER each Bash that reveals system state (build, errors, ports, env)',
  '5. iranti_write AFTER each WebSearch/WebFetch -- write findings AND dead ends / 404s',
  '6. iranti_attend(phase=post-response) AFTER every response without exception',
].join('\n') + '\n';
require('fs').writeSync(1, content);
