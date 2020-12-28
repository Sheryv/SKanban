import { Pipe, PipeTransform } from '@angular/core';
import marked from 'marked';
import * as DOMPurify from 'dompurify';

@Pipe({name: 'markdown'})
export class MarkdownPipe implements PipeTransform {
  transform(value): string {
    const html = marked(value);
    console.log(html);
    return DOMPurify.sanitize(html);
  }
}
