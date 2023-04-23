import { NgxMonacoEditorConfig } from 'ngx-monaco-editor-v2';

export const MONACO_EDITOR_CONFIG: NgxMonacoEditorConfig = {
  baseUrl: './assets', // configure base path for monaco editor. Starting with version 8.0.0 it defaults to './assets'. Previous releases default to '/assets'
  defaultOptions: {scrollBeyondLastLine: false}, // pass default options to be used
  onMonacoLoad: () => {
    console.log((<any>window).monaco);
    (<any>window).monaco.editor.defineTheme('monokai', {
      'base': 'vs-dark',
      'inherit': true,
      'rules': [
        {
          'background': '1F201B', //'272822',
          'token': '',
        },
        {
          'foreground': '75715e',
          'token': 'comment',
        },
        {
          'foreground': 'e6db74',
          'token': 'string',
        },
        {
          'foreground': 'ae81ff',
          'token': 'constant.numeric',
        },
        {
          'foreground': 'ae81ff',
          'token': 'constant.language',
        },
        {
          'foreground': 'ae81ff',
          'token': 'constant.character',
        },
        {
          'foreground': 'ae81ff',
          'token': 'constant.other',
        },
        {
          'foreground': 'A6E22E',
          'token': 'keyword',
        },
        {
          'foreground': 'f92672',
          'token': 'keyword.control',
        },
        {
          'foreground': 'f92672',
          'token': 'storage',
        },
        {
          'foreground': '66d9ef',
          'fontStyle': 'italic',
          'token': 'storage.type',
        },
        {
          'foreground': 'a6e22e',
          'fontStyle': 'underline',
          'token': 'entity.name.class',
        },
        {
          'foreground': 'a6e22e',
          'fontStyle': 'italic underline',
          'token': 'entity.other.inherited-class',
        },
        {
          'foreground': 'a6e22e',
          'token': 'entity.name.function',
        },
        {
          'foreground': 'fd971f',
          'fontStyle': 'italic',
          'token': 'variable.parameter',
        },
        {
          'foreground': 'f92672',
          'token': 'entity.name.tag',
        },
        {
          'foreground': 'a6e22e',
          'token': 'entity.other.attribute-name',
        },
        {
          'foreground': '66d9ef',
          'token': 'support.function',
        },
        {
          'foreground': '66d9ef',
          'token': 'support.constant',
        },
        {
          'foreground': '66d9ef',
          'fontStyle': 'italic',
          'token': 'support.type',
        },
        {
          'foreground': '66d9ef',
          'fontStyle': 'italic',
          'token': 'support.class',
        },
        {
          'foreground': 'f8f8f0',
          'background': 'f92672',
          'token': 'invalid',
        },
        {
          'foreground': 'f8f8f0',
          'background': 'ae81ff',
          'token': 'invalid.deprecated',
        },
        {
          'foreground': 'cfcfc2',
          'token': 'meta.structure.dictionary.json string.quoted.double.json',
        },
        {
          'foreground': '75715e',
          'token': 'meta.diff',
        },
        {
          'foreground': '75715e',
          'token': 'meta.diff.header',
        },
        {
          'foreground': 'f92672',
          'token': 'markup.deleted',
        },
        {
          'foreground': 'a6e22e',
          'token': 'markup.inserted',
        },
        {
          'foreground': 'e6db74',
          'token': 'markup.changed',
        },
        {
          'foreground': 'FD971F',
          'token': 'markup.inline.raw',
        },
        {
          'foreground': 'd36363',
          'token': 'number',
        },
        {
          'foreground': '66D9EF',
          'token': 'emphasis',
        },
        {
          'foreground': '66D9EF',
          'token': 'strong',
        },
        {
          'foreground': 'ae81ffa0',
          'token': 'constant.numeric.line-number.find-in-files - match',
        },
        {
          'foreground': 'e6db74',
          'token': 'entity.name.filename.find-in-files',
        },
      ],
      'colors': {
        'editor.foreground': '#F8F8F2',
        'editor.background': '#1F201B',
        'editor.selectionBackground': '#49483E',
        'editor.lineHighlightBackground': '#3E3D32',
        'editorCursor.foreground': '#F8F8F0',
        'editorWhitespace.foreground': '#3B3A32',
        'editorIndentGuide.activeBackground': '#9D550FB0',
        'editor.selectionHighlightBorder': '#222218',
      },
    });
  }, // here monaco object will be available as window.monaco use this function to extend monaco editor functionalities.
};
