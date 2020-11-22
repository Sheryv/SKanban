import 'reflect-metadata';
import '../polyfills';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { MatRippleModule } from '@angular/material/core';
import { ListsComponent } from './component/lists/lists.component';
import { State } from './service/state';
import { MatButtonModule } from '@angular/material/button';
import { AngularSplitModule } from 'angular-split';
import { TaskDetailsComponent } from './component/task-details/task-details.component';
import { SettingsService } from './service/settings.service';
import { PropertiesService } from './service/properties.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LabelChipRowComponent } from './component/label-chip-row/label-chip-row.component';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './client/assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    TodoComponent,
    WebviewDirective,
    BoardAvatarPipe,
    ListsComponent,
    TaskDetailsComponent,
    LabelChipRowComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    MatGridListModule,
    MatInputModule,
    MatIconModule,
    MatListModule,
    DragDropModule,
    HttpClientModule,
    AppRoutingModule,
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
  ],
  providers: [ElectronService, DatabaseService, Factory, State, SettingsService, PropertiesService],
  bootstrap: [AppComponent],
})
export class AppModule {
}
