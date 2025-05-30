/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { monaco } from '@osd/monaco';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../types';
import { DefaultInput } from '../../../../data/public';
import { setQueryString, setLanguage } from '../utils/state_management/slices/query_slice';
import {
  beginTransaction,
  finishTransaction,
} from '../utils/state_management/actions/transaction_actions';
import { clearResults } from '../utils/state_management/slices/results_slice';
import {
  selectQueryString,
  selectQueryLanguage,
  selectIsLoading,
  selectError,
} from '../utils/state_management/selectors';
import { ResultStatus, QueryStatus } from '../utils/state_management/types';

export interface QueryPanelProps {
  datePickerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * Custom query panel component for the Explore plugin
 * Uses Redux for state management and supports datePickerRef for external date picker
 */
export const QueryPanel: React.FC<QueryPanelProps> = ({ datePickerRef }) => {
  const dispatch = useDispatch();

  // Get services from context
  const { services } = useOpenSearchDashboards<ExploreServices>();

  // Use selectors to get state from Redux
  const queryString = useSelector(selectQueryString);
  const queryLanguage = useSelector(selectQueryLanguage);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);

  // Local state for editor
  const [localQuery, setLocalQuery] = useState(queryString);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Update local state when Redux state changes
  useEffect(() => {
    setLocalQuery(queryString);
  }, [queryString]);

  // Handle query change
  const handleQueryChange = useCallback((value: string) => {
    setLocalQuery(value);
  }, []);

  // Handle language change
  const handleLanguageChange = useCallback(
    (language: string) => {
      // Start transaction to batch state updates
      dispatch(beginTransaction());

      // Update language
      dispatch(setLanguage(language));

      // Clear results cache
      dispatch(clearResults());

      // Commit transaction to trigger query execution
      dispatch(finishTransaction());
    },
    [dispatch]
  );

  // Execute query when run button is clicked
  const handleRunQuery = useCallback(() => {
    // Start transaction to batch state updates
    dispatch(beginTransaction());

    // Update query state
    dispatch(setQueryString(localQuery));

    // Clear results cache
    dispatch(clearResults());

    // Commit transaction to trigger query execution
    dispatch(finishTransaction());
  }, [dispatch, localQuery]);

  // Handle editor mount
  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;

      // Add command to execute query on Ctrl+Enter
      const modifierKey = monaco.KeyMod.CtrlCmd;
      const enterKey = monaco.KeyCode.Enter;
      const keyCombo = modifierKey + enterKey;

      editor.addCommand(keyCombo, handleRunQuery);

      return editor;
    },
    [handleRunQuery]
  );

  // Real autocomplete implementation using the data plugin's autocomplete service
  const provideCompletionItems = useCallback(
    async (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      context: monaco.languages.CompletionContext,
      token: monaco.CancellationToken
    ): Promise<monaco.languages.CompletionList> => {
      if (token.isCancellationRequested) {
        return { suggestions: [], incomplete: false };
      }

      try {
        // Get current dataset/index pattern
        const dataset = services?.data?.query?.queryString?.getQuery()?.dataset;
        const indexPattern = dataset ? await services.indexPatterns?.get(dataset.id) : undefined;

        // Use the autocomplete service
        const suggestions = await services?.data?.autocomplete?.getQuerySuggestions({
          query: editorRef.current?.getValue() ?? '',
          selectionStart: model.getOffsetAt(position),
          selectionEnd: model.getOffsetAt(position),
          language: queryLanguage,
          indexPattern,
          datasetType: dataset?.type,
          position,
          services: services as any, // Type cast for compatibility
        });

        // Transform suggestions to Monaco format
        const wordUntil = model.getWordUntilPosition(position);
        const defaultRange = new monaco.Range(
          position.lineNumber,
          wordUntil.startColumn,
          position.lineNumber,
          wordUntil.endColumn
        );

        return {
          suggestions: suggestions
            ? suggestions
                .filter((s: any) => 'detail' in s)
                .map((s: any) => ({
                  label: s.text,
                  kind: s.type as monaco.languages.CompletionItemKind,
                  insertText: s.insertText ?? s.text,
                  insertTextRules: s.insertTextRules ?? undefined,
                  range: s.replacePosition ?? defaultRange,
                  detail: s.detail,
                  command: { id: 'editor.action.triggerSuggest', title: 'Trigger Next Suggestion' },
                  sortText: s.sortText ?? s.text,
                }))
            : [],
          incomplete: false,
        };
      } catch (autocompleteError) {
        // Error getting autocomplete suggestions
        return { suggestions: [], incomplete: false };
      }
    },
    [services, queryLanguage]
  );

  // Create query status object for progress indicator
  const queryStatus: QueryStatus = {
    status: isLoading ? ResultStatus.LOADING : error ? ResultStatus.ERROR : ResultStatus.READY,
    elapsedMs: 0,
    startTime: Date.now(),
  };

  // Language selector
  const renderLanguageSelector = () => (
    <EuiButton
      size="s"
      onClick={() => {
        // Toggle between ppl and lucene for demo
        const newLanguage = queryLanguage === 'ppl' ? 'lucene' : 'ppl';
        handleLanguageChange(newLanguage);
      }}
      data-test-subj="exploreLanguageSelectorButton"
    >
      {queryLanguage.toUpperCase()}
    </EuiButton>
  );

  return (
    <EuiPanel paddingSize="s" hasBorder>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <DefaultInput
            languageId={queryLanguage}
            value={localQuery}
            onChange={handleQueryChange}
            editorDidMount={handleEditorDidMount}
            headerRef={headerRef}
            provideCompletionItems={provideCompletionItems}
            queryStatus={queryStatus}
            footerItems={{
              start: [
                <EuiText size="xs" color="subdued">
                  {queryLanguage.toUpperCase()}
                </EuiText>,
              ],
              end: [
                // Date picker will be rendered here via datePickerRef
                datePickerRef && <div ref={datePickerRef} key="datePicker" />,
              ].filter(Boolean),
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{renderLanguageSelector()}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={handleRunQuery}
            isLoading={isLoading}
            data-test-subj="exploreQuerySubmitButton"
          >
            Run
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {error && (
        <>
          <EuiSpacer size="s" />
          <EuiText color="danger" size="s">
            {error.message}
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
};
