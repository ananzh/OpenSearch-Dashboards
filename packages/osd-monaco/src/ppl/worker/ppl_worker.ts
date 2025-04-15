/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable-next-line @osd/eslint/module_migration */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export interface PPLSyntaxError {
  message: string;
  line: number;
  column: number;
  length: number;
}

/**
 * Worker implementation for PPL syntax validation
 */
export class PPLWorker {
  constructor(private ctx: monaco.worker.IWorkerContext) {}

  /**
   * Validates a PPL query and returns any syntax errors
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
      console.log('[PPL Worker] Starting validation process');
      // Since we can't directly use ANTLR in the worker due to import issues,
      // we'll use a simpler approach to detect basic syntax errors
      const errors: PPLSyntaxError[] = [];
      
      console.log('[PPL Worker] Analyzing query structure');

      // Check for unbalanced parentheses
      console.log('[PPL Worker] Checking for unbalanced parentheses');
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;
      console.log(`[PPL Worker] Found ${openParens} opening parentheses and ${closeParens} closing parentheses`);
      
      if (openParens !== closeParens) {
        console.log('[PPL Worker] Detected unbalanced parentheses');
        // Find the position of the unbalanced parenthesis
        let line = 1;
        let column = 1;
        let stack = 0;

        for (let i = 0; i < code.length; i++) {
          if (code[i] === '(') {
            stack++;
            console.log(`[PPL Worker] Found opening parenthesis at line ${line}, column ${column}, stack: ${stack}`);
          } else if (code[i] === ')') {
            stack--;
            console.log(`[PPL Worker] Found closing parenthesis at line ${line}, column ${column}, stack: ${stack}`);
            if (stack < 0) {
              // Extra closing parenthesis
              console.log(`[PPL Worker] Detected extra closing parenthesis at line ${line}, column ${column}`);
              errors.push({
                message: 'Unbalanced parenthesis: extra closing parenthesis',
                line,
                column,
                length: 1,
              });
              break;
            }
          } else if (code[i] === '\n') {
            console.log(`[PPL Worker] Found newline, incrementing line number from ${line} to ${line + 1}`);
            line++;
            column = 0;
          }
          column++;
        }

        if (stack > 0) {
          // Missing closing parenthesis
          errors.push({
            message: 'Unbalanced parenthesis: missing closing parenthesis',
            line,
            column: 1,
            length: 1,
          });
        }
      }

      // Check for unbalanced quotes
      const checkQuotes = (quoteChar: string, name: string) => {
        const regex = new RegExp(quoteChar, 'g');
        const quoteCount = (code.match(regex) || []).length;

        if (quoteCount % 2 !== 0) {
          // Find the position of the unbalanced quote
          let line = 1;
          let column = 1;
          let inQuote = false;

          for (let i = 0; i < code.length; i++) {
            if (code[i] === quoteChar) {
              inQuote = !inQuote;
            } else if (code[i] === '\n') {
              line++;
              column = 0;
            }
            column++;
          }

          if (inQuote) {
            errors.push({
              message: `Unbalanced ${name}: missing closing ${name}`,
              line,
              column, // Use the column variable here instead of hardcoding to 1
              length: 1,
            });
          }
        }
      };

      checkQuotes("'", 'single quote');
      checkQuotes('"', 'double quote');
      checkQuotes('`', 'backtick');

      // Check for incomplete pipe commands
      const pipeSegments = code.split('|');
      for (let i = 0; i < pipeSegments.length; i++) {
        const segment = pipeSegments[i].trim();
        if (i > 0 && segment === '') {
          // Find the line and column of this empty pipe segment
          const pipeIndex = code.indexOf('|', code.indexOf('|', 0) + 1);
          let line = 1;
          let column = 1;

          for (let j = 0; j < pipeIndex; j++) {
            if (code[j] === '\n') {
              line++;
              column = 0;
            }
            column++;
          }

          errors.push({
            message: 'Incomplete pipe command',
            line,
            column,
            length: 1,
          });
        }
      }

      // Check for basic PPL command syntax
      if (
        !code.toLowerCase().trim().startsWith('search') &&
        !code.toLowerCase().trim().startsWith('source=')
      ) {
        errors.push({
          message: 'PPL query must start with a search command',
          line: 1,
          column: 1,
          length: Math.min(code.length, 10),
        });
      }

      console.log('[PPL Worker] Validation complete, found errors:', errors);
      return errors;
    } catch (e) {
      // Return error without logging to console
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
}
