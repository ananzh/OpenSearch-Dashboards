/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import './sse_bridge_client';

export interface OsdMcpServerPluginSetup {}
export interface OsdMcpServerPluginStart {}

export class OsdMcpServerPlugin
  implements Plugin<OsdMcpServerPluginSetup, OsdMcpServerPluginStart> {
  public setup(core: CoreSetup): OsdMcpServerPluginSetup {
    console.log('🔧 OSD MCP SERVER PLUGIN: Public setup starting...');

    // The SSE bridge client is automatically initialized when imported
    console.log('📡 OSD MCP SERVER PLUGIN: SSE bridge client loaded via import');
    console.log(
      '🔍 OSD MCP SERVER PLUGIN: Checking if sseBridgeClient is available on window...'
    );
    console.log(
      '🔍 OSD MCP SERVER PLUGIN: window.sseBridgeClient =',
      (window as any).sseBridgeClient
    );

    return {};
  }

  public start(core: CoreStart): OsdMcpServerPluginStart {
    console.log('🚀 OSD MCP SERVER PLUGIN: Public start');
    console.log(
      '🔍 OSD MCP SERVER PLUGIN: Final check - window.sseBridgeClient =',
      (window as any).sseBridgeClient
    );
    return {};
  }

  public stop() {
    console.log('🛑 OSD MCP SERVER PLUGIN: Public stop');
  }
}
