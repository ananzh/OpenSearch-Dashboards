# Query Processing Flow

## Query Preparation Pipeline

### Default Query Preparation

All queries go through a default preparation step that ensures histogram compatibility:

```typescript
export const defaultPrepareQuery = (query: any) => {
  return {
    ...query,
    query: typeof query.query === 'string' 
      ? query.query.replace(/\s*\|\s*stats.*$/i, '') 
      : query.query,
  };
};
```

**Purpose**: Removes stats pipes from queries to ensure they work with histogram aggregations.

### Tab-Specific Query Preparation

Each tab can define a custom `prepareQuery` method to transform queries for their specific needs:

```typescript
// Example tab registration with custom query preparation
tabRegistry.registerTab({
  id: 'my_tab',
  prepareQuery: (query) => {
    return {
      ...query,
      query: `${query.query} | where status="active"`
    };
  },
  // ... other tab properties
});
```

**Fallback**: If a tab doesn't define `prepareQuery`, it uses `defaultPrepareQuery`.

## Execution Strategy

### Multi-Tab Optimization

The system optimizes query execution by comparing default and tab-specific queries:

```typescript
export const computeQueryContext = (query, activeTabId, services) => {
  const defaultQuery = defaultPrepareQuery(query);
  const activeTabPrepareQuery = activeTab?.prepareQuery || defaultPrepareQuery;
  const activeTabQuery = activeTabPrepareQuery(query);
  
  const queriesEqual = JSON.stringify(defaultQuery) === JSON.stringify(activeTabQuery);
  
  return {
    defaultQuery,
    activeTabQuery,
    defaultCacheKey,
    activeTabCacheKey,
    queriesEqual, // Key optimization flag
  };
};
```

### Query Execution Orchestrator

The `executeQueries` thunk coordinates all query execution:

```typescript
export const executeQueries = createAsyncThunk(
  'query/executeQueries',
  async ({ services }, { getState, dispatch }) => {
    const { defaultQuery, activeTabQuery, queriesEqual } = computeQueryContext(...);
    
    const promises = [];
    
    // ALWAYS execute histogram query (for default query)
    if (needsDefaultQuery) {
      promises.push(dispatch(executeHistogramQuery({
        preparedQuery: defaultQuery,
        cacheKey: defaultCacheKey,
        interval: state.legacy?.interval
      })));
    }
    
    // CONDITIONALLY execute tab query (only if different)
    if (!queriesEqual && needsActiveTabQuery) {
      promises.push(dispatch(executeTabQuery({
        preparedQuery: activeTabQuery,
        cacheKey: activeTabCacheKey
      })));
    }
    
    await Promise.all(promises);
    
    // Always return length 2 array
    const cacheKeys = [defaultCacheKey, queriesEqual ? defaultCacheKey : activeTabCacheKey];
    dispatch(setExecutionCacheKeys(cacheKeys));
  }
);
```

### Query Types

#### Histogram Query (`executeHistogramQuery`)
- **Purpose**: Provides data for histogram charts and sidebar components
- **Features**: Includes aggregations for time-based visualization
- **Cache Key**: Always stored at `executionCacheKeys[0]`
- **Configuration**: Uses interval from Redux state

#### Tab Query (`executeTabQuery`)
- **Purpose**: Provides data for active tab components
- **Features**: Raw search results without aggregations
- **Cache Key**: Always stored at `executionCacheKeys[1]`
- **Optimization**: Only executes if different from default query

## Cache Key Generation

### Cache Key Creation

Cache keys combine query and time range for unique identification:

```typescript
export const createCacheKey = (query, timeRange) => {
  return JSON.stringify({
    query: query.query,
    language: query.language,
    dataset: query.dataset,
    timeRange: {
      from: timeRange.from,
      to: timeRange.to
    }
  });
};
```

### Deduplication Logic

The system prevents duplicate queries through cache key comparison:

1. **Query Comparison**: JSON stringify comparison of prepared queries
2. **Cache Lookup**: Check if results already exist for cache key
3. **Conditional Execution**: Only execute missing queries
4. **Result Sharing**: Multiple components can share same cache key

## Execution Triggers

### User Actions
- **Run Button**: Dispatches `executeQueries` with cache clearing
- **Tab Switch**: Checks cache, executes only if needed
- **Time Range Change**: Automatic execution via timefilter subscription

### Automatic Triggers
- **Initial Load**: Executes queries on app initialization
- **Auto-refresh**: Triggered by timefilter refresh interval
- **Dataset Change**: Clears cache and re-executes

## Performance Optimizations

### Cache Preservation
- Tab switching preserves existing results
- Only missing results trigger new queries
- No unnecessary cache clearing

### Query Deduplication
- Identical queries execute only once
- Results shared across components via cache keys
- JSON comparison detects query equality

### Abort Controller Management
- Each query execution creates new abort controller
- Previous requests automatically cancelled
- Prevents race conditions and stale results