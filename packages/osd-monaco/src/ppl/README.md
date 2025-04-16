# ANTLR-Based PPL Validation for Monaco Editor

This implementation provides ANTLR-based validation and autocomplete for PPL (Piped Processing Language) in Monaco Editor.

## Key Concept: Pre-Generated ANTLR Files

This implementation uses **pre-generated** ANTLR files:

1. The ANTLR grammar files (OpenSearchPPLParser.g4 and OpenSearchPPLLexer.g4) are processed during the build phase
2. The generated TypeScript files are stored in `src/ppl/generated/` directory
3. At runtime, these pre-generated files are imported and used by the worker
4. No grammar processing happens at runtime, making the validation efficient

## Implementation Overview

### 1. Language Registration

The PPL language is registered early in the Monaco initialization process:

```typescript
// In language.ts
monaco.languages.register({ id: PPL_LANGUAGE_ID });
```

### 2. Worker Registration

A dedicated worker is registered for PPL validation:

```typescript
// In language.ts
const workerSrc = 'ppl.editor.worker.js';
const registered = registerWorker(PPL_LANGUAGE_ID, workerSrc);
```

### 3. ANTLR Integration

The worker uses ANTLR-generated files for validation:

```typescript
// In ppl_worker.ts
import { CharStream, CommonTokenStream } from 'antlr4ng';
import { OpenSearchPPLLexer } from '../generated/OpenSearchPPLLexer';
import { OpenSearchPPLParser } from '../generated/OpenSearchPPLParser';

// Create ANTLR lexer and parser
const input = CharStream.fromString(code);
const lexer = new OpenSearchPPLLexer(input);
const tokenStream = new CommonTokenStream(lexer);
const parser = new OpenSearchPPLParser(tokenStream);
```

### 4. Webpack Configuration

The webpack configuration bundles ANTLR with the worker:

```javascript
// In webpack.config.js
resolve: {
  alias: {
    'antlr4ng': path.resolve(__dirname, '../../node_modules/antlr4ng'),
    '../generated': path.resolve(__dirname, 'src/ppl/generated')
  }
}
```

## How It Works

1. When a PPL query is entered in the editor, the Monaco Editor calls the PPL worker to validate it
2. The worker creates an ANTLR lexer and parser from the input
3. The parser validates the query against the grammar rules
4. Any syntax errors are collected and returned as Monaco editor markers
5. The markers are displayed in the editor as error squiggles

## Benefits

- **Single Source of Truth**: The grammar files define the complete syntax of PPL
- **Automatic Updates**: When the grammar changes, validation logic automatically updates
- **Comprehensive Validation**: The parser catches all syntax errors defined in the grammar
- **Maintainability**: No need to duplicate validation logic in multiple places

## Troubleshooting

If you encounter issues with the ANTLR-based validation:

1. Check the browser console for error messages
2. Verify that the PPL language is registered (`Language PPL exists: true`)
3. Ensure the worker is properly registered and loaded
4. Check that the ANTLR-generated files are correctly imported

## Development

To modify the PPL validation:

1. Update the grammar files if needed
2. Run `yarn osd bootstrap` to regenerate the ANTLR files
3. Modify the worker implementation as needed
4. Build and test the changes