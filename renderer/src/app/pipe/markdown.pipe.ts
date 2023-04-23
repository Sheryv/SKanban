import { Pipe, PipeTransform } from '@angular/core';
import * as DOMPurify from 'dompurify';
import { MarkdownUtils, prepareMarkedOptions } from '../util/marked-renderers';
import { SettingsService } from '../service/settings.service';
import { NODE_CTX } from '../global';

declare let marked: any;

@Pipe({name: 'markdown'})
export class MarkdownPipe implements PipeTransform {
  private options;

  constructor(private settings: SettingsService) {
    this.options = prepareMarkedOptions();
  }

  transform(value): string {
    value = MarkdownUtils.preProcessContent(value.toString(), this.settings.base.ui);

    // if (NODE_CTX.isDevEnvironment) { console.log(value); }
    const html = marked(value, this.options);
    // if (NODE_CTX.isDevEnvironment) { console.log(html); }
    return DOMPurify.sanitize(html);
  }
}
