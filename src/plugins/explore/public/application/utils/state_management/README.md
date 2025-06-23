# Explore Plugin Query Processing Guide

## Overview

This document provides a comprehensive guide to the Explore plugin's state management and query processing architecture, including multi-tab optimization, result access patterns, and best practices for tab owners and developers.

## Architecture Overview

### Query Execution Flow

1. **Query Preparation**: Each tab can define a `prepareQuery` method to transform queries
2. **Cache Key Generation**: Queries are cached using `createCacheKey(query, timeRange)`
3. **Optimization Logic**: System compares default query vs active tab query to minimize requests
4. **Result Storage**: Raw results stored in Redux state by cache key
5. **Result Processing**: Components use processors to transform raw results for display

### Multi-Tab Query Optimization Strategy

The Explore plugin implements a sophisticated caching strategy:

- **Default Query**: Always uses `defaultPrepareQuery` (removes stats pipe for histogram compatibility)
- **Tab-Specific Query**: Uses tab's `prepareQuery` method or falls back to default
- **Always Length 2 Execution**: 
  - `executionCacheKeys[0]` = Default query cache key (for histogram/sidebar/non-tab components)
  - `executionCacheKeys[1]` = Tab query cache key (for all tab components)
  - If queries are identical: `executionCacheKeys[1] === executionCacheKeys[0]`
  - If queries differ: `executionCacheKeys[1]` contains tab-specific cache key

## Tab Registration Guide

### Basic Tab Registration

```typescript
import { TabRegistryService } from '../services/tab_registry/tab_registry_service';

export const registerMyTab = (tabRegistry: TabRegistryService) => {
  tabRegistry.registerTab({
    id: 'my_custom_tab',
    label: 'My Tab',
    flavor: [],
    order: 25,
    supportedLanguages: ['PPL', 'DQL'],
    
    // Optional: Transform query for this tab
    prepareQuery: (query) => {
      // Example: Add custom filters or modify query
      return {
        ...query,
        query: `${query.query} | where status="active"`
      };
    },
    
    // Optional: Custom result processor
    resultsProcessor: (rawResults, indexPattern) => {
      // Transform raw results for this tab's needs
      return {
        ...rawResults,
        customField: 'processed'
      };
    },
    
    component: MyTabComponent,
    
    onActive: () => console.log('Tab activated'),
    onInactive: () => console.log('Tab deactivated')
  });
};
```

### Tab Component Implementation

```typescript
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../utils/state_management/store';

export const MyTabComponent = () => {
  const executionCacheKeys = useSelector((state: RootState) => state.ui.executionCacheKeys);
  const results = useSelector((state: RootState) => state.results);
  
  // Access results for this tab (always use index 1 for tabs)
  const cacheKey = executionCacheKeys[1];
  const rawResults = results[cacheKey];
  
  // TODO: Register custom processor for this tab
  // const tabDefinition = services.tabRegistry?.getTab?.('my_custom_tab');
  // const processor = tabDefinition?.resultsProcessor || defaultResultsProcessor;
  // const processedResults = processor(rawResults, indexPattern);
  
  const rows = rawResults?.hits?.hits || [];
  const totalHits = (rawResults?.hits?.total as any)?.value || rawResults?.hits?.total || 0;
  
  if (!rawResults) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      <h3>My Custom Tab</h3>
      <p>Total hits: {totalHits}</p>
      {/* Render your tab content */}
    </div>
  );
};
```

## Result Access Patterns

### Component Types and Access Methods

#### 1. Histogram Component
- **Access**: `executionCacheKeys[0]` (always uses default query with histogram)
- **Processor**: `histogramResultsProcessor(rawResults, indexPattern, data, interval)`
- **Purpose**: Chart visualization with aggregation data

#### 2. Side Panel Component  
- **Access**: `executionCacheKeys[0]` (uses default query)
- **Processor**: `defaultResultsProcessor(rawResults, indexPattern)`
- **Purpose**: Field counts and metadata (no histogram needed)

#### 3. Default Tab (Logs)
- **Access**: `executionCacheKeys[1]` (uses tab-specific cache key)
- **Processor**: Direct access to raw results
- **Purpose**: Display search results in table format

#### 4. Custom Tabs
- **Access**: `executionCacheKeys[1]` (always use index 1 for tabs)
- **Processor**: Tab's custom `resultsProcessor` or direct access
- **Purpose**: Tab-specific data visualization

### Result Access Code Patterns

```typescript
// ✅ Recommended pattern for all components
const executionCacheKeys = useSelector((state: RootState) => state.ui.executionCacheKeys);
const results = useSelector((state: RootState) => state.results);

// For non-tab components (histogram, sidebar)
const cacheKey = executionCacheKeys[0];

// For tab components (ALWAYS use index 1)
const cacheKey = executionCacheKeys[1];

const rawResults = results[cacheKey];

// Extract data directly from raw results
const rows = rawResults?.hits?.hits || [];
const totalHits = (rawResults?.hits?.total as any)?.value || rawResults?.hits?.total || 0;
const fieldSchema = rawResults?.fieldSchema || [];

// Optional: Use processor if needed
const processedResults = useMemo(() => {
  if (!rawResults || !indexPattern) return null;
  return myCustomProcessor(rawResults, indexPattern);
}, [rawResults, indexPattern]);
```

### TODO Comment Examples for Custom Processors

```typescript
// TODO: Register custom processor for this tab
// const tabDefinition = services.tabRegistry?.getTab?.('my_tab_id');
// const processor = tabDefinition?.resultsProcessor || defaultResultsProcessor;
// const processedResults = processor(rawResults, indexPattern);
```

## Cache Management

### ExecutionCacheKeys Array Structure (Always Length 2)

- **`executionCacheKeys[0]`** = Default query cache key (for histogram/sidebar/non-tab components)
- **`executionCacheKeys[1]`** = Tab query cache key (for all tab components)
  - If queries are identical: `executionCacheKeys[1] === executionCacheKeys[0]`
  - If queries differ: `executionCacheKeys[1]` contains tab-specific cache key

### Tab Switching Optimization

When switching tabs, the system:
1. Calculates new tab's cache key
2. Checks if results already exist in cache
3. Only executes queries for missing results
4. Preserves existing cache entries

```typescript
// Tab switching logic (from tabs.tsx)
const needsActiveTabQuery = !results[activeTabCacheKey];
const needsDefaultQuery = !results[defaultCacheKey];

if (needsActiveTabQuery || needsDefaultQuery) {
  // Only execute if cache miss - no clearResults()
  dispatch(executeQueries({ services }));
}
```

## Performance Optimizations

### Query Deduplication
- Identical queries execute only once
- Results shared across components via cache keys
- JSON comparison used to detect query equality

### Cache Preservation
- Tab switching preserves existing results
- Only missing results trigger new queries
- No unnecessary cache clearing

### Processor Efficiency
- Results processed on-demand using `useMemo`
- Processors only run when raw results change
- Separate processors for different use cases

## CSV Export Improvements

### Efficient Cache Usage
```typescript
// ✅ New efficient approach
export const exportToCsv = (options) => {
  return (dispatch, getState) => {
    const state = getState();
    const executionCacheKeys = state.ui.executionCacheKeys;
    const cacheKey = executionCacheKeys[1]; // Use existing tab cache key
    const results = state.results[cacheKey];
    // ... rest of logic
  };
};
```

### Search Source Reuse
- `exportMaxSizeCsv` now uses `updateSearchSource` (renamed from `createSearchSourceWithQuery`)
- Eliminates code duplication
- Consistent with Discover naming conventions

## Best Practices

### For Tab Owners

1. **Cache Access**: Always use `executionCacheKeys[1]` for tab components
2. **Query Preparation**: Only modify queries when necessary
3. **Result Processing**: Use custom processors for tab-specific transformations
4. **Performance**: Memoize processed results to avoid re-computation

### For Developers

1. **State Management**: Use direct cache access instead of removed selectors
2. **Error Handling**: Handle missing results gracefully
3. **Memory Management**: Clean up subscriptions and effects
4. **Testing**: Mock cache keys and results for component testing

## Current Implementation Status

### ✅ Implemented Features
- ExecutionCacheKeys always length 2 for consistent access
- Removed problematic selectors (`selectRows`, `selectTotalHits`, `selectFieldCounts`)
- Updated all components to use new result access pattern
- Renamed `createSearchSourceWithQuery` to `updateSearchSource`
- Fixed CSV export to use proper cache keys
- Refactored `exportMaxSizeCsv` to reuse `updateSearchSource`
- Multi-tab query optimization logic
- Cache-based result storage
- Tab switching without unnecessary re-queries
- Modular result processors

### 🔄 Missing Features (vs Discover)
- Time range validation before query execution
- Language-specific error handling (kuery/lucene vs others)
- Sophisticated abort controller management
- Enhanced saved search integration

## Troubleshooting

### Common Issues

1. **Empty Results**: Check if correct cache key is being used (`executionCacheKeys[1]` for tabs)
2. **Stale Data**: Verify cache keys are updating on query changes
3. **Performance**: Ensure processors are memoized properly
4. **Tab Switching**: Confirm cache preservation logic is working

### Debug Tips

```typescript
// Debug cache state
console.log('Cache Keys:', executionCacheKeys);
console.log('Results:', Object.keys(results));
console.log('Tab Cache Key:', executionCacheKeys[1]);

// Debug query comparison
console.log('Queries Equal:', queriesEqual);
console.log('Default Query:', defaultQuery);
console.log('Active Tab Query:', activeTabQuery);
```