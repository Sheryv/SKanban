/* eslint-disable no-bitwise */
import { Component, forwardRef, Input, ViewChild } from '@angular/core';
import type * as mn from 'monaco-editor';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { KeyCommandsService } from '../../service/key-commands.service';
import { NODE_CTX } from '../../global';


// @ts-ignore
type Editor = mn.editor.IStandaloneCodeEditor;

declare const monaco: typeof mn;

@Component({
  selector: 'app-monaco-editor',
  templateUrl: './monaco-editor.component.html',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MonacoEditorComponent),
    multi: true,
  }],
})
export class MonacoEditorComponent implements ControlValueAccessor {

  @Input()
  height = '50vh';

  @Input()
  vertical = true;

  // @ts-ignore
  editorOptions: mn.editor.IStandaloneEditorConstructionOptions = {
    theme: 'monokai',
    language: 'markdown',
    wordWrap: 'on',
    automaticLayout: true,
    // model: {
    //   value: ClientUtils.exampleMd,
    // }
  };

  @ViewChild(EditorComponent)
  private component: EditorComponent;
  private editor: Editor;
  private initial: string;


  constructor(private keyService: KeyCommandsService) {
  }

// @Output()
  // onValueChanged = new EventEmitter<string>();

  @Input()
  set value(text: string) {
    if (this.editor) {

      this.editor.setValue(text);
    } else {
      this.initial = text;
    }
  }


  // set text(newValue) {
  //   this.onValueChanged.emit(newValue);
  // };


  onEditorReady(editor: Editor): void {
    this.editor = editor;
    const keys: mn.editor.IKeybindingRule[] = [
      {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD,
        command: 'editor.action.deleteLines',
        when: 'textInputFocus && !editorReadonly',
      },
      {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK,
        command: '-editor.action.deleteLines',
        when: 'textInputFocus && !editorReadonly',
      },
      {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD,
        command: '-editor.action.addSelectionToNextFindMatch',
        when: 'editorFocus',
      },
      {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD,
        command: 'editor.action.copyLinesDownAction',
        when: 'editorTextFocus && !editorReadonly',
      },
    ];

    if (NODE_CTX.isDevEnvironment) {
      console.log('EDI', editor);
    }

    monaco.editor.addKeybindingRules(keys);
    if (this.initial) {
      editor.setValue(this.initial);
    }
    if (this.onChange) {
      this.component.registerOnChange(this.onChange);
    }
    if (this.onTouched) {
      this.component.registerOnTouched(this.onTouched);
    }


    // monaco.editor.addEditorAction(executeAction);
    this.createActions(editor);
  }

  private createActions(editor: Editor) {
    this.addActions(editor, [{
      //   id: 'save-task',
      //   label: 'Save task',
      //   keyBinding: this.keyService.toMonacoKeyCode(ACTIONS.saveTask),
      //   cmd: ()=> {console.log('monaco save task executed')}
      // },{
      id: 'make-bold',
      label: 'Bold style',
      addToMenu: 1,
      keyBinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB,
      cmd: this.replaceTextActionCmd(s => `**${s}**`),
    }, {
      id: 'make-italic',
      label: 'Italic style',
      addToMenu: 1,
      keyBinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI,
      cmd: this.replaceTextActionCmd(s => `_${s}_`),
    }, {
      id: 'insert-link',
      label: 'Insert link',
      addToMenu: 2,
      keyBinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL,
      cmd: this.replaceTextActionCmd(
        s => `[${s}]()`,
        () => (o) => o.map(e => monaco.Selection.fromPositions(e.range.getEndPosition().delta(null, 3))),
      ),
    }, {
      id: 'insert-h1',
      label: 'Heading 1 style',
      cmd: this.replaceTextActionCmd(s => `# ${s}`),
    }, {
      id: 'insert-h2',
      label: 'Heading 2 style',
      addToMenu: 3,
      cmd: this.replaceTextActionCmd(s => `## ${s}`),
    }, {
      id: 'insert-h3',
      label: 'Heading 3 style',
      addToMenu: 3,
      cmd: this.replaceTextActionCmd(s => `### ${s}`),
    }, {
      id: 'insert-h4',
      label: 'Heading 4 style',
      cmd: this.replaceTextActionCmd(s => `#### ${s}`),
    }, {
      id: 'insert-h5',
      label: 'Heading 5 style',
      cmd: this.replaceTextActionCmd(s => `##### ${s}`),
    }, {
      id: 'insert-list',
      label: 'Insert list',
      addToMenu: 2,
      cmd: this.replaceTextActionCmd(s => `- ${s}`),
    }, {
      id: 'insert-table',
      label: 'Insert table',
      keyBinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ,
      addToMenu: 2,
      cmd: this.replaceTextActionCmd(
        s => `\n|  |  |\n|---|---|\n| ${s} |  |\n`,
        (c) => (o) =>
          o.map(e => monaco.Selection.fromPositions(new monaco.Position(e.range.getEndPosition().lineNumber - 1, c.endColumn + 2))),
      ),
    }, {
      id: 'insert-code',
      label: 'Insert code block',
      addToMenu: 2,
      keyBinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
      cmd: this.replaceTextActionCmd(
        s => '```\n' + s + '\n```',
        () => (o) => o.map(e => monaco.Selection.fromPositions(e.range.getEndPosition().delta(-1))),
      ),
    }, {
      id: 'insert-checkbox',
      label: 'Insert checkbox',
      addToMenu: 2,
      cmd: this.replaceTextActionCmd(s => `${s}[ ]`),
    }]);
  }

  triggerAction(action: string) {
    this.editor.trigger('click', action, null);
    this.editor.focus();
  }

  private addActions(
    editor: Editor,
    actions: { id: string; label: string; cmd: (editor: Editor, ...args: any[]) => void | Promise<void>; addToMenu?: number; keyBinding?: number }[],
  ) {

    const actionDescriptors: mn.editor.IActionDescriptor[] = actions.map((a, i) => {

      const desc: mn.editor.IActionDescriptor = {
        id: a.id,
        label: a.label,
        keybindings: a.keyBinding && [a.keyBinding],
        run: a.cmd,
      };

      if (a.addToMenu > 0) {
        desc.contextMenuOrder = i;
        desc.contextMenuGroupId = (a.addToMenu + 1) + '_custom';
      }

      return desc;
    });

    for (const action of actionDescriptors) {
      editor.addAction(action);
    }
  }

  private replaceTextActionCmd(
    replacer: (current: string) => string,
    cursorState: ((currSel: mn.Selection, delta: number) => mn.editor.ICursorStateComputer)
      = (currSel: mn.Selection, delta: number) => {

      return (inverseEditOperations: mn.editor.IValidEditOperation[]) =>
        [monaco.Selection.fromPositions(currSel.getEndPosition().delta(null, delta))];
    },
  ): (editor: Editor, ...args: any[]) => void | Promise<void> {
    return (e, ...args: any[]) => {
      const range = this.range(e);
      const current = e.getModel().getValueInRange(range);
      const newText = replacer(current);
      const delta = newText.length - current.length;
      const end = cursorState && cursorState(e.getSelection(), delta);
      e.executeEdits('action', [{
        range,
        text: newText,
        forceMoveMarkers: true,
      }], end);
    };
  }

  private range(editor: Editor): mn.IRange {
    const sel = editor.getSelection();
    return {
      startColumn: sel.getStartPosition().column,
      startLineNumber: sel.getStartPosition().lineNumber,
      endColumn: sel.getEndPosition().column,
      endLineNumber: sel.getEndPosition().lineNumber,
    };
  }

  writeValue(obj: any): void {
    if (this.component) {
      this.component.writeValue(obj);
    } else {
      this.initial = obj;
    }
  }

  private onChange: any;
  private onTouched: any;

  registerOnChange(fn: any): void {
    if (this.component) {
      this.component?.registerOnChange(fn);
    } else {
      this.onChange = fn;
    }
  }

  registerOnTouched(fn: any): void {
    if (this.component) {
      this.component?.registerOnTouched(fn);
    } else {
      this.onTouched = fn;
    }

  }

  focus() {
    this.editor.focus();
  }
}
