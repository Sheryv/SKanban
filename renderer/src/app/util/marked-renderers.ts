/* eslint-disable @typescript-eslint/naming-convention */
import { Settings } from '../service/settings.service';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { markedHighlight } from 'marked-highlight';
import MarkedOptions = marked.MarkedOptions;
import MarkedExtension = marked.MarkedExtension;

export class MarkdownUtils {
  private static readonly REG_EXP_CARET_RETURN = /\r/g;
  private static readonly REG_EXP_NEW_LINE_PAIR = /\n\n\n/g;


  static prepareMarkedRenderer(renderType: 'image' | 'table' | 'code' | 'listitem') {
    switch (renderType) {
      case 'image':
        return function (href: string, title: string, text: string) {
          let out = `<img style="max-width: 100%;" src="${href}" alt="${text}"`;
          if (title) {
            out += ` title="${title}"`;
          }
          out += (<any>this.options).xhtml ? '/>' : '>';
          return out;
        };
      case 'code':
        return function (code: any, language: any) {
          const validLang = !!(language && hljs.getLanguage(language));
          const highlighted = validLang ? hljs.highlight(language, code).value : hljs.highlightAuto(code);
          return `<pre style="padding: 0; border-radius: 0;"><code class="hljs ${language}">${highlighted}</code></pre>`;
        };
      case 'table':
        return function (header: string, body: string) {
          return `<table class="table table-bordered">\n<thead>\n${header}</thead>\n<tbody>\n${body}</tbody>\n</table>\n`;
        };
      case 'listitem':
        return function (text: any, task: boolean, checked: boolean) {
          if (/^\s*\[[x ]\]\s*/.test(text) || text.startsWith('<input')) {
            if (text.startsWith('<input')) {
              text = text
                .replace('<input disabled="" type="checkbox">', '<i class="material-icons-outlined font-13 fg-success">check_box</i>')
                .replace('<input checked="" disabled="" type="checkbox">', '<i class="material-icons-outlined font-13">check_box_outline_blank</i>');
            } else {
              text = text
                .replace(/^\s*\[ \]\s*/, '<i class="material-icons-outlined font-13 fg-success">check_box</i> ')
                .replace(/^\s*\[x\]\s*/, '<i class="material-icons-outlined font-13">check_box_outline_blank</i> ');
            }
            return `<li>${text}<span class="d-inline-flex align-items-center"></span></li>`;
          } else {
            return `<li>${text}</li>`;
          }
        };
    }
    throw Error('Unknown render type');
  }


  static preProcessContent(content: string, settings: Settings): string {
    const config = settings.ui.editor.codeParserConfig.getValue();
    let normalized = content.replace(this.REG_EXP_CARET_RETURN, '');
    if (config) {
      const lines = config.split('\n');
      for (const pattern of lines) {
        const indexOf = pattern.lastIndexOf(';');
        if (indexOf > 0) {
          const reg = pattern.substring(0, indexOf);
          let url = pattern.substring(indexOf + 1);
          if (!url.includes('$')) {
            url += '$&';
          }
          normalized = normalized.replace(new RegExp(reg, 'g'), '[$&](' + url + ')');
        }
      }
    }
    return normalized.replace(this.REG_EXP_NEW_LINE_PAIR, '<br/> \n\n');
  }

  // static editorOptions(): MdEditorOption {
  //   return {
  //     showPreviewPanel: false,   // Show preview panel, Default is true
  //     // showBorder?: boolean          // Show editor component's border. Default is true
  //     // ['Bold', 'Italic', 'Heading', 'Refrence', 'Link', 'Image', 'Ul', 'Ol', 'Code', 'TogglePreview', 'FullScreen']. Default is empty
  //     hideIcons: ['Heading', 'Image'],
  //     usingFontAwesome5: true,   // Using font awesome with version 5, Default is false
  //     // scrollPastEnd?: number        // The option for ace editor. Default is 0
  //     enablePreviewContentClick: true,  // Allow user fire the click event on the preview panel, like href etc. Default is false
  //     resizable: true,          // Allow resize the editor
  //     markedjsOpt: {
  //       gfm: true,
  //       // headerPrefix: '_H_',
  //       breaks: true,
  //     },  // The markedjs option, see https://marked.js.org/#/USING_ADVANCED.md#options
  //     // customRender?: {              // Custom markedjs render
  //     //   image?: Function     // Image Render
  //     //   table?: Function     // Table Render
  //     //   code?: Function      // Code Render
  //     //   listitem?: Function  // Listitem Render
  //     // }
  //   };
  // }

  static prepareMarkedOptions(): MarkedOptions {
    const markedRender = new marked.Renderer();
    markedRender.image = MarkdownUtils.prepareMarkedRenderer('image') as any;
    markedRender.code = MarkdownUtils.prepareMarkedRenderer('code') as any;
    markedRender.table = MarkdownUtils.prepareMarkedRenderer('table') as any;
    markedRender.listitem = MarkdownUtils.prepareMarkedRenderer('listitem') as any;
    return {
      mangle: false,
      headerIds: false,
      gfm: true,
      renderer: markedRender,
    };
  }

  static prepareHighlightPlugin(): MarkedExtension {
    return markedHighlight({
      // langPrefix: 'hljs language-',
      highlight: (code: string, language: string) => {
        if (language) {
          return hljs.highlight(code, { language }).value;
        } else {
          return hljs.highlightAuto(code).value;
        }
      },
    });
  }
}


