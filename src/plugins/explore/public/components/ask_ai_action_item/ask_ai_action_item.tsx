/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  EuiFieldText,
  EuiButton,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { ExploreServices } from '../../types';
import { LogActionItemProps } from '../../types/log_actions';
import { ChatService } from '../../../../chat/public';

// Create stable NOOP hook reference outside component to avoid re-renders
const NOOP_DYNAMIC_CONTEXT_HOOK = (): string => '';

interface AskAIActionItemProps extends LogActionItemProps {
  chatService: ChatService;
}

export const AskAIActionItem: React.FC<AskAIActionItemProps> = ({
  context,
  onClose,
  onResult,
  chatService,
}) => {
  const { services } = useOpenSearchDashboards<ExploreServices>();
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);

  // Cleanup function to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Create context data for dynamic context registration (like table_row.tsx)
  const contextData = useMemo(() => {
    // Generate proper row label using table index (same as table_row.tsx)
    const rowIndex = context.metadata?.index;
    const documentId = context.document._id || `log-${Date.now()}`;
    const rowLabel = rowIndex !== undefined ? `Row ${rowIndex + 1}` : 'Selected Row';

    const data = {
      id: `ask-ai-action-${documentId}`,
      description: `Selected log entry from Explore data table for AI analysis`,
      value: context.document,
      label: rowLabel,
      categories: ['explore', 'chat', 'dynamic'],
    };

    // eslint-disable-next-line no-console
    console.log('🎯 [AskAIActionItem] Context data created:', {
      documentId,
      rowLabel,
      rowIndex,
      hasIndex: rowIndex !== undefined,
      contextData: data,
      document: context.document,
      metadata: context.metadata,
    });

    return data;
  }, [context.document, context.metadata]);

  // Register dynamic context using proper hook (like table_row.tsx pattern)
  const useDynamicContext =
    services.contextProvider?.hooks?.useDynamicContext || NOOP_DYNAMIC_CONTEXT_HOOK;

  // eslint-disable-next-line no-console
  console.log('🔧 [AskAIActionItem] Dynamic context hook info:', {
    hasContextProvider: !!services.contextProvider,
    hasHooks: !!services.contextProvider?.hooks,
    hasUseDynamicContext: !!services.contextProvider?.hooks?.useDynamicContext,
    isUsingNoop: useDynamicContext === NOOP_DYNAMIC_CONTEXT_HOOK,
    contextData,
  });

  const dynamicContextResult = useDynamicContext(contextData);

  // eslint-disable-next-line no-console
  console.log('🎯 [AskAIActionItem] Dynamic context registered:', {
    result: dynamicContextResult,
    contextData,
  });

  // Check if context was actually stored
  if (services.contextProvider) {
    const contextStore = services.contextProvider.getAssistantContextStore();
    // eslint-disable-next-line no-console
    console.log('🏪 [AskAIActionItem] Context store check:', {
      hasContextStore: !!contextStore,
      allContexts: contextStore?.getAllContexts?.() || 'getAllContexts not available',
      dynamicContexts: contextStore?.getDynamicContexts?.() || 'getDynamicContexts not available',
    });
  }

  const handleExecute = useCallback(async () => {
    // eslint-disable-next-line no-console
    console.log('🚀 [AskAIActionItem] Handle execute started:', {
      userInput: userInput.trim(),
      hasUserInput: !!userInput.trim(),
      chatService: !!chatService,
      isWindowOpen: chatService?.isWindowOpen?.(),
    });

    if (!userInput.trim()) {
      // eslint-disable-next-line no-console
      console.log('❌ [AskAIActionItem] No user input provided');
      onResult?.({ success: false, error: 'Please provide a question about the log entry.' });
      return;
    }

    if (!isMountedRef.current) return;

    setIsLoading(true);

    try {
      // Create user message to include in conversation history (fix Issue 2)
      const userMessage = {
        id: `msg-${Date.now()}`,
        role: 'user' as const,
        content: userInput.trim(),
      };

      // eslint-disable-next-line no-console
      console.log('💬 [AskAIActionItem] User message created:', userMessage);

      // Check if chat window is open and handle accordingly
      const isOpen = chatService.isWindowOpen();

      // eslint-disable-next-line no-console
      console.log('📡 [AskAIActionItem] Chat service state:', {
        isOpen,
        chatServiceMethods: Object.keys(chatService || {}),
        sendMessage: typeof chatService?.sendMessage,
        sendMessageWithWindow: typeof chatService?.sendMessageWithWindow,
      });

      if (isOpen) {
        // Chat is open - send message to existing conversation with proper message history
        // eslint-disable-next-line no-console
        console.log('📤 [AskAIActionItem] Sending to existing chat window...', {
          userInput: userInput.trim(),
          messages: [userMessage],
          userMessage,
        });
        await chatService.sendMessage(userInput.trim(), [userMessage]);
      } else {
        // Chat is closed - open it and send message (will start new conversation)
        // eslint-disable-next-line no-console
        console.log('📤 [AskAIActionItem] Opening chat window and sending message...', {
          userInput: userInput.trim(),
          messages: [userMessage],
          userMessage,
          options: { clearConversation: true },
        });
        await chatService.sendMessageWithWindow(userInput.trim(), [userMessage], {
          clearConversation: true,
        });
      }

      // eslint-disable-next-line no-console
      console.log('✅ [AskAIActionItem] Message sent successfully');

      onResult?.({
        success: true,
        data: { message: 'Question sent to AI assistant with log context' },
      });

      // Close the action panel
      onClose();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('❌ [AskAIActionItem] Error sending message:', error);
      onResult?.({
        success: false,
        error: `Failed to send message to AI: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [userInput, chatService, onResult, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleExecute();
      }
    },
    [handleExecute]
  );

  return (
    <div style={{ padding: '16px', minWidth: '300px' }}>
      <EuiText size="s" color="subdued">
        Ask AI about this log entry. The log data will be automatically included as context.
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFieldText
        placeholder="Ask a question about this log entry..."
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        fullWidth
        data-test-subj="askAiActionInput"
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={onClose} disabled={isLoading}>
            Cancel
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            onClick={handleExecute}
            isLoading={isLoading}
            disabled={isLoading || !userInput.trim()}
            data-test-subj="askAiActionExecuteButton"
          >
            {isLoading ? 'Sending...' : 'Send to AI'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
