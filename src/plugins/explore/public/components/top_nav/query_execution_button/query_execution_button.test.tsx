/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryExecutionButton } from './query_execution_button';
import { QueryExecutionStatus } from '../../../application/utils/state_management/types';
import { rootReducer } from '../../../application/utils/state_management/store';

describe('QueryExecutionButton', () => {
  const mockTimefilter = {
    getTime: jest.fn(() => ({ from: 'now-15m', to: 'now' })),
    getTimeUpdate$: jest.fn(() => ({
      subscribe: jest.fn(() => ({
        unsubscribe: jest.fn(),
      })),
    })),
  };

  const mockServices = {
    data: {
      query: {
        timefilter: {
          timefilter: mockTimefilter,
        },
        queryString: {
          getQuery: jest.fn(() => ({ query: '', language: 'kuery' })),
        },
      },
    },
  } as any;

  // Create a mock store with the required state structure
  const createMockStore = () => {
    return configureStore({
      reducer: rootReducer,
      preloadedState: {
        query: {
          query: '',
          language: 'kuery',
          dataset: undefined,
        },
        ui: {
          activeTabId: '',
          showFilterPanel: true,
          showHistogram: true,
        },
        results: {},
        tab: {
          logs: {},
          visualizations: {
            styleOptions: undefined,
            chartType: undefined,
            axesMapping: {},
          },
        },
        legacy: {
          columns: ['_source'],
          sort: [],
          isDirty: false,
          savedQuery: undefined,
          lineCount: undefined,
          interval: 'auto',
          savedSearch: undefined,
        },
        queryEditor: {
          queryStatusMap: {},
          overallQueryStatus: {
            status: QueryExecutionStatus.UNINITIALIZED,
            elapsedMs: undefined,
            startTime: undefined,
          },
          promptModeIsAvailable: false,
          promptToQueryIsLoading: false,
          editorMode: 'query' as any,
          lastExecutedTranslatedQuery: '',
          lastExecutedPrompt: '',
          isQueryExecutionDisabled: false,
        },
      },
    });
  };

  const renderWithProvider = (component: React.ReactElement) => {
    const store = createMockStore();
    return render(<Provider store={store}>{component}</Provider>);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct props', () => {
    renderWithProvider(
      <QueryExecutionButton editorText="SELECT * FROM test" services={mockServices} />
    );

    expect(screen.getByTestId('exploreQueryExecutionButton')).toBeInTheDocument();
  });

  it('shows "Update" text when query has changed', () => {
    renderWithProvider(
      <QueryExecutionButton editorText="SELECT * FROM test" services={mockServices} />
    );

    expect(screen.getByText('Update')).toBeInTheDocument();
  });

  it('shows "Update" when local date range changes', () => {
    renderWithProvider(
      <QueryExecutionButton
        editorText=""
        services={mockServices}
        localDateRange={{ from: 'now-30m', to: 'now' }}
      />
    );

    expect(screen.getByText('Update')).toBeInTheDocument();
  });

  it('shows "Refresh" text when query has not changed and no local date range', () => {
    // Mock services to return the same query as editorText
    const servicesWithSameQuery = {
      ...mockServices,
      data: {
        ...mockServices.data,
        query: {
          ...mockServices.data.query,
          queryString: {
            getQuery: jest.fn(() => ({ query: '', language: 'kuery' })),
          },
        },
      },
    };

    renderWithProvider(<QueryExecutionButton editorText="" services={servicesWithSameQuery} />);

    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('shows button with correct text based on state', () => {
    renderWithProvider(
      <QueryExecutionButton editorText="SELECT * FROM test" services={mockServices} />
    );

    // Should show Update since editorText differs from mock query
    expect(screen.getByText('Update')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const mockOnClick = jest.fn();

    renderWithProvider(
      <QueryExecutionButton
        editorText="SELECT * FROM test"
        services={mockServices}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByTestId('exploreQueryExecutionButton');
    button.click();

    expect(mockOnClick).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    renderWithProvider(
      <QueryExecutionButton
        editorText="SELECT * FROM test"
        services={mockServices}
        isDisabled={true}
      />
    );

    const button = screen.getByTestId('exploreQueryExecutionButton');
    expect(button).toBeDisabled();
  });

  it('shows "Update" when local date range is provided', () => {
    renderWithProvider(
      <QueryExecutionButton
        editorText=""
        services={mockServices}
        localDateRange={{ from: 'now-1h', to: 'now' }}
      />
    );

    expect(screen.getByText('Update')).toBeInTheDocument();
  });
});
