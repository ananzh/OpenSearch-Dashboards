/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiBasicTable, EuiText } from '@elastic/eui';
import { TabComponentProps } from '../../../services/tab_registry/tab_registry_service';

/**
 * Logs tab component for displaying log entries
 */
const LogsTab: React.FC<TabComponentProps> = ({ query, results }) => {
  if (!results || !results.hits || !results.hits.hits) {
    return <EuiText>No logs found.</EuiText>;
  }

  const items = results.hits.hits.map((hit: any) => ({
    id: hit._id,
    ...hit._source,
  }));

  const columns = [
    {
      field: '_id',
      name: 'ID',
      width: '50px',
    },
  ];

  // Dynamically create columns based on the first item's fields
  if (items.length > 0) {
    const firstItem = items[0];
    Object.keys(firstItem)
      .filter((key) => key !== 'id' && key !== '_id')
      .forEach((key) => {
        columns.push({
          field: key,
          name: key.charAt(0).toUpperCase() + key.slice(1),
          render: (value: any) => {
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
            return value;
          },
        });
      });
  }

  return (
    <div>
      <EuiText size="s">
        <p>Showing {items.length} logs</p>
      </EuiText>
      <EuiBasicTable
        items={items}
        columns={columns}
        tableCaption="Logs"
        data-test-subj="logsTabTable"
      />
    </div>
  );
};

// Default export for React.lazy
export default LogsTab;