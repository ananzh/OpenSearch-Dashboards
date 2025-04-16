/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CharStream, Token, TokenSource } from 'antlr4ng';

/**
 * Mock implementation of OpenSearchPPLLexer
 * In a real implementation, this would be the ANTLR-generated lexer
 */
export class OpenSearchPPLLexer implements TokenSource {
  private input: CharStream;

  constructor(input: CharStream) {
    this.input = input;
    console.log('[PPL Lexer] Created with input');
  }

  // Required methods from TokenSource interface
  nextToken(): Token {
    // In a real implementation, this would tokenize the input
    return {} as Token;
  }

  get line(): number {
    return 1;
  }

  get column(): number {
    return 0;
  }

  get sourceName(): string {
    return 'PPL';
  }

  get inputStream(): CharStream {
    return this.input;
  }

  get tokenFactory(): any {
    return null;
  }
}