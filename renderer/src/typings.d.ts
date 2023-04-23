/* SystemJS module definition */
import type { NodeCtx } from '../main/preload/node-ctx';

// declare const nodeModule: NodeModule;
//
// interface NodeModule {
//   id: string;
// }

interface Window {
  process: any;
  require: any;
}
