/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ANTLRErrorListener, CommonTokenStream, Parser } from 'antlr4ng';

/**
 * Mock implementation of OpenSearchPPLParser
 * In a real implementation, this would be the ANTLR-generated parser
 */
export class OpenSearchPPLParser {
  private tokenStream: CommonTokenStream;
  private errorListeners: ANTLRErrorListener[] = [];

  constructor(tokenStream: CommonTokenStream) {
    this.tokenStream = tokenStream;
    console.log('[PPL Parser] Created with token stream');
  }

  /**
   * Remove all error listeners
   */
  removeErrorListeners(): void {
    console.log('[PPL Parser] Removed error listeners');
    this.errorListeners = [];
  }

  /**
   * Add an error listener
   */
  addErrorListener(listener: ANTLRErrorListener): void {
    console.log('[PPL Parser] Added error listener');
    this.errorListeners.push(listener);
  }

  /**
   * Parse the root rule of the grammar
   * In a real implementation, this would parse the input according to the grammar
   */
  root(): void {
    console.log('[PPL Parser] Parsing root rule');
    
    // Get the input text
    const input = this.tokenStream.tokenSource.inputStream?.toString() || '';
    
    // Perform basic validation
    this.validateInput(input);
  }

  /**
   * Perform basic validation on the input
   * In a real implementation, this would be handled by the ANTLR parser
   */
  private validateInput(input: string): void {
    if (!input.trim()) return;
    
    // Check for basic syntax errors
    this.validateParentheses(input);
    this.validateQuotes(input);
    this.validatePipes(input);
  }

  /**
   * Validate parentheses balance
   */
  private validateParentheses(input: string): void {
    const openParens = (input.match(/\(/g) || []).length;
    const closeParens = (input.match(/\)/g) || []).length;
    
    if (openParens !== closeParens) {
      this.reportError('Unbalanced parentheses', 1, 1);
    }
  }

  /**
   * Validate quotes balance
   */
  private validateQuotes(input: string): void {
    this.validateQuoteChar(input, "'", 'single quote');
    this.validateQuoteChar(input, '"', 'double quote');
    this.validateQuoteChar(input, '`', 'backtick');
  }

  /**
   * Validate specific quote character balance
   */
  private validateQuoteChar(input: string, quoteChar: string, name: string): void {
    const regex = new RegExp(quoteChar, 'g');
    const quoteCount = (input.match(regex) || []).length;
    
    if (quoteCount % 2 !== 0) {
      this.reportError(`Unbalanced ${name}`, 1, 1);
    }
  }

  /**
   * Validate pipe commands
   */
  private validatePipes(input: string): void {
    const pipeSegments = input.split('|');
    
    for (let i = 0; i < pipeSegments.length; i++) {
      const segment = pipeSegments[i].trim();
      if (i > 0 && segment === '') {
        this.reportError('Incomplete pipe command', 1, input.indexOf('|', input.indexOf('|', 0) + 1));
      }
    }
  }

  /**
   * Report an error to all error listeners
   */
  private reportError(message: string, line: number, column: number): void {
    for (const listener of this.errorListeners) {
      listener.syntaxError(
        {} as Parser,
        null,
        line,
        column,
        message,
        null
      );
    }
  }
}