# OpenSearch Dashboards Monaco Editor Integration

This package provides Monaco Editor integration for OpenSearch Dashboards, including language support for PPL (Piped Processing Language) and SQL.

## Features

- Syntax highlighting for PPL and SQL
- Error validation for PPL and SQL queries
- Autocomplete suggestions for PPL and SQL
- Worker-based processing for performance

## PPL Language Support

The PPL language support includes:

1. **Syntax Highlighting**: Provided by Monaco's token provider
2. **Error Validation**: Basic validation for PPL syntax
3. **Autocomplete**: Command suggestions for PPL queries

### Architecture

The PPL language support is implemented using a worker-based architecture:

```
┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │
│  Monaco Editor  │◄────►│  PPL Worker     │
│  (Main Thread)  │      │  (Web Worker)   │
│                 │      │                 │
└─────────────────┘      └─────────────────┘
```

- **Main Thread**: Registers the PPL language, sets up the worker, and handles UI interactions
- **Worker Thread**: Performs validation and provides autocomplete suggestions

### Files

- `src/ppl/language.ts`: Registers the PPL language and sets up validation and autocomplete
- `src/ppl/worker/ppl.worker.ts`: Entry point for the PPL worker
- `src/ppl/worker/ppl_worker.ts`: Implementation of the PPL worker
- `src/xjson/lexer_rules/opensearchppl.ts`: Defines the PPL language syntax for highlighting

### ANTLR Integration

The implementation uses ANTLR-based parsing for comprehensive validation and context-aware autocomplete:

1. **Grammar Definition**: ANTLR grammar files (`OpenSearchPPLLexer.g4` and `OpenSearchPPLParser.g4`) define the PPL language syntax
2. **Generated Parser**: TypeScript files (`OpenSearchPPLLexer.ts` and `OpenSearchPPLParser.ts`) are generated from the grammar
3. **Direct Imports**: The worker directly imports these generated files for validation and autocomplete
4. **Fallback Mechanism**: If ANTLR parsing fails, the system falls back to basic validation

This approach provides several benefits:
- Single source of truth for the PPL language definition
- Comprehensive validation based on the formal grammar
- Context-aware autocomplete suggestions
- Graceful degradation when ANTLR isn't available

## Troubleshooting

### Worker Loading Issues

If the worker fails to load, check the following:

1. Ensure the worker file is being properly built and available at the expected path
2. Check the browser console for any errors related to worker initialization
3. Verify that the worker URL is correctly resolved relative to the application URL

### Syntax Highlighting Issues

If syntax highlighting is not working:

1. Ensure the language is properly registered with Monaco
2. Check that the token provider is correctly set up
3. Verify that the language ID matches between registration and usage

### Validation and Autocomplete Issues

If validation or autocomplete is not working:

1. Check the browser console for any errors in the worker initialization
2. Verify that the worker is properly communicating with the main thread
3. Ensure the model language ID is correctly set to "PPL"

### Monaco Editor Errors

If you encounter errors like `hitResult is null` or other Monaco-related errors:

1. Ensure proper range handling in the completion provider
2. Check that the completion items have valid ranges
3. Make sure the language provider properly sets up ranges for completion items
4. Verify that the editor is properly initialized before attempting to use it

## Building

To build the Monaco package:

```bash
cd packages/osd-monaco
yarn build
```

This will generate the worker files in the `target/public` directory.