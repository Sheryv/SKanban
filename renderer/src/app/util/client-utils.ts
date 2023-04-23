import { NgZone } from '@angular/core';
import { Observable, OperatorFunction } from 'rxjs';
import { TaskSortField } from '../../shared/model/entity/task-sort-field';
import { TaskType } from '../../shared/model/entity/task-type';
import { DateTime } from 'luxon';
import { SortDirection } from '../../shared/model/entity/sort-direction';

export function runInZone<T>(zone: NgZone): OperatorFunction<T, T> {
  return (source) => {
    return new Observable(observer => {
      const onNext = (value: T) => zone.run(() => observer.next(value));
      const onError = (e: any) => zone.run(() => observer.error(e));
      const onComplete = () => zone.run(() => observer.complete());
      return source.subscribe(onNext, onError, onComplete);
    });
  };
}


export class ClientUtils {
  static readonly TASK_TYPES_LABELS = new Map<TaskType, string>([
    [TaskType.STANDARD, 'Standard'],
    [TaskType.NOTE, 'Note'],
  ]);

  static readonly TASK_ORDER_FIELD_LABELS = new Map<TaskSortField, string>([
    [TaskSortField.TITLE, 'Title'],
    [TaskSortField.CONTENT, 'Content'],
    [TaskSortField.MODIFY_DATE, 'Modify date'],
    [TaskSortField.CREATE_DATE, 'Create date'],
    [TaskSortField.DUE_DATE, 'Due date'],
  ]);

  static readonly SORT_DIRECTION_LABLES = new Map<SortDirection, string>([
    [SortDirection.ASC, 'Ascending ⇓'],
    [SortDirection.DESC, 'Descending ⇑'],
  ]);


  static getLangCode(): string {
    let l = localStorage.getItem('lang');
    if (!l) {
      l = navigator.language;
      localStorage.setItem('lang', l);
    }
    return l;
  }

  static getLang(): string {
    return this.getLangCode().substr(0, 2);
  }

  static formatDateForNextDay(date: DateTime): string {
    let line = date.toLocaleString(DateTime.TIME_SIMPLE);
    const diff = date.diffNow('minutes').minutes;
    if (diff > 60*24 || diff < -60*24) {
      line += ', ' + date.toLocaleString(DateTime.DATE_MED);
    }
    else if(diff < 0){
      if (diff > -60) {
        line += `, ${-Math.ceil(diff)} minutes overdue`;
      } else if (diff > -240) {
        line += `, ${-Math.ceil(diff / 60)} hours overdue`;
      }
    }
    else {
      if (diff < 60) {
        line += `, within ${Math.ceil(diff)} minutes`;
      } else if (diff < 240) {
        line += `, within ${Math.ceil(diff / 60)} hours`;
      }
    }
    return line;
  }


  // static mapHistoryType(type: HistoryType): string {
  //   const map = this.HISTORY_TYPE_LABELS;
  //   if (map.size === 0) {
  //     map.set(HistoryType.LABEL_REMOVE, 'Labels removed');
  //     map.set(HistoryType.LABEL_ADD, 'Labels added');
  //     map.set(HistoryType.TITLE_MODIFY, 'Title changed');
  //     map.set(HistoryType.CONTENT_MODIFY, 'Content changed');
  //     map.set(HistoryType.DUE_DATE_MODIFY, 'Due date changed');
  //     map.set(HistoryType.STATE_MODIFY, 'State changed');
  //     map.set(HistoryType.DELETE, 'Task deleted');
  //     map.set(HistoryType.LIST_CHANGE, 'Task moved to another list');
  //     map.set(HistoryType.TYPE_MODIFY, 'Task type changed');
  //   }
  //
  //   return map.get(type);
  // }


  /**
   * Performs a deep merge of objects and returns new object. Does not modify
   * objects (immutable) and merges arrays via concatenation.
   *
   * @param {...object} objects - Objects to merge
   * @returns {object} New object with merged key/values
   */
  static mergeDeep(...objects) {
    const isObject = obj => obj && typeof obj === 'object';

    return objects.reduce((prev, obj) => {
      Object.keys(obj).forEach(key => {
        const pVal = prev[key];
        const oVal = obj[key];

        if (Array.isArray(pVal) && Array.isArray(oVal)) {
          prev[key] = pVal.concat(...oVal);
        } else if (isObject(pVal) && isObject(oVal)) {
          prev[key] = this.mergeDeep(pVal, oVal);
        } else {
          prev[key] = oVal;
        }
      });

      return prev;
    }, {});
  }

  static exampleMd = `
  ---
__Advertisement :)__

- __[pica](https://nodeca.github.io/pica/demo/)__ - high quality and fast image
  resize in browser.
- __[babelfish](https://github.com/nodeca/babelfish/)__ - developer friendly
  i18n with plurals support and easy syntax.

You will like those projects!

---

# h1 Heading 8-)
## h2 Heading
### h3 Heading
#### h4 Heading
##### h5 Heading
###### h6 Heading


## Horizontal Rules

___

---

***


## Typographic replacements

Enable typographer option to see result.

(c) (C) (r) (R) (tm) (TM) (p) (P) +-

test.. test... test..... test?..... test!....

!!!!!! ???? ,,  -- ---

"Smartypants, double quotes" and 'single quotes'


## Emphasis

**This is bold text**

__This is bold text__

*This is italic text*

_This is italic text_

~~Strikethrough~~


## Blockquotes


> Blockquotes can also be nested...
>> ...by using additional greater-than signs right next to each other...
> > > ...or with spaces between arrows.


## Lists

Unordered

+ Create a list by starting a line with \`+\`, \`-\`, or \`*\`
+ Sub-lists are made by indenting 2 spaces:
  - Marker character change forces new list start:
    * Ac tristique libero volutpat at
    + Facilisis in pretium nisl aliquet
    - Nulla volutpat aliquam velit
+ Very easy!

Ordered

1. Lorem ipsum dolor sit amet
2. Consectetur adipiscing elit
3. Integer molestie lorem at massa


1. You can use sequential numbers...
1. ...or keep all the numbers as \`1.\`

Start numbering with offset:

57. foo
1. bar


## Code

Inline \`code\`

Indented code

    // Some comments
    line 1 of code
    line 2 of code
    line 3 of code


Block code "fences"

\`\`\`
Sample text here...
\`\`\`

Syntax highlighting

\`\`\` js
var foo = function (bar) {
  return bar++;
};

console.log(foo(5));
\`\`\`

## Tables

| Option | Description |
| ------ | ----------- |
| data   | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default. |
| ext    | extension to be used for dest files. |

Right aligned columns

| Option | Description |
| ------:| -----------:|
| data   | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default. |
| ext    | extension to be used for dest files. |


## Links

[link text](http://dev.nodeca.com)

[link with title](http://nodeca.github.io/pica/demo/ "title text!")

Autoconverted link https://github.com/nodeca/pica (enable linkify to see)


## Images

![Minion](https://octodex.github.com/images/minion.png)
![Stormtroopocat](https://octodex.github.com/images/stormtroopocat.jpg "The Stormtroopocat")

Like links, Images also have a footnote style syntax

![Alt text][id]

With a reference later in the document defining the URL location:

[id]: https://octodex.github.com/images/dojocat.jpg  "The Dojocat"


## Plugins

The killer feature of \`markdown-it\` is very effective support of
[syntax plugins](https://www.npmjs.org/browse/keyword/markdown-it-plugin).


### [Emojies](https://github.com/markdown-it/markdown-it-emoji)

> Classic markup: :wink: :crush: :cry: :tear: :laughing: :yum:
>
> Shortcuts (emoticons): :-) :-( 8-) ;)

see [how to change output](https://github.com/markdown-it/markdown-it-emoji#change-output) with twemoji.


### [Subscript](https://github.com/markdown-it/markdown-it-sub) / [Superscript](https://github.com/markdown-it/markdown-it-sup)

- 19^th^
- H~2~O


### [\\<ins>](https://github.com/markdown-it/markdown-it-ins)

++Inserted text++


### [\\<mark>](https://github.com/markdown-it/markdown-it-mark)

==Marked text==


### [Footnotes](https://github.com/markdown-it/markdown-it-footnote)

Footnote 1 link[^first].

Footnote 2 link[^second].

Inline footnote^[Text of inline footnote] definition.

Duplicated footnote reference[^second].

[^first]: Footnote **can have markup**

    and multiple paragraphs.

[^second]: Footnote text.


### [Definition lists](https://github.com/markdown-it/markdown-it-deflist)

Term 1

:   Definition 1
with lazy continuation.

Term 2 with *inline markup*

:   Definition 2

        { some code, part of Definition 2 }

    Third paragraph of definition 2.

_Compact style:_

Term 1
  ~ Definition 1

Term 2
  ~ Definition 2a
  ~ Definition 2b


### [Abbreviations](https://github.com/markdown-it/markdown-it-abbr)

This is HTML abbreviation example.

It converts "HTML", but keep intact partial entries like "xxxHTMLyyy" and so on.

*[HTML]: Hyper Text Markup Language

### [Custom containers](https://github.com/markdown-it/markdown-it-container)

::: warning
*here be dragons*
:::
  `;
}
