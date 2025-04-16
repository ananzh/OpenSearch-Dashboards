# Production Implementation of ANTLR-Based PPL Validation

This document explains how ANTLR-based validation for PPL is implemented in a production environment.

## Integration with OpenSearch Dashboards

The ANTLR code generation is fully integrated with the OpenSearch Dashboards build process:

1. **Automatic Generation During Bootstrap**:
   - The `osd:bootstrap` script in the Monaco package runs the ANTLR code generation
   - This happens automatically when you run `yarn osd bootstrap`

2. **No Additional Steps Required**:
   - You don't need to run any additional commands
   - Just use the standard OSD workflow:
     ```bash
     yarn osd bootstrap
     yarn start
     ```

## Implementation Details

### 1. ANTLR Code Generation

The code generation script (`generate-antlr.js`):
- Uses the ANTLR tool to generate TypeScript code from the grammar files
- Fixes imports in the generated files to use `antlr4ng` instead of `antlr4ts`
- Outputs the generated files to `src/ppl/generated`

### 2. Webpack Configuration

The webpack configuration bundles the ANTLR runtime and generated files with the worker:

```javascript
// In webpack.config.js
resolve: {
  alias: {
    '@antlr/ppl': path.resolve(__dirname, 'src/ppl/generated')
  }
},
externals: {
  // Exclude antlr4ng from the bundle if it's already available in the main bundle
  ...(lang === 'ppl' ? {} : { antlr4ng: 'antlr4ng' })
}
```

### 3. Worker Implementation

The PPL worker uses the ANTLR-generated files for validation:

```typescript
// In ppl_worker.ts
import { OpenSearchPPLLexer } from '@antlr/ppl/OpenSearchPPLLexer';
import { OpenSearchPPLParser } from '@antlr/ppl/OpenSearchPPLParser';

// Create ANTLR lexer and parser
const input = CharStream.fromString(code);
const lexer = new OpenSearchPPLLexer(input);
const tokenStream = new CommonTokenStream(lexer);
const parser = new OpenSearchPPLParser(tokenStream);

// Set up error listener
parser.removeErrorListeners();
const errorListener = new SyntaxErrorListener();
parser.addErrorListener(errorListener);

// Parse the query - this will trigger syntax error reporting
parser.root();
```

## Validation Process

When a PPL query is entered in the editor:

1. The Monaco Editor calls the PPL worker to validate the query
2. The worker creates an ANTLR lexer from the input string
3. The worker creates a token stream from the lexer
4. The worker creates a parser from the token stream
5. The worker adds a custom error listener to collect syntax errors
6. The parser validates the query against the grammar rules
7. Any syntax errors are collected and returned as Monaco editor markers
8. The markers are displayed in the editor as error squiggles

## Benefits

Using ANTLR for validation offers several advantages:

1. **Single Source of Truth**: The grammar files define the complete syntax of PPL
2. **Automatic Updates**: When the grammar changes, validation logic automatically updates
3. **Comprehensive Validation**: The parser catches all syntax errors defined in the grammar
4. **Maintainability**: No need to duplicate validation logic in multiple places
5. **Seamless Integration**: Fully integrated with the OpenSearch Dashboards build process

## Troubleshooting

If you encounter issues with the ANTLR-based validation:

1. Check that the ANTLR tool is installed correctly (only needed for development)
2. Verify that the grammar files are valid
3. Check the generated files in `src/ppl/generated`
4. Ensure the webpack configuration is correct
5. Check the worker registration in `language.ts`
6. Look for errors in the browser console

### Common Bootstrap Issues

If you encounter bootstrap errors:

1. **Dependency Version Conflicts**:
   - Ensure the dependency versions in package.json match the main OpenSearch Dashboards package
   - Key dependencies to check: antlr4ng, monaco-editor, webpack, babel-loader

2. **Module Resolution Issues**:
   - Ensure the package has a proper entry point (index.js)
   - Include TypeScript declaration files (index.d.ts)
   - Set the correct "main" and "types" fields in package.json

3. **Circular Dependencies**:
   - Avoid requiring built files in the index.js entry point
   - Instead, export a simple object with stubs for the required functions:
   ```javascript
   // Export a simple object to avoid circular dependencies during bootstrap
   module.exports = {
     monaco: require('monaco-editor'),
     BarePluginApi: require('monaco-editor/esm/vs/editor/editor.api'),
     registerWorker: function() { return true; },
     getWorker: function() { return null; },
     initialize: function() { return null; }
   };
   ```

4. **Webpack Configuration**:
   - Use a hash function compatible with webpack 4 (hashFunction: 'md4')
   - Ensure the externals configuration is correct

## Conclusion

This implementation provides a robust and maintainable way to validate PPL queries in Monaco Editor, leveraging the formal grammar definition to provide comprehensive syntax validation, all seamlessly integrated with the OpenSearch Dashboards build process.