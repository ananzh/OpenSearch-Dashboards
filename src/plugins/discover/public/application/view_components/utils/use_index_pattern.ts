/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { i18n } from '@osd/i18n';
import { IndexPattern } from '../../../../../data/public';
import { useSelector } from '../../utils/state_management';
import { DiscoverServices } from '../../../build_services';

export const useIndexPattern = (services: DiscoverServices) => {
  let indexPatternId = useSelector((state) => state.metadata.indexPattern);
  const [indexPattern, setIndexPattern] = useState<IndexPattern | undefined>(undefined);
  const { data, toastNotifications, indexPatterns } = services;
  const updateIndexPattern = async(id: string) => {
    indexPatternId = id;
    const updatedIndexPattern= await indexPatterns.get(indexPatternId );
    setIndexPattern(updatedIndexPattern);
  }

  useEffect(() => {
    let isMounted = true;
    if (!indexPatternId) return;
    const indexPatternMissingWarning = i18n.translate(
      'discover.valueIsNotConfiguredIndexPatternIDWarningTitle',
      {
        defaultMessage: '{id} is not a configured index pattern ID',
        values: {
          id: `"${indexPatternId}"`,
        },
      }
    );
    if(indexPattern && indexPattern.id && indexPattern.id!==indexPatternId){
      indexPatternId = indexPattern.id;
    }

    data.indexPatterns
      .get(indexPatternId)
      .then((result) => {
        if (isMounted) {
          setIndexPattern(result);
        }
      })
      .catch(() => {
        if (isMounted) {
          toastNotifications.addDanger({
            title: indexPatternMissingWarning,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [indexPatternId, data.indexPatterns, toastNotifications, indexPattern]);

  return { indexPattern, updateIndexPattern};
};
