# Tab Development Guide

## Tab Registration

### Basic Tab Registration

Register a new tab with the tab registry service:

```typescript
import { TabRegistryService } from '../services/tab_registry/tab_registry_service';
import { EXPLORE_DEFAULT_LANGUAGE } from '../../common';

export const registerMyTab = (tabRegistry: TabRegistryService) => {
  tabRegistry.registerTab({
    id: 'my_custom_tab',
    label: 'My Tab',
    flavor: [],
    order: 25,
    supportedLanguages: [EXPLORE_DEFAULT_LANGUAGE], // Use constant from common
    component: MyTabComponent,
    
    // Optional: Custom query preparation
    prepareQuery: (query) => {
      return {
        ...query,
        query: `${query.query} | where status="active"`
      };
    },
    
    // Optional: Custom result processor
    resultsProcessor: (rawResults, indexPattern, includeHistogram) => {
      return {
        ...rawResults,
        customField: 'processed'
      };
    },
    
    // Optional: Lifecycle hooks
    onActive: () => {
      // Tab activated
    },
    onInactive: () => {
      // Tab deactivated
    }
  });
};
```

### TabDefinition Interface

```typescript
interface TabComponentProps {
  query: Query;
  results: Record<string, unknown>;
  status: ResultStatus;
  error: Error | null;
  cacheKey: string;
}

interface TabDefinition {
  id: string;                    // Unique identifier
  label: string;                 // Display name in tab bar
  flavor: string[];              // Flavor compatibility
  order?: number;                // Display order (default: 100)
  supportedLanguages: string[];  // Supported query languages
  
  // Query handling
  prepareQuery?: (query: Query) => Query;  // Transform query for this tab
  
  // Result processing
  resultsProcessor?: (rawResults: any, indexPattern: any, includeHistogram?: boolean) => any;
  
  // UI component
  component: () => React.JSX.Element | null;
  
  // Lifecycle hooks
  onActive?: () => void;
  onInactive?: () => void;
}
```

## Query Preparation

### Default Behavior

If no `prepareQuery` method is provided, tabs use the default preparation:

```typescript
// Default removes stats pipes for histogram compatibility
export const defaultPrepareQuery = (query: any) => {
  return {
    ...query,
    query: typeof query.query === 'string' 
      ? query.query.replace(/\s*\|\s*stats.*$/i, '') 
      : query.query,
  };
};
```

### Custom Query Preparation

Define custom query transformations for your tab:

```typescript
// Example: Add filtering for active records only
prepareQuery: (query) => {
  return {
    ...query,
    query: `${query.query} | where status="active"`
  };
},

// Example: Remove specific pipes
prepareQuery: (query) => {
  return {
    ...query,
    query: query.query.replace(/\|\s*head\s+\d+/i, '')
  };
},

// Example: Language-specific preparation
prepareQuery: (query) => {
  if (query.language === 'PPL') {
    return {
      ...query,
      query: `${query.query} | sort @timestamp desc`
    };
  }
  return query;
}
```

## Component Implementation

### Basic Tab Component

```typescript
import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../utils/state_management/store';

const MyTabComponent = () => {
  const executionCacheKeys = useSelector((state: RootState) => state.ui.executionCacheKeys);
  const results = useSelector((state: RootState) => state.results);
  
  // Always use index 1 for tab components
  const cacheKey = executionCacheKeys[1];
  const rawResults = results[cacheKey];
  
  // Extract data from raw results
  const rows = rawResults?.hits?.hits || [];
  const totalHits = (rawResults?.hits?.total as any)?.value || rawResults?.hits?.total || 0;
  
  if (!rawResults) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="my-custom-tab tab-container">
      <h3>My Custom Tab</h3>
      <p>Total hits: {totalHits}</p>
      <div>
        {rows.map((row, index) => (
          <div key={index}>
            {/* Render row data */}
            {JSON.stringify(row._source)}
          </div>
        ))}
      </div>
    </div>
  );
};

// Export memoized component (matches real implementation pattern)
export const MyTab = memo(MyTabComponent);
```

### Advanced Component with Processing

```typescript
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../utils/state_management/store';

export const AdvancedTabComponent = () => {
  const executionCacheKeys = useSelector((state: RootState) => state.ui.executionCacheKeys);
  const results = useSelector((state: RootState) => state.results);
  
  const cacheKey = executionCacheKeys[1];
  const rawResults = results[cacheKey];
  
  // Process results with memoization
  const processedData = useMemo(() => {
    if (!rawResults?.hits?.hits) return null;
    
    return rawResults.hits.hits.map(hit => ({
      id: hit._id,
      timestamp: hit._source['@timestamp'],
      message: hit._source.message,
      level: hit._source.level
    }));
  }, [rawResults]);
  
  if (!processedData) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      <h3>Advanced Tab</h3>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Level</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {processedData.map(item => (
            <tr key={item.id}>
              <td>{item.timestamp}</td>
              <td>{item.level}</td>
              <td>{item.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

## Result Processing

### Custom Result Processors

Define custom processors for specialized data transformation:

```typescript
// Example: Process logs for specific format
const logsResultsProcessor = (rawResults, indexPattern) => {
  const fieldCounts = {};
  
  if (rawResults.hits?.hits && indexPattern) {
    for (const hit of rawResults.hits.hits) {
      const fields = Object.keys(indexPattern.flattenHit(hit));
      for (const fieldName of fields) {
        fieldCounts[fieldName] = (fieldCounts[fieldName] || 0) + 1;
      }
    }
  }
  
  return {
    hits: rawResults.hits,
    fieldCounts,
    logLevels: extractLogLevels(rawResults),
    timeRange: extractTimeRange(rawResults),
    elapsedMs: rawResults.elapsedMs
  };
};

// Register tab with custom processor
tabRegistry.registerTab({
  id: 'logs_tab',
  resultsProcessor: logsResultsProcessor,
  // ... other properties
});
```

### Using Processors in Components

```typescript
// TODO: Implement processor integration
// const tabDefinition = services.tabRegistry?.getTab?.('my_tab_id');
// const processor = tabDefinition?.resultsProcessor || defaultResultsProcessor;
// const processedResults = processor(rawResults, indexPattern);
```

## Best Practices

### Performance Optimization

1. **Use useMemo for expensive calculations:**
```typescript
const processedData = useMemo(() => {
  return expensiveDataTransformation(rawResults);
}, [rawResults]);
```

2. **Access results efficiently:**
```typescript
// Always use index 1 for tabs
const cacheKey = executionCacheKeys[1];
const rawResults = results[cacheKey];
```

3. **Handle loading states:**
```typescript
if (!rawResults) {
  return <LoadingSpinner />;
}
```

### Error Handling

1. **Safe data access:**
```typescript
const rows = rawResults?.hits?.hits || [];
const totalHits = (rawResults?.hits?.total as any)?.value || 0;
```

2. **Graceful degradation:**
```typescript
if (!rawResults?.hits?.hits?.length) {
  return <EmptyState message="No results found" />;
}
```

### Query Preparation Guidelines

1. **Keep transformations minimal:**
```typescript
// Good: Simple, focused transformation
prepareQuery: (query) => ({
  ...query,
  query: query.query.replace(/\|\s*head\s+\d+/i, '')
})

// Avoid: Complex, multi-step transformations
```

2. **Preserve original query structure:**
```typescript
// Always return a complete query object
prepareQuery: (query) => ({
  ...query,  // Preserve all original properties
  query: transformedQueryString
})
```

3. **Handle different query languages:**
```typescript
prepareQuery: (query) => {
  if (query.language === 'PPL') {
    // PPL-specific transformation
  } else if (query.language === 'DQL') {
    // DQL-specific transformation
  }
  return query;
}
```

## Integration with Explore App

### Tab Registration in Plugin Setup

```typescript
// In plugin setup
export class MyPlugin implements Plugin {
  public setup(core: CoreSetup, plugins: { explore: ExplorePluginSetup }) {
    if (plugins.explore?.registerTab) {
      plugins.explore.registerTab({
        id: 'my_plugin_tab',
        label: 'My Plugin',
        component: MyPluginTabComponent,
        // ... other properties
      });
    }
  }
}
```

### Built-in Tab Registration

```typescript
// In Explore plugin
private registerBuiltInTabs() {
  this.tabRegistry.registerTab({
    id: 'logs',
    label: 'Logs',
    order: 10,
    component: LogsTabComponent,
    prepareQuery: defaultPrepareQuery
  });
  
  this.tabRegistry.registerTab({
    id: 'visualizations',
    label: 'Visualizations',
    order: 20,
    component: VisualizationsTabComponent,
    prepareQuery: (query) => ({
      ...query,
      query: `${query.query} | stats count() by field`
    })
  });
}