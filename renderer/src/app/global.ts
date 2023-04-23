import { NodeCtx } from '../shared/node-ctx';


export const NODE_CTX: NodeCtx = window['NODE_CTX'];

export const IS_ELECTRON = NODE_CTX?.sendAsyncEventToMain != null;
