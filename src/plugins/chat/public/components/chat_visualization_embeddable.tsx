/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useContext } from 'react';
import { EuiPanel, EuiText, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { ChatVisualization } from '../services/chat_visualization_service';
import { useOpenSearchDashboards } from '../../../opensearch_dashboards_react/public';
import { ChatServices } from '../types';

interface ChatVisualizationEmbeddableProps {
  visualization: ChatVisualization;
  height?: number;
  width?: string;
}

/**
 * Component that renders a visualization embeddable within the chat timeline
 */
export const ChatVisualizationEmbeddable: React.FC<ChatVisualizationEmbeddableProps> = ({
  visualization,
  height = 350,
  width = '100%',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { services } = useOpenSearchDashboards<ChatServices>();

  useEffect(() => {
    let isMounted = true;

    const renderVisualization = async () => {
      if (!containerRef.current || !services.expressions) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log(`[ChatVisualizationEmbeddable] Rendering visualization ${visualization.id}`);

        // Use expressions service to render the visualization
        const expressionRenderer = await services.expressions.ReactExpressionRenderer;

        if (!isMounted) return;

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Create a React component for the expression
        const ExpressionComponent = () => (
          <expressionRenderer
            expression={visualization.expression}
            searchContext={{}}
            onRender={() => {
              console.log(
                `[ChatVisualizationEmbeddable] Visualization ${visualization.id} rendered successfully`
              );
              if (isMounted) {
                setIsLoading(false);
              }
            }}
            onError={(renderError: any) => {
              console.error(
                `[ChatVisualizationEmbeddable] Render error for ${visualization.id}:`,
                renderError
              );
              if (isMounted) {
                setError(`Failed to render visualization: ${renderError.message || renderError}`);
                setIsLoading(false);
              }
            }}
          />
        );

        // Render the component
        if (containerRef.current && isMounted) {
          const React = await import('react');
          const ReactDOM = await import('react-dom');
          ReactDOM.render(<ExpressionComponent />, containerRef.current);
        }
      } catch (renderError) {
        console.error(
          `[ChatVisualizationEmbeddable] Failed to setup renderer for ${visualization.id}:`,
          renderError
        );
        if (isMounted) {
          setError(`Failed to setup visualization renderer: ${renderError}`);
          setIsLoading(false);
        }
      }
    };

    renderVisualization();

    return () => {
      isMounted = false;
      // Cleanup: unmount React component if needed
      if (containerRef.current) {
        const ReactDOM = require('react-dom');
        ReactDOM.unmountComponentAtNode(containerRef.current);
      }
    };
  }, [visualization.expression, services.expressions]);

  if (error) {
    return (
      <EuiPanel color="danger" paddingSize="m">
        <EuiText color="danger" size="s">
          <strong>Visualization Error</strong>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiText size="xs">{error}</EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel paddingSize="none" style={{ width, minHeight: height }}>
      {visualization.title && (
        <>
          <div style={{ padding: '12px 16px 0' }}>
            <EuiText size="s">
              <strong>{visualization.title}</strong>
            </EuiText>
          </div>
          <EuiSpacer size="s" />
        </>
      )}

      <div style={{ position: 'relative', height, width: '100%' }}>
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}
          >
            <EuiLoadingSpinner size="l" />
          </div>
        )}

        <div
          ref={containerRef}
          style={{
            height: '100%',
            width: '100%',
            opacity: isLoading ? 0.3 : 1,
            transition: 'opacity 0.3s ease',
          }}
        />
      </div>
    </EuiPanel>
  );
};
