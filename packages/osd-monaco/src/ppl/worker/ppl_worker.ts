/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable-next-line @osd/eslint/module_migration */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

// Import ANTLR runtime and generated files
// Import ANTLR runtime and generated files
import { CharStream, CommonTokenStream } from 'antlr4ng';
import { OpenSearchPPLLexer } from '../generated/OpenSearchPPLLexer';
import { OpenSearchPPLParser } from '../generated/OpenSearchPPLParser';

console.log('[PPL Worker] Successfully imported ANTLR and generated files');

export interface PPLSyntaxError {
  message: string;
  line: number;
  column: number;
  length: number;
}

/**
 * Custom error listener for ANTLR parser
 */
class SyntaxErrorListener {
  public errors: PPLSyntaxError[] = [];

  syntaxError(recognizer: any, offendingSymbol: any, line: number, column: number, msg: string, e: any): void {
    console.log(`[PPL Worker] ANTLR Error: ${msg} at line ${line}:${column}`);
    
    this.errors.push({
      message: msg,
      line,
      column: column + 1, // Convert to 1-based indexing for Monaco
      length: offendingSymbol?.text?.length || 1,
    });
  }
  
  // Required by ANTLR but not used for our purposes
  reportAmbiguity(): void {}
  reportAttemptingFullContext(): void {}
  reportContextSensitivity(): void {}
}

/**
 * Worker implementation for PPL syntax validation and autocomplete using ANTLR
 */
export class PPLWorker {
  private pplKeywords: string[] = [
    'search', 'where', 'fields', 'rename', 'stats', 'dedup', 'sort', 'eval',
    'head', 'top', 'rare', 'parse', 'source', 'index', 'by', 'as', 'desc', 'asc'
  ];
  
  private pplFunctions: string[] = [
    'avg', 'count', 'sum', 'min', 'max', 'abs', 'ceil', 'floor', 'round',
    'sqrt', 'concat', 'lower', 'upper', 'replace', 'substring', 'trim',
    'date_format', 'now', 'timestamp'
  ];

  constructor(private ctx: monaco.worker.IWorkerContext) {
    console.log('[PPL Worker] PPLWorker instance created');
  }

  /**
   * Provides context-aware autocomplete suggestions for PPL
   */
  async doComplete(modelUri: string, position: monaco.Position): Promise<monaco.languages.CompletionList> {
    console.log('[PPL Worker] doComplete called for model:', modelUri, 'at position:', position);
    
    const model = this.ctx.getMirrorModels().find((m: any) => m.uri.toString() === modelUri);
    if (!model) {
      console.log('[PPL Worker] Model not found for autocomplete');
      return { suggestions: [] };
    }

    const code = model.getValue();
    const wordAtPosition = this._getWordAtPosition(code, position);
    console.log('[PPL Worker] Word at position:', wordAtPosition);
    
    // Get the text up to the cursor position to determine context
    const textUntilPosition = this._getTextUntilPosition(code, position);
    console.log('[PPL Worker] Text until position:', textUntilPosition);
    
    // Determine the context for suggestions
    const suggestions: monaco.languages.CompletionItem[] = [];
    
    // If at the beginning of a line or document, suggest commands
    if (this._isAtStartOfLine(textUntilPosition) || !textUntilPosition.trim()) {
      suggestions.push(this._createCompletionItem('search', 'Search command', 'The search command is the primary command for retrieving data'));
      suggestions.push(this._createCompletionItem('source=', 'Source specification', 'Specify the data source'));
      suggestions.push(this._createCompletionItem('describe', 'Describe command', 'Describe the structure of a data source'));
      suggestions.push(this._createCompletionItem('show datasources', 'Show datasources command', 'List available data sources'));
    }
    // If after a pipe character, suggest pipe commands
    else if (this._isAfterPipe(textUntilPosition)) {
      suggestions.push(this._createCompletionItem('where', 'Where clause', 'Filter results based on conditions'));
      suggestions.push(this._createCompletionItem('fields', 'Fields command', 'Select specific fields to include in the results'));
      suggestions.push(this._createCompletionItem('stats', 'Stats command', 'Calculate statistics on the results'));
      suggestions.push(this._createCompletionItem('sort', 'Sort command', 'Sort results by specified fields'));
      suggestions.push(this._createCompletionItem('dedup', 'Dedup command', 'Remove duplicate results'));
      suggestions.push(this._createCompletionItem('eval', 'Eval command', 'Calculate and add new fields to the results'));
      suggestions.push(this._createCompletionItem('head', 'Head command', 'Return the first N results'));
    }
    // If after 'stats' command, suggest aggregation functions
    else if (this._isAfterCommand(textUntilPosition, 'stats')) {
      suggestions.push(this._createCompletionItem('avg(', 'Average function', 'Calculate the average of a field'));
      suggestions.push(this._createCompletionItem('sum(', 'Sum function', 'Calculate the sum of a field'));
      suggestions.push(this._createCompletionItem('count()', 'Count function', 'Count the number of records'));
      suggestions.push(this._createCompletionItem('min(', 'Minimum function', 'Find the minimum value of a field'));
      suggestions.push(this._createCompletionItem('max(', 'Maximum function', 'Find the maximum value of a field'));
    }
    // If after 'by' keyword, suggest fields
    else if (this._isAfterKeyword(textUntilPosition, 'by')) {
      // In a real implementation, we would get field names from the index
      suggestions.push(this._createCompletionItem('timestamp', 'Field', 'Timestamp field'));
      suggestions.push(this._createCompletionItem('host', 'Field', 'Host field'));
      suggestions.push(this._createCompletionItem('message', 'Field', 'Message field'));
      suggestions.push(this._createCompletionItem('status', 'Field', 'Status field'));
    }
    // Default to showing all keywords and functions
    else {
      // Add all keywords
      this.pplKeywords.forEach(keyword => {
        suggestions.push(this._createCompletionItem(keyword, 'Keyword', `PPL keyword: ${keyword}`));
      });
      
      // Add all functions
      this.pplFunctions.forEach(func => {
        suggestions.push(this._createCompletionItem(func, 'Function', `PPL function: ${func}`));
      });
    }
    
    return { suggestions };
  }

  /**
   * Helper method to create a completion item
   */
  private _createCompletionItem(label: string, detail: string, documentation: string): monaco.languages.CompletionItem {
    return {
      label,
      kind: detail === 'Function' ? monaco.languages.CompletionItemKind.Function : monaco.languages.CompletionItemKind.Keyword,
      insertText: label,
      detail,
      documentation,
      // Provide a dummy range that will be overridden by the language provider
      range: {
        startLineNumber: 0,
        startColumn: 0,
        endLineNumber: 0,
        endColumn: 0
      }
    };
  }

  /**
   * Helper method to get the word at a specific position in the text
   */
  private _getWordAtPosition(text: string, position: monaco.Position): string {
    const lines = text.split('\n');
    if (position.lineNumber > lines.length) {
      return '';
    }
    
    const line = lines[position.lineNumber - 1];
    let start = position.column - 1;
    
    // Find the start of the word
    while (start > 0 && /[\w]/.test(line[start - 1])) {
      start--;
    }
    
    // Find the end of the word
    let end = position.column - 1;
    while (end < line.length && /[\w]/.test(line[end])) {
      end++;
    }
    
    return line.substring(start, end);
  }
  
  /**
   * Helper method to get text until the current position
   */
  private _getTextUntilPosition(text: string, position: monaco.Position): string {
    const lines = text.split('\n');
    if (position.lineNumber > lines.length) {
      return '';
    }
    
    let result = '';
    
    // Add all lines before the current line
    for (let i = 0; i < position.lineNumber - 1; i++) {
      result += lines[i] + '\n';
    }
    
    // Add the current line up to the cursor position
    result += lines[position.lineNumber - 1].substring(0, position.column - 1);
    
    return result;
  }
  
  /**
   * Helper method to check if cursor is at the start of a line
   */
  private _isAtStartOfLine(text: string): boolean {
    const lastNewlineIndex = text.lastIndexOf('\n');
    if (lastNewlineIndex === -1) {
      return text.trim().length === 0;
    }
    
    return text.substring(lastNewlineIndex + 1).trim().length === 0;
  }
  
  /**
   * Helper method to check if cursor is after a pipe character
   */
  private _isAfterPipe(text: string): boolean {
    const trimmed = text.trimRight();
    return trimmed.endsWith('|');
  }
  
  /**
   * Helper method to check if cursor is after a specific command
   */
  private _isAfterCommand(text: string, command: string): boolean {
    const trimmed = text.trimRight();
    const words = trimmed.split(/\s+/);
    return words.length > 0 && words[words.length - 1].toLowerCase() === command.toLowerCase();
  }
  
  /**
   * Helper method to check if cursor is after a specific keyword
   */
  private _isAfterKeyword(text: string, keyword: string): boolean {
    const trimmed = text.trimRight();
    const words = trimmed.split(/\s+/);
    return words.length > 0 && words[words.length - 1].toLowerCase() === keyword.toLowerCase();
  }

  /**
   * Validates a PPL query using ANTLR parser and returns any syntax errors
   */
  async validate(modelUri: string): Promise<PPLSyntaxError[]> {
    console.log('[PPL Worker] validate called for model:', modelUri);
    const model = this.ctx.getMirrorModels().find((m: any) => m.uri.toString() === modelUri);
    if (!model) {
      console.log('[PPL Worker] Model not found');
      return [];
    }

    const code = model.getValue();
    console.log('[PPL Worker] Code to validate:', code);
    
    if (!code.trim()) {
      console.log('[PPL Worker] Empty code, no errors');
      return []; // Empty query, no errors
    }

    try {
      // Always use ANTLR for validation
      console.log('[PPL Worker] Using ANTLR for validation');
      return this._validateWithANTLR(code);
    } catch (e) {
      console.error('[PPL Worker] Error during validation:', e);
      return [
        {
          message: `Error validating query: ${e.message || 'Unknown error'}`,
          line: 1,
          column: 1,
          length: code.length,
        },
      ];
    }
  }
  
  /**
   * Validates a PPL query using ANTLR parser
   */
  private _validateWithANTLR(code: string): PPLSyntaxError[] {
    try {
      console.log('[PPL Worker] Starting ANTLR validation process');
      
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
      console.log('[PPL Worker] Parsing query with ANTLR');
      parser.root();
      
      // Check for basic PPL command syntax if no ANTLR errors were found
      if (errorListener.errors.length === 0 && code.trim()) {
        const trimmedCode = code.toLowerCase().trim();
        if (!trimmedCode.startsWith('search') &&
            !trimmedCode.startsWith('source=') &&
            !trimmedCode.startsWith('source =') &&
            !trimmedCode.startsWith('describe') &&
            !trimmedCode.startsWith('show datasources')) {
          console.log('[PPL Worker] Query does not start with a valid command');
          errorListener.errors.push({
            message: 'PPL query must start with a valid command (search, source=, describe, show datasources)',
            line: 1,
            column: 1,
            length: Math.min(code.length, 10),
          });
        }
      }
      
      console.log('[PPL Worker] ANTLR validation complete, found errors:', errorListener.errors);
      return errorListener.errors;
    } catch (e) {
      console.error('[PPL Worker] Error during ANTLR validation:', e);
      
      // Return a generic error message
      return [{
        message: `Error validating query: ${e.message || 'Unknown error'}`,
        line: 1,
        column: 1,
        length: code.length,
      }];
    }
  }
  
  /**
   * Basic validation for PPL syntax without ANTLR
   */
  private _validateBasic(code: string): PPLSyntaxError[] {
    console.log('[PPL Worker] Starting basic validation process');
    const errors: PPLSyntaxError[] = [];
    
    // Basic validation for PPL syntax
    const trimmedCode = code.toLowerCase().trim();
    
    // Check if query starts with a valid command
    if (!trimmedCode.startsWith('search') &&
        !trimmedCode.startsWith('source=') &&
        !trimmedCode.startsWith('source =') &&
        !trimmedCode.startsWith('describe') &&
        !trimmedCode.startsWith('show datasources')) {
      console.log('[PPL Worker] Query does not start with a valid command');
      errors.push({
        message: 'PPL query must start with a valid command (search, source=, describe, show datasources)',
        line: 1,
        column: 1,
        length: Math.min(code.length, 10),
      });
    }
    
    // Check for unbalanced parentheses
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      console.log('[PPL Worker] Unbalanced parentheses');
      errors.push({
        message: 'Unbalanced parentheses',
        line: 1,
        column: 1,
        length: 1,
      });
    }
    
    // Check for unbalanced quotes
    const singleQuotes = (code.match(/'/g) || []).length;
    const doubleQuotes = (code.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      console.log('[PPL Worker] Unbalanced single quotes');
      errors.push({
        message: 'Unbalanced single quotes',
        line: 1,
        column: 1,
        length: 1,
      });
    }
    if (doubleQuotes % 2 !== 0) {
      console.log('[PPL Worker] Unbalanced double quotes');
      errors.push({
        message: 'Unbalanced double quotes',
        line: 1,
        column: 1,
        length: 1,
      });
    }
    
    // Check for incomplete pipe commands
    const pipes = code.split('|');
    for (let i = 1; i < pipes.length; i++) {
      const pipe = pipes[i].trim();
      if (!pipe) {
        console.log('[PPL Worker] Incomplete pipe command');
        errors.push({
          message: 'Incomplete pipe command',
          line: 1,
          column: code.indexOf('|', code.indexOf('|', 0) + 1),
          length: 1,
        });
      }
    }
    
    console.log('[PPL Worker] Basic validation complete, found errors:', errors);
    return errors;
  }
}
