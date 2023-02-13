/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ChromeStart } from 'opensearch-dashboards/public';

export const useChromeVisibility = (chrome: ChromeStart) => {
  const [isVisible, setIsVisible] = useState<boolean>();

  useEffect(() => {
    const subscription = chrome.getIsVisible$().subscribe((value: boolean) => {
      setIsVisible(value);
    });

    return () => subscription.unsubscribe();
  }, [chrome]);

  return isVisible;
};
