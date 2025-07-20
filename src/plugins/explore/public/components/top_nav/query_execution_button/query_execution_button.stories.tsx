/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryExecutionButton, QueryExecutionButtonProps } from './query_execution_button';
import { rootReducer } from '../../../application/utils/state_management/store';
import { QueryExecutionStatus } from '../../../application/utils/state_management/types';

// Mock services for Storybook
const mockServices = {
  data: {
    query: {
      timefilter: {
        timefilter: {
          getTime: () => ({ from: 'now-15m', to: 'now' }),
        },
      },
      queryString: {
        getQuery: () => ({ query: '', language: 'kuery' }),
      },
    },
  },
} as any;

// Create a mock store
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

const meta: Meta<QueryExecutionButtonProps> = {
  title: 'src/plugins/explore/public/components/top_nav/query_execution_button',
  component: QueryExecutionButton,
  decorators: [
    (Story) => {
      const store = createMockStore();
      return (
        <Provider store={store}>
          <Story />
        </Provider>
      );
    },
  ],
  args: {
    services: mockServices,
    editorText: '',
    onClick: () => alert('Query executed!'),
  },
  parameters: {
    docs: {
      description: {
        component:
          'Query execution button that shows "Update" when changes are detected or "Refresh" when no changes are present.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<QueryExecutionButtonProps>;

export const Default: Story = {
  args: {
    editorText: '',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default state showing "Refresh" when no changes are detected.',
      },
    },
  },
};

export const WithQueryChanges: Story = {
  args: {
    editorText: 'SELECT * FROM logs WHERE level = "ERROR"',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows "Update" when the query text has changed from the current query.',
      },
    },
  },
};

export const WithDateRangeChanges: Story = {
  args: {
    editorText: '',
    localDateRange: { from: 'now-1h', to: 'now' },
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows "Update" when the date range has changed.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    editorText: 'SELECT * FROM logs',
    isDisabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Button in disabled state, typically when there are validation errors.',
      },
    },
  },
};

export const WithBothChanges: Story = {
  args: {
    editorText: 'source=logs | where level="ERROR" | head 100',
    localDateRange: { from: 'now-2h', to: 'now' },
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows "Update" when both query and date range have changed.',
      },
    },
  },
};
