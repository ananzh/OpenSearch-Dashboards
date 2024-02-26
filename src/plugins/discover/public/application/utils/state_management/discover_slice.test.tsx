/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { discoverSlice, DiscoverState } from './discover_slice';
import { SortOrder } from '../../../saved_searches/types';

describe('discoverSlice', () => {
  let initialState: DiscoverState;

  beforeEach(() => {
    initialState = {
      columns: [],
      sort: [],
    };
  });

  it('should handle setState', () => {
    const newState = {
      columns: ['column1', 'column2'],
      sort: [['field1', 'asc']],
    };
    const action = { type: 'discover/setState', payload: newState };
    const result = discoverSlice.reducer(initialState, action);
    expect(result).toEqual(newState);
  });

  it('should handle addColumn', () => {
    const action1 = { type: 'discover/addColumn', payload: { column: 'column1' } };
    const result1 = discoverSlice.reducer(initialState, action1);
    expect(result1.columns).toEqual(['column1']);
  });

  it('should handle removeColumn', () => {
    initialState = {
      columns: ['column1', 'column2'],
      sort: [['column1', 'asc']],
    };
    const action = { type: 'discover/removeColumn', payload: 'column1' };
    const result = discoverSlice.reducer(initialState, action);
    expect(result.columns).toEqual(['column2']);
    expect(result.sort).toEqual([]);
  });

  it('should handle reorderColumn', () => {
    initialState = {
      columns: ['column1', 'column2', 'column3'],
      sort: [],
    };
    const action = {
      type: 'discover/reorderColumn',
      payload: { source: 0, destination: 2 },
    };
    const result = discoverSlice.reducer(initialState, action);
    expect(result.columns).toEqual(['column2', 'column3', 'column1']);
  });

  it('should handle setColumns', () => {
    const action = {
      type: 'discover/setColumns',
      payload: { columns: ['column1', 'column2'] },
    };
    const result = discoverSlice.reducer(initialState, action);
    expect(result.columns).toEqual(['column1', 'column2']);
  });

  it('should handle setSort', () => {
    const action = { type: 'discover/setSort', payload: [['field1', 'asc']] };
    const result = discoverSlice.reducer(initialState, action);
    expect(result.sort).toEqual([['field1', 'asc']]);
  });

  it('should handle updateState', () => {
    initialState = {
      columns: ['column1', 'column2'],
      sort: [['field1', 'asc']],
    };
    const action = {
      type: 'discover/updateState',
      payload: { sort: [['field2', 'desc']] },
    };
    const result = discoverSlice.reducer(initialState, action);
    expect(result.sort).toEqual([['field2', 'desc']]);
  });

  it('should handle moveColumn', () => {
    initialState = {
      columns: ['column1', 'column2', 'column3'],
      sort: [],
    };
    const action = {
      type: 'discover/moveColumn',
      payload: { columnName: 'column2', destination: 0 },
    };
    const result = discoverSlice.reducer(initialState, action);
    expect(result.columns).toEqual(['column2', 'column1', 'column3']);
  });

  it('should maintain columns order when moving a column to its current position', () => {
    initialState = {
      columns: ['column1', 'column2', 'column3'],
      sort: [],
    };
    const action = {
      type: 'discover/moveColumn',
      payload: { columnName: 'column2', destination: 1 },
    };
    const result = discoverSlice.reducer(initialState, action);
    expect(result.columns).toEqual(['column1', 'column2', 'column3']);
  });

  it('should handle moveColumn when destination is out of range', () => {
    initialState = {
      columns: ['column1', 'column2', 'column3'],
      sort: [],
    };
    const action = {
      type: 'discover/moveColumn',
      payload: { columnName: 'column1', destination: 5 },
    };
    const result = discoverSlice.reducer(initialState, action);
    expect(result.columns).toEqual(['column1', 'column2', 'column3']);
  });

  it('should not change columns if column to move does not exist', () => {
    initialState = {
      columns: ['column1', 'column2', 'column3'],
      sort: [],
    };
    const action = {
      type: 'discover/moveColumn',
      payload: { columnName: 'nonExistingColumn', destination: 0 },
    };
    const result = discoverSlice.reducer(initialState, action);
    expect(result.columns).toEqual(['column1', 'column2', 'column3']);
  });

  it('should set the savedQuery when a valid string is provided', () => {
    const savedQueryId = 'some-query-id';
    const action = { type: 'discover/setSavedQuery', payload: savedQueryId };
    const result = discoverSlice.reducer(initialState, action);
    expect(result.savedQuery).toEqual(savedQueryId);
  });

  it('should remove the savedQuery from state when payload is undefined', () => {
    // pre-set the savedQuery in the initialState
    const initialStateWithSavedQuery = {
      ...initialState,
      savedQuery: 'existing-query-id',
    };

    const action = { type: 'discover/setSavedQuery', payload: undefined };
    const result = discoverSlice.reducer(initialStateWithSavedQuery, action);

    // Check that savedQuery is not in the resulting state
    expect(result.savedQuery).toBeUndefined();
  });

  it('should not affect other state properties when setting savedQuery', () => {
    const initialStateWithOtherProperties = {
      ...initialState,
      columns: ['column1', 'column2'],
      sort: [['field1', 'asc']] as SortOrder[],
    };
    const savedQueryId = 'new-query-id';
    const action = { type: 'discover/setSavedQuery', payload: savedQueryId };
    const result = discoverSlice.reducer(initialStateWithOtherProperties, action);
    // check that other properties remain unchanged
    expect(result.columns).toEqual(['column1', 'column2']);
    expect(result.sort).toEqual([['field1', 'asc']] as SortOrder[]);
    expect(result.savedQuery).toEqual(savedQueryId);
  });
});
