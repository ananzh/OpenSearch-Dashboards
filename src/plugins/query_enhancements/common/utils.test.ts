/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { throwFacetError } from './utils';

describe('throwFacetError', () => {
  it('should throw an error with message from response.data.body.message', () => {
    const response = {
      data: {
        body: {
          message: 'test error message',
        },
        status: '400',
      },
    };

    expect(() => throwFacetError(response)).toThrowError();
    try {
      throwFacetError(response);
    } catch (err: any) {
      expect(err.message).toBe('test error message');
      expect(err.name).toBe('400');
      expect(err.status).toBe('400');
    }
  });

  it('should throw an error with message from response.data.body if it is a string', () => {
    const response = {
      data: {
        body: 'string error message',
        status: '500',
      },
    };

    expect(() => throwFacetError(response)).toThrowError();
    try {
      throwFacetError(response);
    } catch (err: any) {
      expect(err.message).toBe('string error message');
      expect(err.name).toBe('500');
      expect(err.status).toBe('500');
    }
  });

  it('should throw an error with message from response.data if body is undefined', () => {
    const response = {
      data: {
        message: 'fallback error message',
        status: '404',
      },
    };

    expect(() => throwFacetError(response)).toThrowError();
    try {
      throwFacetError(response);
    } catch (err: any) {
      expect(err.message).toBe('"fallback error message"');
      expect(err.name).toBe('404');
      expect(err.status).toBe('404');
    }
  });

  it('should throw an error with message from Error object', () => {
    const error = new Error('error object message');
    const response = {
      data: error,
    };

    expect(() => throwFacetError(response)).toThrowError();
    try {
      throwFacetError(response);
    } catch (err: any) {
      expect(err.message).toBe('error object message');
      expect(err.name).toBeUndefined();
      expect(err.status).toBeUndefined();
    }
  });

  it('should throw an error with stringified message if response.data.body is a plain object', () => {
    const response = {
      data: {
        body: { key: 'value' },
        status: '400',
      },
    };

    expect(() => throwFacetError(response)).toThrowError();
    try {
      throwFacetError(response);
    } catch (err: any) {
      expect(err.message).toBe('{"key":"value"}');
      expect(err.name).toBe('400');
      expect(err.status).toBe('400');
    }
  });

  it('should throw an error with default message if no valid message is found', () => {
    const response = {
      data: {},
    };

    expect(() => throwFacetError(response)).toThrowError();
    try {
      throwFacetError(response);
    } catch (err: any) {
      expect(err.message).toBe('{}');
      expect(err.name).toBeUndefined();
      expect(err.status).toBeUndefined();
    }
  });
});
