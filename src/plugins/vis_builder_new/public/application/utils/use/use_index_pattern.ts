/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState } from 'react';
import { i18n } from '@osd/i18n';
import { IndexPattern } from '../../../../../data/public';
import { VisBuilderViewServices } from '../../../types';
import { useSelector, updateIndexPattern } from '../state_management';
import { getIndexPatternId } from '../helpers/index_pattern_helper';

export const useIndexPattern = (services: VisBuilderViewServices): IndexPattern => {
  const indexPatternIdFromState = useSelector((state) => state.metadata.indexPattern);
  const [indexPattern, setIndexPattern] = useState<IndexPattern>();
  const { data, toastNotifications, uiSettings: config, store } = services;

  useEffect(() => {
    let isMounted = true;

    const fetchIndexPatternDetails = (id: string) => {
      data.indexPatterns
        .get(id)
        .then((result) => {
          if (isMounted) {
            setIndexPattern(result);
          }
        })
        .catch(() => {
          if (isMounted) {
            const indexPatternMissingWarning = i18n.translate(
              'discover.valueIsNotConfiguredIndexPatternIDWarningTitle',
              {
                defaultMessage: '{id} is not a configured index pattern ID',
                values: {
                  id: `"${id}"`,
                },
              }
            );
            toastNotifications.addDanger({
              title: indexPatternMissingWarning,
            });
          }
        });
    };

    if (!indexPatternIdFromState) {
      data.indexPatterns.getCache().then((indexPatternList) => {
        const newId = getIndexPatternId('', indexPatternList, config.get('defaultIndex'));
        store!.dispatch(updateIndexPattern(newId));
        fetchIndexPatternDetails(newId);
      });
    } else {
      fetchIndexPatternDetails(indexPatternIdFromState);
    }

    return () => {
      isMounted = false;
    };
  }, [indexPatternIdFromState, data.indexPatterns, toastNotifications, config, store]);

  return indexPattern;
};
