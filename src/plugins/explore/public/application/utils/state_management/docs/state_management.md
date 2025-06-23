# State Management Architecture

## Redux Store Structure

The Explore plugin uses Redux Toolkit with a 5-slice architecture for state management:

```typescript
// Store configuration
const rootReducer = combineReducers({
  query: queryReducer,      // Current query state
  ui: uiReducer,           // UI state and cache keys
  results: resultsReducer, // Query results cache
  tab: tabReducer,         // Tab-specific state
  legacy: legacyReducer,   // Legacy Discover state
});
```

### Query Slice
Stores the current query object directly (flattened structure):
```typescript
interface QueryState {
  query: string;           // Query string
  language: string;        // Query language (PPL, DQL, etc.)
  dataset?: Dataset;       // Selected dataset
}
```

### UI Slice
Manages UI state, execution cache keys, and transaction state:
```typescript
interface UIState {
  activeTabId: string;           // Currently active tab
  flavor: string;                // Current flavor setting
  status: ResultStatus;          // Loading/ready/error status
  executionCacheKeys: string[];  // Always length 2 array for result access
  transaction: {                 // Transaction management
    inProgress: boolean;
    pendingActions: string[];
  };
}
```

### Results Slice
Caches query results by cache key:
```typescript
interface ISearchResult extends SearchResponse<any> {
  elapsedMs: number;
  fieldSchema?: Array<Partial<IFieldType>>;
}

interface ResultsState {
  [cacheKey: string]: ISearchResult; // Raw search results with metadata
}
```

### Tab Slice
Stores tab-specific configuration:
```typescript
interface TabState {
  [tabId: string]: {
    skipInitialFetch?: boolean;
  };
}

// Initial state includes built-in tabs
const initialState: TabState = {
  logs: {
    skipInitialFetch: false,
  },
  visualizations: {
    skipInitialFetch: false,
  },
};
```

### Legacy Slice
Maintains compatibility with Discover patterns:
```typescript
interface LegacyState {
  interval: string;        // Histogram interval
  sort: string[][];        // Sort configuration
  columns: string[];       // Table columns
}
```

## Query Synchronization

### QueryStringManager Middleware

The plugin includes minimal middleware to sync local query state with the global QueryStringManager:

```typescript
// Syncs Redux query state with global services
export const createQuerySyncMiddleware = (services: ExploreServices) => {
  return (store) => (next) => (action) => {
    const result = next(action);
    
    if (action.type === 'query/setQuery') {
      const state = store.getState();
      const query = state.query;
      
      // Sync with global QueryStringManager
      if (query.dataset && services.data?.query?.queryString) {
        services.data.query.queryString.setQuery(query);
      }
    }
    
    return result;
  };
};
```

**When synchronization occurs:**
- User updates query in the query panel
- Query state changes via Redux actions
- Ensures global services stay in sync with local state

## Cache Management

### ExecutionCacheKeys Strategy

The UI slice maintains an `executionCacheKeys` array that is **always length 2**:

- **Index 0**: Default query cache key (for histogram/sidebar components)
- **Index 1**: Tab query cache key (for all tab components)

```typescript
// Example cache keys
executionCacheKeys: [
  "default_query_cache_key",  // [0] - histogram/sidebar
  "tab_query_cache_key"       // [1] - active tab
]
```

**When cache keys are identical:**
```typescript
// If tab uses same query as default
executionCacheKeys: [
  "same_cache_key",  // [0] - default query
  "same_cache_key"   // [1] - tab query (same as default)
]
```

### Result Storage

Results are stored in the `results` slice by cache key:

```typescript
// Results slice structure
{
  "query_hash_123": {
    hits: { hits: [...], total: 1000 },
    aggregations: {...},
    elapsedMs: 150,
    fieldSchema: [...]
  },
  "query_hash_456": {
    // Different query results
  }
}
```

### Cache Invalidation

Cache is cleared when:
- User runs a new query (`clearResults` action)
- Time range changes (automatic via timefilter subscription)
- Dataset changes

Cache is **preserved** when:
- Switching between tabs (if results exist)
- UI state changes that don't affect query execution

## Transaction Management

The UI slice includes transaction management for coordinating complex state changes:

### Transaction Actions

```typescript
// Available transaction actions from UI slice
export const {
  startTransaction,
  commitTransaction,
  rollbackTransaction,
} = uiSlice.actions;
```

### Transaction State

```typescript
interface TransactionState {
  inProgress: boolean;
  pendingActions: string[];
}
```

**Usage Pattern:**
- `startTransaction`: Begin a transaction before complex state changes
- `commitTransaction`: Complete the transaction successfully
- `rollbackTransaction`: Cancel the transaction and revert changes

**Example Usage:**
```typescript
// Start a transaction
dispatch(startTransaction({ previousState: currentState }));

try {
  // Perform multiple state changes
  dispatch(setQuery(newQuery));
  dispatch(setActiveTab(newTab));
  
  // Commit if successful
  dispatch(commitTransaction());
} catch (error) {
  // Rollback on error
  dispatch(rollbackTransaction(error.message));
}
```