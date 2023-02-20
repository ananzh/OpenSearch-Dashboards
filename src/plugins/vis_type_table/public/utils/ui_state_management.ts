/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import { debounce, isEqual } from 'lodash';
import { useCallback, useRef, useEffect } from 'react';
import { PersistedState } from '../../../visualizations/public';
import { TableUiState, ColumnWidth } from '../types';

export const uiStateManagement = (uiState: PersistedState) => {
  const defaultSortState = {
    colIndex: null,
    direction: null,
  };
  const sort = uiState?.get('vis.params.sort') || defaultSortState;
  const width = uiState?.get('vis.params.width') || [];
  const currentUiState = useRef<{
    columnsWidth: TableUiState['width'];
    sort: TableUiState['sort'];
    pendingUpdate: boolean;
  }>({
    columnsWidth: uiState?.get('vis.params.width'),
    sort: uiState?.get('vis.params.sort'),
    pendingUpdate: false,
  });

  const setSort = useCallback(
    (sort: TableUiState['sort']) => {
      currentUiState.current.sort = sort;
      currentUiState.current.pendingUpdate = true;

      setTimeout(() => {
        uiState?.set('vis.params.sort', sort);
        currentUiState.current.pendingUpdate = false;
        uiState.emit('reload');
      });
    },

    [uiState]
  );

  const setWidth = useCallback(
    ( col: ColumnWidth) => {
      const prevState = uiState?.get('vis.params.width') || [];
      const updated = [...prevState];
      const idx = prevState?.findIndex((c) => c.colIndex === col.colIndex);

      if (idx < 0) updated.push(col);
      else updated[idx] = col;

      currentUiState.current.columnsWidth = updated;
      currentUiState.current.pendingUpdate = true;

      setTimeout(() => {
        uiState?.set('vis.params.width', updated);
        currentUiState.current.pendingUpdate = false;
        uiState.emit('reload');
      });
      return updated;
    },
    [uiState]
  );

  useEffect(() => {
    /**
     * Debounce is in place since there are couple of synchronous updates of the uiState,
     * which are also handled synchronously.
     */
    const updateOnChange = debounce(() =>
    {
      // skip uiState updates if there are pending internal state updates
      if (currentUiState.current.pendingUpdate) {
        return;
      }

      const { vis } = uiState?.getChanges();

      if (!isEqual(vis?.params.width, currentUiState.current.columnsWidth)) {
        currentUiState.current.columnsWidth = vis?.params.width;
        setWidth(vis?.params.width|| []);
      }

      if (!isEqual(vis?.params.sort, currentUiState.current.sort)) {
        currentUiState.current.sort = vis?.params.sort;
        setSort( vis?.params.sort ||  defaultSortState);
      }
    });

    uiState?.on('change', updateOnChange);

    return () => {
      uiState?.off('change', updateOnChange);
    };
  }, [uiState]);

  return { sort, setSort, width, setWidth};
}
