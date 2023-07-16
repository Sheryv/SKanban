import { Pipe, PipeTransform } from '@angular/core';
import * as DOMPurify from 'dompurify';
import { MarkdownUtils } from '../util/marked-renderers';
import { SettingsService } from '../service/settings.service';
import { marked } from 'marked';

@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {

  constructor(private settings: SettingsService) {
    marked.use(MarkdownUtils.prepareMarkedOptions());
  }

  transform(value): string {
    value = MarkdownUtils.preProcessContent(value.toString(), this.settings.settingsDef);

    // if (NODE_CTX.isDevEnvironment) { console.log(value); }
    const html = marked.parse(value);
    // if (NODE_CTX.isDevEnvironment) { console.log(html); }
    return DOMPurify.sanitize(html);
  }
}
