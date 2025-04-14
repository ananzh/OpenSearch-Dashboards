/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable-next-line @osd/eslint/module_migration */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export interface SQLSyntaxError {
  message: string;
  line: number;
  column: number;
  length: number;
}

/**
 * Worker implementation for SQL syntax validation
 */
export class SQLWorker {
  constructor(private ctx: monaco.worker.IWorkerContext) {}

  /**
   * Validates a SQL query and returns any syntax errors
   */
  async validate(modelUri: string): Promise<SQLSyntaxError[]> {
    const model = this.ctx.getMirrorModels().find((m: any) => m.uri.toString() === modelUri);
    if (!model) {
      return [];
    }

    const code = model.getValue();
    if (!code.trim()) {
      return []; // Empty query, no errors
    }

    try {
      // Implement basic SQL syntax validation
      const errors: SQLSyntaxError[] = [];

      // Check for unbalanced parentheses
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        // Find the position of the unbalanced parenthesis
        let line = 1;
        let column = 1;
        let stack = 0;

        for (let i = 0; i < code.length; i++) {
          if (code[i] === '(') {
            stack++;
          } else if (code[i] === ')') {
            stack--;
            if (stack < 0) {
              // Extra closing parenthesis
              errors.push({
                message: 'Unbalanced parenthesis: extra closing parenthesis',
                line,
                column,
                length: 1,
              });
              break;
            }
          } else if (code[i] === '\n') {
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

      // Check for basic SQL syntax
      if (
        !code.toLowerCase().trim().startsWith('select') &&
        !code.toLowerCase().trim().startsWith('show') &&
        !code.toLowerCase().trim().startsWith('describe') &&
        !code.toLowerCase().trim().startsWith('explain')
      ) {
        errors.push({
          message: 'SQL query must start with SELECT, SHOW, DESCRIBE, or EXPLAIN',
          line: 1,
          column: 1,
          length: Math.min(code.length, 10),
        });
      }

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
