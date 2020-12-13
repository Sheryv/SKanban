import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
import { CreateBoardDialogComponent } from './component/dialog/create-board-dialog/create-board-dialog.component';
import { map, mergeMap } from 'rxjs/operators';
import { TaskService } from './service/task.service';
import { of, throwError, zip } from 'rxjs';
import { DbExecResult } from '../shared/model/db-exec-result';
import { NgZone } from '@angular/core';
import { runInZone, ClientUtils } from './util/client-utils';

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
    console.log('init change board:', b.title, this.boards);
    this.state.boardChanged.next(b);
  }
  
  createBoard() {
    const dialogRef = this.dialog.open(CreateBoardDialogComponent, {
      width: '450px',
    });
    
    dialogRef.afterClosed()
      .pipe(
        mergeMap(name => {
          if (!name) {
            return throwError('Name cannot be empty');
          }
        
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
      });
  }
}
