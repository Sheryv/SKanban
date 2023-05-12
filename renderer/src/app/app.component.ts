import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { ElectronService } from './service/electron.service';
import { TranslateService } from '@ngx-translate/core';
import { Board } from '../shared/model/entity/board';
import { Factory } from '../shared/./support/factory';
import { State } from './service/state';
import { SettingsService } from './service/settings.service';
import { KeyCommandsService } from './service/key-commands.service';
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
import { DateTime, Settings as LuxonSettings } from 'luxon';
import { ReminderService } from './service/reminder.service';
import { ViewService } from './service/view.service';


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
  searchMode = false;
  initialValue = ClientUtils.exampleMd;

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
              private keyService: KeyCommandsService,
              private viewService: ViewService,
              private reminderService: ReminderService,
              private electron: ElectronService,
  ) {
    translate.setDefaultLang(ClientUtils.getLang());
    LuxonSettings.defaultLocale = ClientUtils.getLangCode();

    console.log('Running in DEV env: ', NODE_CTX?.isDevEnvironment, ' | ',
      IS_ELECTRON ? 'Mode electron' : 'Mode web', ' | Locale: ', ClientUtils.getLangCode());

    this.shortcuts = keyService.prepareShortcuts();

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

    (window as Window)['luxon'] = DateTime;
  }

  ngOnInit(): void {
    this.settings.refresh().subscribe(s => {
      this.loaded = true;
    });

    this.reminderService.calculateReminders();
    this.state.boardChanged.subscribe(b => {
      this.currentBoard = b;
      if (NODE_CTX.isDevEnvironment) {
        console.log('on change board:', b.title, this.boards);
      }
    });
    this.keyService.searchEvent.emitter.subscribe(e => this.searchMode = true);
    this.keyService.escapeEvent.emitter.subscribe(e => this.closeSearch());
    this.refreshBoards();


  }

  private refreshBoards() {
    this.taskService.getBoards().pipe(runInZone(this.zone)).subscribe(b => {
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
      this.state.boardChanged.next(b);
    }
  }

  createBoard() {
    this.electron.send(Ipcs.SHELL, {
      op: 'showNotification', options: {
        title: 'TEST Task reminder:',
        body: 'Title of task\n4.04.2023, 20:08:35',
        urgency: 'critical',
      },
    }).subscribe(s => {
      console.log('noti resolved', s);
    });

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
      // panelClass: 'fullscreen-dialog'
      maxWidth: '100vw',
      maxHeight: '100vh',
      // height: '90%',
      // minHeight: '100vh'
      width: '90%',
    });

    dialogRef.afterClosed().subscribe();
  }

  aboutDialog() {
    this.dialog.open(AboutDialogComponent, {});
  }

  showDbFile() {
    this.electronService.showDbFile();
  }

  search(term: string) {
    this.state.search.next({ term, enabled: true });
  }

  closeSearch() {
    if (this.searchMode) {
      this.searchMode = false;
      this.state.search.next({ enabled: false, term: '' });
    }
  }

  disableAllFileSync() {
    this.taskService.disableAllFileSync().subscribe(() => this.msg.success('All file sync disabled'));
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
