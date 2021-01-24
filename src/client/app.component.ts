import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { ElectronService } from './service/electron.service';
import { TranslateService } from '@ngx-translate/core';
import { AppConfig } from '../environments/environment';
import { Bridge } from '../shared/service/bridge';
import { Board } from './model/board';
import { Factory } from './service/factory';
import { State } from './service/state';
import { SettingsService } from './service/settings.service';
import { KeyCommandsService } from './service/key-commands.service';
import { ShortcutInput } from 'ng-keyboard-shortcuts';
import { MatDialog } from '@angular/material/dialog';
import { filter, mergeMap, take, tap } from 'rxjs/operators';
import { TaskService } from './service/task.service';
import { of, zip } from 'rxjs';
import { ClientUtils, runInZone } from './util/client-utils';
import { CreateLabelDialogComponent } from './component/dialog/create-label-dialog/create-label-dialog.component';
import { LabelService } from './service/label.service';
import { MessageService } from './service/message.service';
import { DialogParams, SingleInputDialogComponent } from './component/dialog/single-input-dialog/single-input-dialog.component';
import { BoardSettingsDialogComponent } from './component/dialog/board-settings-dialog/board-settings-dialog.component';
import { SettingsComponent } from './component/dialog/settings-dialog/settings.component';
import { Settings } from './model/settings';
import { AboutDialogComponent } from './component/dialog/about-dialog/about-dialog.component';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  boards: Board[];
  currentBoard: Board;
  loaded: boolean = null;
  shortcuts: ShortcutInput[];
  
  constructor(public electronService: ElectronService,
              private translate: TranslateService,
              private factory: Factory,
              private state: State,
              private settings: SettingsService,
              private change: ChangeDetectorRef,
              private dialog: MatDialog,
              private taskService: TaskService,
              private labelService: LabelService,
              private msg: MessageService,
              private zone: NgZone,
              keyService: KeyCommandsService,
  ) {
    translate.setDefaultLang(ClientUtils.getLang());
    console.log('AppConfig', AppConfig);
    this.shortcuts = keyService.prepareShortcuts();
    
    if (electronService.isElectron()) {
      console.log('Mode electron');
      console.log('Electron IPC_RENDERER', electronService.ipcRenderer);
      console.log('NodeJS childProcess', electronService.childProcess);
    } else {
      console.log('Mode web');
    }
    Bridge.initClient();
    
    document.addEventListener('click', function (event) {
      const target = event.target;
      if (target) {
        const t = target as HTMLElement;
        if (t.tagName === 'A' && t.attributes.getNamedItem('href')) {
          event.preventDefault();
          electronService.openExternal(t.attributes.getNamedItem('href').value);
        }
      }
    });
  }
  
  ngOnInit(): void {
    this.settings.refresh().subscribe(s => {
      this.loaded = true;
      console.log('Initialized');
    });
    this.state.boardChanged.subscribe(b => {
      this.currentBoard = b;
      console.log('on change board:', b.title, this.boards);
    });
    this.refreshBoards();
  }
  
  private refreshBoards() {
    this.taskService.getBoards().pipe(runInZone(this.zone)).subscribe(b => {
      this.boards = b;
      this.boardChange(this.boards[0]);
    });
  }
  
  boardChange(b: Board) {
    console.log('init change board:', b && b.title, this.boards);
    if (b) {
      this.state.boardChanged.next(b);
    }
  }
  
  createBoard() {
    const dialogRef = this.dialog.open<SingleInputDialogComponent, DialogParams>(SingleInputDialogComponent, {
      width: '450px',
      data: {title: 'Create board'},
    });
    
    dialogRef.afterClosed()
        .pipe(
            take(1),
            filter(name => name),
            mergeMap(name => {
              const b = this.factory.createBoard(name);
              return this.taskService.saveBoard(b);
            }),
            mergeMap(res => {
              const id = res.lastID;
              return zip(of(id), this.taskService.getBoards());
            }),
            runInZone(this.zone),
        )
        .subscribe(bs => {
          const board = bs[1].find(b => b.id === bs[0]);
          this.boards = bs[1];
          this.boardChange(board);
          this.msg.success('Board created');
        }, error1 => this.msg.error('Cannot create ' + error1));
  }
  
  createLabel(boardId: number) {
    const dialogRef = this.dialog.open(CreateLabelDialogComponent, {
      width: '450px',
    });
    
    dialogRef.afterClosed()
        .pipe(
            take(1),
            filter(lb => lb && lb.name),
            mergeMap(lb => this.labelService.createLabel(lb.name, boardId, lb.color)),
            runInZone(this.zone),
        )
        .subscribe(bs => {
          this.msg.success('Label created');
        }, error1 => this.msg.error('Cannot create ' + error1));
  }
  
  boardSettings(board: Board) {
    const dialogRef = this.dialog.open(BoardSettingsDialogComponent, {
      width: '550px',
      data: board,
    });
    
    dialogRef.afterClosed()
        .pipe(
            take(1),
            filter(name => name),
            mergeMap(name => {
              board.title = name;
              return this.taskService.saveBoard(board);
            }),
            runInZone(this.zone),
        )
        .subscribe(lists => {
          this.msg.successShort('Rename success');
        }, error1 => this.msg.error('Cannot rename ' + error1), () => this.refreshBoards());
  }
  
  
  systemSettings() {
    const dialogRef = this.dialog.open(SettingsComponent, {
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%',
    });
    
    dialogRef.afterClosed()
        .pipe(
            take(1),
            filter(settings => settings),
            mergeMap(settings => {
              console.log('save settings', settings);
              const s: Settings = JSON.parse(JSON.stringify(this.settings.base));
              s.ui = settings;
              return this.settings.save(s);
            }),
        )
        .subscribe(s => {
          this.msg.successShort('Settings saved');
        }, error1 => this.msg.error('Cannot save ' + error1));
  }
  
  aboutDialog() {
    this.dialog.open(AboutDialogComponent, {});
  }
  
  showDbFile() {
    this.electronService.showDbFile();
  }
}
