import { AfterViewInit, ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { ElectronService } from './service/electron.service';
import { TranslateService } from '@ngx-translate/core';
import { Board } from '../shared/model/entity/board';
import { Factory } from '../shared/support/factory';
import { State } from './service/state';
import { SettingsService } from './service/settings.service';
import { ACTIONS, KeyCommandsService } from './service/key-commands.service';
import { ShortcutInput } from 'ng-keyboard-shortcuts';
import { MatDialog } from '@angular/material/dialog';
import { filter, mergeMap, take } from 'rxjs/operators';
import { TaskService } from './service/task.service';
import { of, zip } from 'rxjs';
import { ClientUtils, runInZone } from './util/client-utils';
import { CreateLabelDialogComponent } from './component/dialog/create-label-dialog/create-label-dialog.component';
import { LabelService } from './service/label.service';
import { MessageService } from './service/message.service';
import {
  DialogParams,
  SingleInputDialogComponent,
} from './component/dialog/single-input-dialog/single-input-dialog.component';
import { BoardSettingsDialogComponent } from './component/dialog/board-settings-dialog/board-settings-dialog.component';
import { SettingsComponent } from './component/dialog/settings-dialog/settings.component';
import { AboutDialogComponent } from './component/dialog/about-dialog/about-dialog.component';
import { IS_ELECTRON, NODE_CTX } from './global';
import { Ipcs } from '../shared/model/ipcs';
import { Settings as LuxonSettings } from 'luxon';
import { ReminderService } from './service/reminder.service';
import { ViewService } from './service/view.service';
import { ListService } from './service/list.service';
import { KeybindingsComponent } from './component/dialog/keybindings-dialog/keybindings.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit {
  boards: Board[];
  currentBoard: Board;
  loaded: boolean = null;
  shortcuts: ShortcutInput[];
  keyCommands = ACTIONS;

  constructor(public electronService: ElectronService,
              public state: State,
              private translate: TranslateService,
              private factory: Factory,
              private settings: SettingsService,
              private change: ChangeDetectorRef,
              private dialog: MatDialog,
              private taskService: TaskService,
              private listService: ListService,
              private labelService: LabelService,
              private msg: MessageService,
              private zone: NgZone,
              private keyService: KeyCommandsService,
              private viewService: ViewService,
              private reminderService: ReminderService,
              private electron: ElectronService,
  ) {
    translate.setDefaultLang(ClientUtils.getLang());
    LuxonSettings.defaultLocale = ClientUtils.getLangCode();

    console.log('Running in DEV env: ', NODE_CTX?.isDevEnvironment, ' | ',
      IS_ELECTRON ? 'Mode electron' : 'Mode web', ' | Locale: ', ClientUtils.getLangCode());


    document.addEventListener('click', (event) => {
      const target = event.target;
      if (target) {
        const t = target as HTMLElement;
        if (t.tagName === 'A' && t.attributes.getNamedItem('href')) {
          event.preventDefault();
          NODE_CTX.openLink(t.attributes.getNamedItem('href').value);
        }
      }
    });
  }

  ngOnInit(): void {
    this.shortcuts = this.keyService.listShortcuts();
    this.settings.refresh().subscribe(s => {
      this.loaded = true;
    });

    this.reminderService.calculateReminders();
    this.state.selectedBoard.pipe(filter(b => !!b)).subscribe(b => {
      this.state.listMode.next({ mode: 'normal' });
      this.currentBoard = b;
      if (NODE_CTX.isDevEnvironment) {
        console.log('on change board:', b.title, this.boards);
      }
    });
    ACTIONS.searchInLists.onTrigger(e => this.state.changeListMode('quicksearch'));
    ACTIONS.advancedSearchInLists.onTrigger(e => this.state.changeListMode('advanced'));
    this.keyService.dialogAwareEmitter(ACTIONS.escapeCommand).subscribe(e => {
      this.closeSearch();
      if (this.state.taskEditModeEnabled.value) {
        this.state.taskEditModeEnabled.next(false);
      } else {
        this.state.selectedTask.next(null);
      }
    });
    ACTIONS.editSelectedTask.onTrigger(e => {
      if (this.state.selectedTask.value && this.state.taskEditModeEnabled.value === false) {
        this.state.taskEditModeEnabled.next(true);
      }
    });
    this.refreshBoards();
    this.state.listMode.subscribe(m => {
      if (m.mode !== 'normal') {
        this.state.taskFiltersDisabled = false;
      }
    });

  }

  ngAfterViewInit() {
  }

  private refreshBoards() {
    this.listService.getBoards().pipe(runInZone(this.zone)).subscribe(b => {
      this.boards = b;
      this.boardChange(this.boards[0]);
    });
  }

  boardChange(b: Board) {
    if (NODE_CTX.isDevEnvironment) {
      console.log('init change board:', b && b.title, this.boards);
    }
    if (b) {
      this.closeSearch();
      this.state.selectedBoard.next(b);
    }
  }

  createBoard() {
    const dialogRef = this.dialog.open<SingleInputDialogComponent, DialogParams>(SingleInputDialogComponent, {
      width: '450px',
      data: { title: 'Create board' },
    });

    dialogRef.afterClosed()
      .pipe(
        take(1),
        filter(name => name),
        mergeMap(name => {
          const b = this.factory.createBoard(name);
          return this.listService.saveBoard(b);
        }),
        mergeMap(res => {
          const id = res.lastID;
          return zip(of(id), this.listService.getBoards());
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
          return this.listService.saveBoard(board);
        }),
        runInZone(this.zone),
      )
      .subscribe(lists => {
        this.msg.successShort('Rename success');
      }, error1 => this.msg.error('Cannot rename ' + error1), () => this.refreshBoards());
  }


  systemSettings() {
    const dialogRef = this.dialog.open(SettingsComponent, {
      // panelClass: 'fullscreen-dialog'
      maxWidth: '100vw',
      maxHeight: '100vh',
      // height: '90%',
      // minHeight: '100vh'
      width: '90%',
    });

    dialogRef.afterClosed().subscribe();
  }

  keybindingsDialog() {
    const dialogRef = this.dialog.open(KeybindingsComponent, {
      minWidth: '400px',
      width: '1100px',
    });

    dialogRef.afterClosed().subscribe();
  }

  aboutDialog() {
    this.dialog.open(AboutDialogComponent, {});
  }

  showDbFile() {
    this.electronService.showDbFile();
  }

  quickSearch(term: string) {
    this.state.changeListMode('quicksearch', term);
  }

  closeSearch() {
    if (this.state.listMode.value.mode === 'quicksearch') {
      this.state.changeListMode('normal');
    }
  }

  disableAllFileSync() {
    this.listService.disableAllFileSync().subscribe(() => this.msg.success('All file sync disabled'));
  }

  importList(id: number) {
    this.electron.send(Ipcs.JOB, {
      op: 'import',
      boardId: id,
    }).subscribe(b => b && this.msg.success('List imported'));
  }

  showUpcomingReminders() {
    this.taskService.getAllTasks().subscribe(all => {
      const {
        future,
        inNotificationTimeRange,
      } = this.reminderService.findTasksWithNotifications(all.flatMap(({ board, list, tasks }) => tasks.map(task => ({
        board,
        list,
        task,
      }))));
      this.viewService.showRemindersListDialog([...future, ...inNotificationTimeRange]);
    });
  }
}
