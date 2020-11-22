// @ts-ignore
import { Component, Input, OnInit } from '@angular/core';
import { State } from '../../service/state';
import { Task } from '../../model/task';
import { Factory } from '../../service/factory';
import { SettingsService } from '../../service/settings.service';
import { UiSettings } from '../../model/settings';

@Component({
  selector: 'app-task-details',
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.scss'],
})
export class TaskDetailsComponent implements OnInit {
  @Input()
  task: Task;
  ui: UiSettings;
  
  constructor(private state: State, public settingsService: SettingsService) {
      this.ui = settingsService.base.ui;
  }
  
  ngOnInit(): void {
  }
  
}
