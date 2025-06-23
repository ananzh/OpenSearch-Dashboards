# Result Access Patterns

## ExecutionCacheKeys Strategy

The UI slice maintains an `executionCacheKeys` array that is **always length 2** for consistent result access across all components.

### Array Structure

```typescript
// Always length 2 array
executionCacheKeys: [
  "cache_key_for_histogram_sidebar", // [0] - Default query results
  "cache_key_for_active_tab"         // [1] - Tab query results
]
```

### Index Usage by Component Type

#### Index 0: Non-Tab Components
- **Histogram Component**: Uses default query with aggregations
- **Sidebar Component**: Uses default query for field counts
- **Any component needing histogram-compatible data**

#### Index 1: Tab Components
- **All tab components**: Always use index 1 regardless of tab type
- **Logs Tab**: Direct access to search results
- **Custom Tabs**: Tab-specific processed results

### When Indices Are Identical vs Different

#### Identical Cache Keys
When tab query equals default query:
```typescript
executionCacheKeys: [
  "same_cache_key",  // [0] - default query
  "same_cache_key"   // [1] - tab query (same as default)
]
```

#### Different Cache Keys
When tab has custom query preparation:
```typescript
executionCacheKeys: [
  "default_query_hash",     // [0] - default query
  "custom_tab_query_hash"   // [1] - tab-specific query
]
```

## Component Access Patterns

### Direct Cache Access (Recommended)

All components should use direct cache access instead of selectors:

```typescript
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export const MyComponent = () => {
  const executionCacheKeys = useSelector((state: RootState) => state.ui.executionCacheKeys);
  const results = useSelector((state: RootState) => state.results);
  
  // For non-tab components (histogram, sidebar) - use index 0 with safety check
  const cacheKey = executionCacheKeys && executionCacheKeys.length >= 1 ? executionCacheKeys[0] : null;
  
  // For tab components (ALWAYS use index 1) - use index 1 with safety check
  const cacheKey = executionCacheKeys && executionCacheKeys.length >= 2 ? executionCacheKeys[1] : null;
  
  const rawResults = cacheKey ? results[cacheKey] : null;
  
  // Extract data directly from raw results
  const rows = rawResults?.hits?.hits || [];
  const totalHits = (rawResults?.hits?.total as any)?.value || rawResults?.hits?.total || 0;
  const fieldSchema = rawResults?.fieldSchema || [];
  
  if (!rawResults) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      <p>Total hits: {totalHits}</p>
      {/* Render your component */}
    </div>
  );
};
```

### Raw Result Structure

Results stored in cache have this structure:

```typescript
interface ISearchResult {
  hits: {
    hits: any[];           // Individual search results
    total: number | { value: number }; // Total hit count
  };
  aggregations?: any;      // Histogram aggregations (if included)
  elapsedMs: number;       // Query execution time
  fieldSchema?: any[];     // Field schema information
}
```

### Data Extraction Patterns

#### Basic Data Access
```typescript
// Get search results
const rows = rawResults?.hits?.hits || [];

// Get total count (handle both formats)
const totalHits = (rawResults?.hits?.total as any)?.value || rawResults?.hits?.total || 0;

// Get field schema
const fieldSchema = rawResults?.fieldSchema || [];

// Get execution time
const elapsedMs = rawResults?.elapsedMs || 0;
```

#### Histogram Data Access
```typescript
// For histogram components (use index 0 with safety check)
const cacheKey = executionCacheKeys && executionCacheKeys.length >= 1 ? executionCacheKeys[0] : null;
const rawResults = cacheKey ? results[cacheKey] : null;

// Extract aggregation data
const aggregations = rawResults?.aggregations;
const buckets = aggregations?.histogram?.buckets || [];
```

## Safety Checks and Error Handling

### ExecutionCacheKeys Safety Checks

**Important**: Always include safety checks when accessing `executionCacheKeys` to prevent runtime errors during component initialization:

```typescript
// ✅ CORRECT: With safety check
const cacheKey = executionCacheKeys && executionCacheKeys.length >= 2 ? executionCacheKeys[1] : null;
const rawResults = cacheKey ? results[cacheKey] : null;

// ❌ INCORRECT: Without safety check (causes runtime errors)
const cacheKey = executionCacheKeys[1]; // Error: Cannot read properties of undefined
const rawResults = results[cacheKey];
```

### Why Safety Checks Are Needed

1. **Component Initialization**: `executionCacheKeys` may be empty during initial render
2. **Async State Updates**: Redux state updates are asynchronous
3. **Race Conditions**: Components may render before queries execute

### Recommended Pattern

```typescript
const MyTabComponent = () => {
  const executionCacheKeys = useSelector((state: RootState) => state.ui.executionCacheKeys);
  const results = useSelector((state: RootState) => state.results);
  
  // Safety check: ensure executionCacheKeys has at least 2 elements
  const cacheKey = executionCacheKeys && executionCacheKeys.length >= 2 ? executionCacheKeys[1] : null;
  const rawResults = cacheKey ? results[cacheKey] : null;
  
  // Handle loading state
  if (!rawResults) {
    return <div>Loading...</div>;
  }
  
  // Safe to access results
  const rows = rawResults.hits?.hits || [];
  return <div>{/* Render results */}</div>;
};
```

## Performance Optimization

### Using useMemo for Processed Results

When components need to transform raw results, use `useMemo` to prevent unnecessary re-computation:

```typescript
import { useMemo } from 'react';

export const MyTabComponent = () => {
  const executionCacheKeys = useSelector((state: RootState) => state.ui.executionCacheKeys);
  const results = useSelector((state: RootState) => state.results);
  
  const cacheKey = executionCacheKeys[1]; // Always index 1 for tabs
  const rawResults = results[cacheKey];
  
  // Memoize processed results
  const processedResults = useMemo(() => {
    if (!rawResults) return null;
    
    // Your processing logic here
    return {
      rows: rawResults.hits?.hits || [],
      fieldCounts: calculateFieldCounts(rawResults),
      // ... other processed data
    };
  }, [rawResults]);
  
  if (!processedResults) {
    return <div>Loading...</div>;
  }
  
  return <div>{/* Use processedResults */}</div>;
};
```

### Cache Preservation During Tab Switching

The system preserves cache entries when switching tabs:

```typescript
// Tab switching logic (from tabs.tsx)
const needsActiveTabQuery = !results[activeTabCacheKey];
const needsDefaultQuery = !results[defaultCacheKey];

if (needsActiveTabQuery || needsDefaultQuery) {
  // Only execute if cache miss - no clearResults()
  dispatch(executeQueries({ services }));
}
```

**Benefits:**
- Fast tab switching when results exist
- Reduced server requests
- Better user experience

## Custom Result Processors

### Tab-Specific Processors

Tabs can define custom result processors for specialized data transformation:

```typescript
// In tab registration
tabRegistry.registerTab({
  id: 'my_tab',
  resultsProcessor: (rawResults, indexPattern) => {
    // Custom processing logic
    return {
      ...rawResults,
      customField: 'processed_value',
      transformedData: processMyData(rawResults)
    };
  },
  // ... other properties
});
```

### Using Processors in Components

```typescript
// TODO: Register custom processor for this tab
// const tabDefinition = services.tabRegistry?.getTab?.('my_tab_id');
// const processor = tabDefinition?.resultsProcessor || defaultResultsProcessor;
// const processedResults = processor(rawResults, indexPattern);
```

## Error Handling

### Handling Missing Results

Always check for result existence before accessing data:

```typescript
const rawResults = results[cacheKey];

if (!rawResults) {
  return <div>Loading...</div>;
}

// Safe to access rawResults properties
const rows = rawResults.hits?.hits || [];
```

### Handling Different Total Hit Formats

OpenSearch can return total hits in different formats:

```typescript
// Handle both number and object formats
const getTotalHits = (rawResults) => {
  const total = rawResults?.hits?.total;
  if (typeof total === 'number') {
    return total;
  }
  if (typeof total === 'object' && total?.value !== undefined) {
    return total.value;
  }
  return 0;
};