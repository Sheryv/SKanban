import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ElectronService } from './service/electron.service';
import { TranslateService } from '@ngx-translate/core';
import { AppConfig } from '../environments/environment';
import { Bridge } from '../shared/service/bridge';
import { Board } from './model/board';
import { Factory } from './service/factory';
import { State } from './service/state';
import { SettingsService } from './service/settings.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  boards: Board[];
  currentBoard: Board;
  loaded: boolean = null;
  
  constructor(public electronService: ElectronService,
              private translate: TranslateService,
              private factory: Factory,
              private state: State,
              private settings: SettingsService,
              private change: ChangeDetectorRef,
  ) {
    translate.setDefaultLang('en');
    console.log('AppConfig', AppConfig);
    
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
      this.change.detectChanges();
      console.log('Initialized');
    });
    this.boards = [
      this.factory.createBoard('🍬 Bsadas'),
      this.factory.createBoard('Test'),
      this.factory.createBoard('T'),
    ];
    setTimeout(() => {
      this.boardChange(this.boards[0]);
    }, 10);
  }
  
  boardChange(b: Board) {
    this.currentBoard = b;
    this.state.boardChanged.next(b);
  }
}
