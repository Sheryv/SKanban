import { NodeCtx } from '../shared/node-ctx';
import hljs from 'highlight.js';
import { DateTime } from 'luxon';


export const NODE_CTX: NodeCtx = window['NODE_CTX'];

export const IS_ELECTRON = NODE_CTX?.sendAsyncEventToMain != null;

window['hljs'] = hljs;
(window as Window)['luxon'] = DateTime;
