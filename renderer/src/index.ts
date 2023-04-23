import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

// import { AppModule } from './app/app.module';
import 'globals'
import { AppConfig } from './environments/environment';
import { AppModule } from './app/app.module';

declare let require: any;

if (AppConfig.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule, {
    preserveWhitespaces: false,
  })
  .catch(err => console.error(err));

/*

"files": [
    "**!/!*",
  "!**!/!*.ts",
  "!*.map",
  "!package.json",
  "!package-lock.json",
  {
    "from": "dist",
    "filter": ["**!/!*"]
  }
],
*/
