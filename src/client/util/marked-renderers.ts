import { UiSettings } from '../model/settings';
import { MdEditorOption } from 'ngx-markdown-editor/src/lib/md-editor.types';

declare let marked: any;
declare let hljs: any;

export class MarkdownUtils {
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
          const highlighted = validLang ? hljs.highlight(language, code).value : code;
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
                .replace('<input disabled="" type="checkbox">', '<i class="fa fa-square-o"></i>')
                .replace('<input checked="" disabled="" type="checkbox">', '<i class="fa fa-check-square"></i>');
            } else {
              text = text
                .replace(/^\s*\[ \]\s*/, '<i class="fa fa-square-o"></i> ')
                .replace(/^\s*\[x\]\s*/, '<i class="fa fa-check-square"></i> ');
            }
            return `<li>${text}</li>`;
          } else {
            return `<li>${text}</li>`;
          }
        };
    }
    throw Error('Unknow rebnder type');
  }
  
  static preProcessContent(content: string, settings: UiSettings): string {
    const config = settings.codeParserConfig;
    if (config) {
      const lines = config.replace(/\r/g, '').split('\n');
      for (const line of lines) {
        const indexOf = line.lastIndexOf(';');
        if (indexOf > 0) {
          const reg = line.substring(0, indexOf);
          let url = line.substring(indexOf + 1);
          if (!url.includes('$')) {
            url += '$&';
          }
          content = content.replace(new RegExp(reg, 'g'), '[$&](' + url + ')');
        }
      }
    }
    return content;
  }
  
  static editorOptions(): MdEditorOption {
    return {
      showPreviewPanel: false,   // Show preview panel, Default is true
      // showBorder?: boolean          // Show editor component's border. Default is true
      hideIcons: ['Heading', 'Image'],   // ['Bold', 'Italic', 'Heading', 'Refrence', 'Link', 'Image', 'Ul', 'Ol', 'Code', 'TogglePreview', 'FullScreen']. Default is empty
      usingFontAwesome5: true,   // Using font awesome with version 5, Default is false
      // scrollPastEnd?: number        // The option for ace editor. Default is 0
      enablePreviewContentClick: true,  // Allow user fire the click event on the preview panel, like href etc. Default is false
      resizable: true,          // Allow resize the editor
      // markedjsOpt?: MarkedjsOption  // The markedjs option, see https://marked.js.org/#/USING_ADVANCED.md#options
      // customRender?: {              // Custom markedjs render
      //   image?: Function     // Image Render
      //   table?: Function     // Table Render
      //   code?: Function      // Code Render
      //   listitem?: Function  // Listitem Render
      // }
    };
  }
}


export function prepareMarkedOptions() {
  const markedRender = new marked.Renderer();
  markedRender.image = MarkdownUtils.prepareMarkedRenderer('image');
  markedRender.code = MarkdownUtils.prepareMarkedRenderer('code');
  markedRender.table = MarkdownUtils.prepareMarkedRenderer('table');
  markedRender.listitem = MarkdownUtils.prepareMarkedRenderer('listitem');
  return {
    renderer: markedRender,
    highlight: (code: any) => hljs.highlightAuto(code).value,
  };
}
