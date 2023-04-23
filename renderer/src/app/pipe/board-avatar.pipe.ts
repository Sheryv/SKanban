import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'avatarPipe'})
export class BoardAvatarPipe implements PipeTransform {
  transform(value): string {
    const s = value.toString();
    if (s.codePointAt(0) > 32000) {
      return s.substr(0, 2);
    } else {
      return s.charAt(0) + s.charAt(1);
    }
  }
}
