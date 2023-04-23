import { AfterViewInit, Component, forwardRef, Input, ViewChild } from '@angular/core';
import type * as mn from 'monaco-editor';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';


// @ts-ignore
type Editor = mn.editor.IStandaloneCodeEditor

declare const monaco: any;

@Component({
  selector: 'app-monaco-editor',
  templateUrl: './monaco-editor.component.html',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MonacoEditorComponent),
    multi: true,
  }],
})
export class MonacoEditorComponent implements ControlValueAccessor, AfterViewInit {


  @ViewChild(EditorComponent)
  private component: EditorComponent;
  private editor: Editor;
  private initial: string;

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

    console.log('EDI', editor);

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


    const executeAction = {
      id: 'make-bold',
      label: 'Make Bold',
      contextMenuOrder: 2,
      contextMenuGroupId: '2_modification',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB,
      ],
      run: (...args: any[]) => {
        const e = args[0] as Editor;

        const sel = e.getSelection();
        const range = {
          startColumn: sel.getStartPosition().column,
          startLineNumber: sel.getStartPosition().lineNumber,
          endColumn: sel.getEndPosition().column,
          endLineNumber: sel.getEndPosition().lineNumber,
        };
        e.getModel().pushEditOperations([sel], [{
          // range: IRange;
          // text: string | null;
          range: range,
          text: '**' + e.getModel().getValueInRange(range) + '**',
        }], (e) => {
          return null;
        });

        console.log('action', args);
      },
    };

    // monaco.editor.addEditorAction(executeAction);
    editor.addAction(executeAction);

  }

  ngAfterViewInit() {
    console.log('editor init')
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
}
