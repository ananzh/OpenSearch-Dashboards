/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { monaco } from '@osd/monaco';
// Import from core plugins using the proper import paths
import { useOpenSearchDashboards } from 'src/plugins/opensearch_dashboards_react/public';
import { DefaultInput } from 'src/plugins/data/public';
import { setQueryString, setLanguage } from '../state_management/slices/query_slice';
import {
  beginTransaction,
  finishTransaction,
} from '../state_management/actions/transaction_actions';
import { clearResults } from '../state_management/slices/results_slice';
import {
  selectQueryString,
  selectQueryLanguage,
  selectIsLoading,
  selectError,
} from '../state_management/selectors';
import { ResultStatus } from '../legacy/discover/application/view_components/utils/use_search';

/**
 * Custom query panel component for the Explore plugin
 * Uses Redux for state management instead of queryStringManager
 */
export const QueryPanel: React.FC = () => {
  const dispatch = useDispatch();

  // Get services from context
  const { services } = useOpenSearchDashboards();

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
      // Use addition instead of bitwise OR to avoid lint error
      const modifierKey = monaco.KeyMod.CtrlCmd;
      const enterKey = monaco.KeyCode.Enter;
      const keyCombo = modifierKey + enterKey;

      editor.addCommand(keyCombo, handleRunQuery);

      return editor;
    },
    [handleRunQuery]
  );

  // Dummy completion provider - in a real implementation, this would use the autocomplete service
  const provideCompletionItems = useCallback(
    async (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      context: monaco.languages.CompletionContext,
      token: monaco.CancellationToken
    ): Promise<monaco.languages.CompletionList> => {
      return { suggestions: [], incomplete: false };
    },
    []
  );

  // Create query status object for progress indicator
  const queryStatus = {
    status: isLoading ? ResultStatus.LOADING : error ? ResultStatus.ERROR : ResultStatus.READY,
    elapsedMs: 0,
    startTime: Date.now(),
  };

  // For now, we'll use a placeholder for the language selector
  // In a real implementation, we would get this from the data plugin
  const renderLanguageSelector = () => (
    <EuiButton
      size="s"
      onClick={() => {
        // In a real implementation, this would show a dropdown
        // For now, we'll just toggle between ppl and lucene
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
              end: [],
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
