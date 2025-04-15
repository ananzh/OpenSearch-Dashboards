/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import ReactResizeDetector from 'react-resize-detector';
import MonacoEditor from 'react-monaco-editor';

import { monaco } from '@osd/monaco';

import { LIGHT_THEME, DARK_THEME } from './editor_theme';

import './editor.scss';

export interface Props {
  /** Width of editor. Defaults to 100%. */
  width?: string | number;

  /** Height of editor. Defaults to 100%. */
  height?: string | number;

  /** ID of the editor language */
  languageId: string;

  /** Value of the editor */
  value: string;

  /** Function invoked when text in editor is changed */
  onChange: (value: string) => void;

  /**
   * Options for the Monaco Code Editor
   * Documentation of options can be found here:
   * https://microsoft.github.io/monaco-editor/docs.html#interfaces/editor.IEditorConstructionOptions.html
   */
  options?: monaco.editor.IEditorConstructionOptions;

  /**
   * Suggestion provider for autocompletion
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/docs.html#interfaces/languages.CompletionItemProvider.html
   */
  suggestionProvider?: monaco.languages.CompletionItemProvider;

  /**
   * Signature provider for function parameter info
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/docs.html#interfaces/languages.SignatureHelpProvider.html
   */
  signatureProvider?: monaco.languages.SignatureHelpProvider;

  /**
   * Hover provider for hover documentation
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/docs.html#interfaces/languages.HoverProvider.html
   */
  hoverProvider?: monaco.languages.HoverProvider;

  /**
   * Language config provider for bracket
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/docs.html#interfaces/languages.LanguageConfiguration.html
   */
  languageConfiguration?: monaco.languages.LanguageConfiguration;

  /**
   * Function called before the editor is mounted in the view
   */
  editorWillMount?: () => void;
  /**
   * Function called before the editor is mounted in the view
   * and completely replaces the setup behavior called by the component
   */
  overrideEditorWillMount?: () => void;

  /**
   * Function called after the editor is mounted in the view
   */
  editorDidMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;

  /**
   * Should the editor use the dark theme
   */
  useDarkTheme?: boolean;

  /**
   * Whether the suggestion widget/window will be triggered upon clicking into the editor
   */
  triggerSuggestOnFocus?: boolean;
}

export class CodeEditor extends React.Component<Props, {}> {
  _editor: monaco.editor.IStandaloneCodeEditor | null = null;

  _editorWillMount = (__monaco: unknown) => {
    if (__monaco !== monaco) {
      throw new Error('react-monaco-editor is using a different version of monaco');
    }

    if (this.props.overrideEditorWillMount) {
      this.props.overrideEditorWillMount();
      return;
    }

    if (this.props.editorWillMount) {
      this.props.editorWillMount();
    }

    // Register the theme
    monaco.editor.defineTheme('euiColors', this.props.useDarkTheme ? DARK_THEME : LIGHT_THEME);
  };

  _editorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, __monaco: unknown) => {
    console.log(`[CodeEditor] Editor did mount for language: ${this.props.languageId}`);
    
    if (__monaco !== monaco) {
      console.error('[CodeEditor] react-monaco-editor is using a different version of monaco');
      throw new Error('react-monaco-editor is using a different version of monaco');
    }

    this._editor = editor;
    
    // Get the model for this editor
    const model = editor.getModel();
    console.log(`[CodeEditor] Editor model:`, model ? {
      id: model.id,
      uri: model.uri.toString(),
      languageId: model.getLanguageId(),
    } : 'No model');
    
    // Check for markers on this model
    if (model) {
      const markers = monaco.editor.getModelMarkers({ resource: model.uri });
      console.log(`[CodeEditor] Current markers for model:`, markers);
      
      // Set up a listener for marker changes
      const disposable = monaco.editor.onDidChangeMarkers((uris) => {
        if (model && uris.some(uri => uri.toString() === model.uri.toString())) {
          const updatedMarkers = monaco.editor.getModelMarkers({ resource: model.uri });
          console.log(`[CodeEditor] Markers changed:`, updatedMarkers);
        }
      });
      
      // Clean up the listener when the editor is disposed
      editor.onDidDispose(() => {
        console.log(`[CodeEditor] Editor disposed`);
        disposable.dispose();
      });
      
      // Add listener for content changes
      console.log(`[CodeEditor] Setting up content change listener for model: ${model.uri.toString()}`);
      model.onDidChangeContent((event) => {
        console.log(`[CodeEditor] Content changed in model: ${model.uri.toString()}`);
        console.log(`[CodeEditor] Change event:`, {
          changes: event.changes.map(change => ({
            range: {
              startLineNumber: change.range.startLineNumber,
              startColumn: change.range.startColumn,
              endLineNumber: change.range.endLineNumber,
              endColumn: change.range.endColumn
            },
            text: change.text
          })),
          isUndoing: event.isUndoing,
          isRedoing: event.isRedoing
        });
        console.log(`[CodeEditor] New content:`, model.getValue());
        
        // Note: We don't need to manually trigger validation here
        // The PPL language module in packages/osd-monaco/src/ppl/language.ts
        // already registers validators that run automatically when content changes
      });
    }

    if (this.props.editorDidMount) {
      console.log(`[CodeEditor] Calling editorDidMount callback`);
      this.props.editorDidMount(editor);
    }

    if (this.props.triggerSuggestOnFocus) {
      console.log(`[CodeEditor] Setting up triggerSuggestOnFocus`);
      editor.onDidFocusEditorWidget(() => {
        console.log(`[CodeEditor] Editor focused, triggering suggestions`);
        editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
      });
    }
  };

  render() {
    const { languageId, value, onChange, width, height, options } = this.props;
    console.log(`[CodeEditor] Setting up language: ${languageId}`);

    // Check if the language is already loaded
    const languages = monaco.languages.getLanguages();
    const languageExists = languages.some(lang => lang.id === languageId);
    console.log(`[CodeEditor] Language ${languageId} exists: ${languageExists}`);

    // Register providers when the language is loaded
    monaco.languages.onLanguage(languageId, () => {
      console.log(`[CodeEditor] Language ${languageId} loaded, registering providers`);
      
      if (this.props.suggestionProvider) {
        console.log(`[CodeEditor] Registering suggestion provider for ${languageId}`);
        monaco.languages.registerCompletionItemProvider(languageId, this.props.suggestionProvider);
      }

      if (this.props.signatureProvider) {
        console.log(`[CodeEditor] Registering signature provider for ${languageId}`);
        monaco.languages.registerSignatureHelpProvider(languageId, this.props.signatureProvider);
      }

      if (this.props.hoverProvider) {
        console.log(`[CodeEditor] Registering hover provider for ${languageId}`);
        monaco.languages.registerHoverProvider(languageId, this.props.hoverProvider);
      }

      if (this.props.languageConfiguration) {
        console.log(`[CodeEditor] Setting language configuration for ${languageId}`);
        monaco.languages.setLanguageConfiguration(languageId, this.props.languageConfiguration);
      }
      
      // Force register the language if it doesn't exist
      if (!languageExists) {
        console.log(`[CodeEditor] Forcing language registration for ${languageId}`);
        monaco.languages.register({ id: languageId });
      }
    });

    return (
      <React.Fragment>
        <MonacoEditor
          theme="euiColors"
          language={languageId}
          value={value}
          onChange={onChange}
          editorWillMount={this._editorWillMount}
          editorDidMount={this._editorDidMount}
          width={width}
          height={height}
          options={options}
        />
        <ReactResizeDetector handleWidth handleHeight onResize={this._updateDimensions} />
      </React.Fragment>
    );
  }

  _updateDimensions = () => {
    if (this._editor) {
      this._editor.layout();
    }
  };
}

// React.lazy requires default export
// eslint-disable-next-line import/no-default-export
export default CodeEditor;
