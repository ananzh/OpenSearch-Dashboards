/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext } from 'react';
import { EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { AssistantActionContext } from '../../../context_provider/public';

interface ToolCallRendererProps {
  toolCallId: string;
}

export function ToolCallRenderer({ toolCallId }: ToolCallRendererProps) {
  console.log('🔧 [ToolCallRenderer] ENTRY - toolCallId:', toolCallId);

  const context = useContext(AssistantActionContext);

  if (!context) {
    console.log('🔧 [ToolCallRenderer] ERROR - No AssistantActionContext found');
    return null;
  }

  console.log('🔧 [ToolCallRenderer] AssistantActionContext available:', {
    hasGetActionRenderer: !!context.getActionRenderer,
    toolCallStatesSize: context.toolCallStates.size,
    toolCallStateKeys: Array.from(context.toolCallStates.keys()),
  });

  const { toolCallStates, getActionRenderer } = context;
  const toolCallState = toolCallStates.get(toolCallId);

  console.log('🔧 [ToolCallRenderer] Tool call state retrieved:', {
    toolCallId,
    hasState: !!toolCallState,
    state: toolCallState
      ? {
          name: toolCallState.name,
          status: toolCallState.status,
          hasArgs: !!toolCallState.args,
          hasResult: !!toolCallState.result,
          hasError: !!toolCallState.error,
        }
      : null,
  });

  if (!toolCallState) {
    console.log('🔧 [ToolCallRenderer] ERROR - No tool call state found for ID:', toolCallId);
    return null;
  }

  console.log('🔧 [ToolCallRenderer] Calling getActionRenderer for tool:', toolCallState.name);
  const renderer = getActionRenderer(toolCallState.name);
  console.log('🔧 [ToolCallRenderer] Renderer lookup result:', {
    toolName: toolCallState.name,
    hasRenderer: !!renderer,
    rendererType: typeof renderer,
  });

  // If no custom renderer, show default status
  if (!renderer) {
    console.log(
      '🔧 [ToolCallRenderer] No custom renderer found, using default UI for:',
      toolCallState.name
    );
    if (toolCallState.status === 'executing') {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              Running {toolCallState.name}...
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    return null;
  }

  console.log('🔧 [ToolCallRenderer] CALLING CUSTOM RENDERER for:', toolCallState.name, {
    status: toolCallState.status,
    hasArgs: !!toolCallState.args,
    hasResult: !!toolCallState.result,
    hasError: !!toolCallState.error,
  });

  try {
    const rendererResult = renderer({
      status: toolCallState.status,
      args: toolCallState.args,
      result: toolCallState.result,
      error: toolCallState.error,
    });

    console.log('🔧 [ToolCallRenderer] Custom renderer returned:', {
      toolName: toolCallState.name,
      hasResult: !!rendererResult,
      resultType: typeof rendererResult,
    });

    return <div className="tool-call-render">{rendererResult}</div>;
  } catch (error) {
    console.error('🔧 [ToolCallRenderer] ERROR in custom renderer for:', toolCallState.name, error);
    return (
      <div className="tool-call-render">
        <EuiText color="danger">Error rendering {toolCallState.name}</EuiText>
      </div>
    );
  }
}
