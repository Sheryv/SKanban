import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
// import * as DOMPurify from 'dompurify';
import { MarkdownUtils } from '../util/marked-renderers';
import { SettingsService } from '../service/settings.service';
import { marked } from 'marked';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {

  constructor(private settings: SettingsService, private readonly sanitizer: DomSanitizer) {
    marked.use(MarkdownUtils.prepareMarkedOptions());
    marked.use(MarkdownUtils.prepareHighlightPlugin());
  }

  transform(value): string {
    value = MarkdownUtils.preProcessContent(value.toString(), this.settings.settingsDef);

    const html = marked.parse(value);
    // if (NODE_CTX.isDevEnvironment) { console.log(value); console.log(html);}
    // if (NODE_CTX.isDevEnvironment) { console.log(html); }
    // return DOMPurify.sanitize(html);
    return this.sanitizer.sanitize(SecurityContext.HTML, html);
  }
}
