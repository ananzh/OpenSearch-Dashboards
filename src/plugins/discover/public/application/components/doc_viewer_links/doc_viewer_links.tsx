/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiListGroupItem, EuiListGroupItemProps } from '@elastic/eui';
import { getDocViewsLinksRegistry } from '../../../opensearch_dashboards_services';
import { DocViewLinkRenderProps } from '../../doc_views_components/doc_views_links/doc_views_links_types';

export function DocViewerLinks(renderProps: DocViewLinkRenderProps) {
  const listItems = getDocViewsLinksRegistry()
    .getDocViewsLinksSorted()
    .filter((item) => !(item.generateCb && item.generateCb(renderProps)?.hide))
    .map((item) => {
      const { generateCb, href, ...props } = item;
      const listItem: EuiListGroupItemProps = {
        'data-test-subj': 'docTableRowAction',
        ...props,
        href: generateCb ? generateCb(renderProps).url : href,
      };

      return listItem;
    });
  const handleUrlClick = (url) => {
    // split the pathname into segments
    const urlSegments = window.location.href.split('/');

    // find the index of the "data-explorer" segment
    const indexOfDataExplorerInUrl = urlSegments.indexOf('data-explorer');

    // if "data-explorer" is found, remove it from the array
    if (indexOfDataExplorerInUrl !== -1) {
      urlSegments.splice(indexOfDataExplorerInUrl, 1);
    }

    // Create a new URL object from the current location
    const newUrl = urlSegments.join('/');
    const updatedUrlSegments = newUrl.split('#');
    updatedUrlSegments[1] = url;
    const updatedUrl = updatedUrlSegments.join('');
    window.location.href = updatedUrl;
  };

  return (
    <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
      {listItems.map((item, index) => (
        <EuiFlexItem key={index} grow={false}>
          <EuiListGroupItem {...item} onClick={() => handleUrlClick(item.href)} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
