#!/usr/bin/env node
'use strict';
// Iranti edit-tracker hook — fires on PostToolUse for Edit/Write.
// Increments the write-debt counter so the PreToolUse write-guard knows
// the agent has pending unwritten edits.
//
// The write-debt file (.iranti-write-debt) is cleared by the MCP server
// when iranti_write is called, completing the enforcement loop.
//
// Falls through silently for non-Iranti projects.
const fs = require('fs');
const path = require('path');

const envFile = path.join(process.cwd(), '.env.iranti');
if (!fs.existsSync(envFile)) {
    process.exit(0);
}

let input = '';
try {
    input = fs.readFileSync(0, 'utf8');
} catch {
    process.exit(0);
}

let hookData;
try {
    hookData = JSON.parse(input);
} catch {
    process.exit(0);
}

const toolName = hookData.tool_name || hookData.toolName || '';
if (toolName !== 'Edit' && toolName !== 'Write') {
    process.exit(0);
}

const signalFile = path.join(process.cwd(), '.iranti-write-debt');
let debt = { pendingEdits: 0, edits: [] };

try {
    if (fs.existsSync(signalFile)) {
        debt = JSON.parse(fs.readFileSync(signalFile, 'utf8'));
    }
} catch {
    debt = { pendingEdits: 0, edits: [] };
}

const editedFile = hookData.tool_input?.file_path
    || hookData.input?.file_path
    || hookData.tool_input?.filePath
    || hookData.input?.filePath
    || 'unknown';

debt.pendingEdits = (debt.pendingEdits || 0) + 1;
debt.lastEditAt = new Date().toISOString();
debt.edits = debt.edits || [];
debt.edits.push({
    file: editedFile,
    at: debt.lastEditAt,
});

if (debt.edits.length > 20) {
    debt.edits = debt.edits.slice(-20);
}

try {
    fs.writeFileSync(signalFile, JSON.stringify(debt, null, 2), 'utf8');
} catch {
    // Can't write signal — that's okay, guard just won't fire
}

const output = JSON.stringify({
    hookEventName: 'PostToolUse',
    additionalContext: `Iranti: file edited (${path.basename(editedFile)}). ${debt.pendingEdits} pending edit(s) awaiting iranti_write. Write before making more edits.`,
});

require('fs').writeSync(1, output);
