// import '../polyfills';
import 'zone.js';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { HttpClient, HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';

// NG Translate
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { ElectronService } from './service/electron.service';
import { DatabaseService } from './service/database.service';

import { WebviewDirective } from './directive/webview.directive';

import { AppComponent } from './app.component';
import { Factory } from '../shared/support/factory';
import { BoardAvatarPipe } from './pipe/board-avatar.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DateAdapter, MatRippleModule } from '@angular/material/core';
import { ListsComponent } from './component/lists/lists.component';
import { State } from './service/state';
import { MatButtonModule } from '@angular/material/button';
import { AngularSplitModule } from 'angular-split';
import { TaskDetailsComponent } from './component/task-details/task-details.component';
import { SettingsService } from './service/settings.service';
import { PropertiesService } from './service/properties.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LabelChipRowComponent } from './component/label-chip-row/label-chip-row.component';
import { KeyboardShortcutsModule } from 'ng-keyboard-shortcuts';
import { TaskService } from './service/task.service';
import { CreateBoardDialogComponent } from './component/dialog/create-board-dialog/create-board-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { CreateTaskDialogComponent } from './component/dialog/create-task-dialog/create-task-dialog.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { LabelService } from './service/label.service';
import { LabelChipComponent } from './component/label-chip/label-chip.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MessageService } from './service/message.service';
import { DateMillisPipe } from './pipe/date-millis.pipe';
import { CreateLabelDialogComponent } from './component/dialog/create-label-dialog/create-label-dialog.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { MarkdownPipe } from './pipe/markdown.pipe';
import { SingleInputDialogComponent } from './component/dialog/single-input-dialog/single-input-dialog.component';
import { BoardSettingsDialogComponent } from './component/dialog/board-settings-dialog/board-settings-dialog.component';
import { SettingsComponent } from './component/dialog/settings-dialog/settings.component';
import { FormErrorsComponent } from './component/form-errors/form-errors.component';
import { AboutDialogComponent } from './component/dialog/about-dialog/about-dialog.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { AutofocusDirective } from './directive/auto-focus.directive';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { MonacoEditorComponent } from './component/editor/monaco-editor.component';
import { WithLoadingPipe } from './pipe/with-loading.pipe';
import { MatLuxonDateModule } from '@angular/material-luxon-adapter';
import {
  NgxMatDatetimePickerModule,
  NgxMatNativeDateModule,
  NgxMatTimepickerModule,
} from '@angular-material-components/datetime-picker';
import { OverlayModule } from '@angular/cdk/overlay';
import { DateTimeDialogComponent } from './component/dialog/date-time-dialog/date-time-dialog.component';
import { DateUserPipe } from './pipe/date-user.pipe';
import { MONACO_EDITOR_CONFIG } from './util/monaco-config';
import { RemindersListComponent } from './component/common/reminders-list/reminders-list.component';
import { ReminderService } from './service/reminder.service';
import { TaskSupport } from '../shared/support/task.support';
import { RemindersDialogComponent } from './component/dialog/reminders-dialog/reminders-dialog.component';
import { CustomDateAdapter } from './util/custom-date-adapter';
import { AbstractDialogComponent } from './component/dialog/abstract-dialog/abstract-dialog.component';
import { CdkContextMenuTrigger } from '@angular/cdk/menu';
import { RemoteMenuTriggerDirective } from './directive/remote-menu-trigger.directive';
import { ListService } from './service/list.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { KeybindingsComponent } from './component/dialog/keybindings-dialog/keybindings.component';
import { BatchActionDialogComponent } from './component/dialog/batch-action-dialog/batch-action-dialog.component';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}


@NgModule({
  declarations: [
    AppComponent,
    WebviewDirective,
    AutofocusDirective,
    BoardAvatarPipe,
    DateMillisPipe,
    MarkdownPipe,
    ListsComponent,
    TaskDetailsComponent,
    LabelChipRowComponent,
    LabelChipComponent,
    CreateBoardDialogComponent,
    SingleInputDialogComponent,
    CreateTaskDialogComponent,
    CreateLabelDialogComponent,
    BoardSettingsDialogComponent,
    SettingsComponent,
    AboutDialogComponent,
    FormErrorsComponent,
    MonacoEditorComponent,
    WithLoadingPipe,
    DateUserPipe,
    DateTimeDialogComponent,
    RemindersListComponent,
    RemindersDialogComponent,
    AbstractDialogComponent,
    RemoteMenuTriggerDirective,
    KeybindingsComponent,
    BatchActionDialogComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatDatepickerModule,
    MatLuxonDateModule,
    MatGridListModule,
    MatInputModule,
    MatIconModule,
    MatListModule,
    OverlayModule,
    NgxMatDatetimePickerModule,
    NgxMatTimepickerModule,
    NgxMatNativeDateModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatMenuModule,
    DragDropModule,
    HttpClientModule,
    AppRoutingModule,
    ColorPickerModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (HttpLoaderFactory),
        deps: [HttpClient],
      },
    }),
    MatTooltipModule,
    MatRippleModule,
    MatButtonModule,
    AngularSplitModule,
    MatProgressSpinnerModule,
    KeyboardShortcutsModule.forRoot(),
    MonacoEditorModule.forRoot(MONACO_EDITOR_CONFIG),
    CdkContextMenuTrigger,
    MatCheckboxModule,
  ],
  providers: [
    ElectronService,
    DatabaseService,
    Factory,
    State,
    SettingsService,
    PropertiesService,
    TaskService,
    LabelService,
    MessageService,
    ReminderService,
    TaskSupport,
    ListService,
    { provide: DateAdapter, useClass: CustomDateAdapter },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
}
