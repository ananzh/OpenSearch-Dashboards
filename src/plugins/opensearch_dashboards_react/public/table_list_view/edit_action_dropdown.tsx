/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiContextMenu, EuiIcon, EuiPopover, EuiText, EuiConfirmModal } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@osd/i18n';
import { useOpenSearchDashboards } from '../context';

// TODO: include more types once VisBuilder supports more visualization types
const types = ['Area', 'Vertical Bar', 'Line', 'Metric', 'Table'];

export interface VisualizationItem {
  typeTitle: string;
  id?: string;
  version?: number;
  overlays? :any
}

interface EditActionDropdownProps {
  item: VisualizationItem;
  editItem?(item: VisualizationItem): void;
  visbuilderEditItem?(item: VisualizationItem): void;
}

export const EditActionDropdown: React.FC<EditActionDropdownProps> = ({
  item,
  editItem,
  visbuilderEditItem,
}) => {
  const { overlays } = useOpenSearchDashboards();
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const onButtonClick = () => {
    setPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopoverOpen(false);
  };

  // A saved object will only have the 'Import to VisBuilder' option
  // if it is a VisBuilder-compatible type and its version is <= 1.
  const typeName = item.typeTitle;
  const itemVersion = item.version;
  const isVisBuilderCompatible =
    types.includes(typeName) && itemVersion !== undefined && itemVersion <= 1;

    const handleImportToVisBuilder = () => {
      closePopover(); // Close the popover first
  
      const modal = overlays.openModal(
        <EuiConfirmModal
          title="Partial import"
          onCancel={() => modal.close()}
          onConfirm={async () => {
            modal.close();
            // Call visbuilderEditItem with the item
            if (visbuilderEditItem) {
              await visbuilderEditItem(item);
            }
          }}
          cancelButtonText="Cancel"
          confirmButtonText="Import"
        >
          <EuiText>
            <p>The following settings are incompatible and will not be imported:</p>
            <p>Comma, separated, list</p>
          </EuiText>
        </EuiConfirmModal>
      );
    }; 

  const panels = [
    {
      id: 0,
      items: [
        {
          name: i18n.translate('editActionDropdown.edit', {
            defaultMessage: 'Edit',
          }),
          icon: 'pencil',
          onClick: () => {
            closePopover();
            editItem?.(item);
          },
        },
        ...(isVisBuilderCompatible
          ? [
              {
                name: i18n.translate('editActionDropdown.importToVisBuilder', {
                  defaultMessage: 'Import to VisBuilder',
                }),
                icon: 'importAction',
                onClick: handleImportToVisBuilder,
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <EuiPopover
      button={<EuiIcon type="pencil" onClick={onButtonClick} />}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      initialFocus={false}
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
