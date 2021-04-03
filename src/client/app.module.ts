import 'reflect-metadata';
import '../polyfills';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { HttpClientModule, HttpClient } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';

// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { ElectronService } from './service/electron.service';
import { DatabaseService } from './service/database.service';

import { WebviewDirective } from './directive/webview.directive';

import { AppComponent } from './app.component';
import { TodoComponent } from './component/todo/todo.component';
import { Factory } from './service/factory';
import { BoardAvatarPipe } from './pipe/board-avatar.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MAT_DATE_LOCALE, MatNativeDateModule, MatRippleModule } from '@angular/material/core';
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
import { ClientUtils } from './util/client-utils';
import { LabelService } from './service/label.service';
import { LabelChipComponent } from './component/label-chip/label-chip.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
import { LMarkdownEditorModule } from 'ngx-markdown-editor/dist';
import { AutofocusDirective } from './directive/auto-focus.directive';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './client/assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    TodoComponent,
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
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatGridListModule,
    MatInputModule,
    MatIconModule,
    MatListModule,
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
    LMarkdownEditorModule,
    LMarkdownEditorModule,
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
    {provide: MAT_DATE_LOCALE, useValue: 'pl-PL', useFactory: ClientUtils.getLangCode},
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
}
