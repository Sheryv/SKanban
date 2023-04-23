import { dialog } from 'electron';
import { Subject } from 'rxjs';
import { FSWatcher, readFile, watch, WatchEventType } from 'fs';
import { TaskFileImporter } from '../../shared/model/entity/task-file-importer';

describe("tts", ()=>{
  it('should ', async function () {
    const arr = await new TaskFileImporter('F:\\__Projekty\\SKanban-inne\\md-test.md').import()
    console.log(arr)
  });
})

