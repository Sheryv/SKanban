import { Context } from './context';
import { DatabaseProvider } from './provider/database-provider';
import { Bridge } from '../shared/service/bridge';
import { of } from 'rxjs';
import { isDev, Utils } from '../shared/util/utils';

const {app, shell} = require('electron');
const path = require('path');

export class ProvidersBuilder {
  static readonly dbp = new DatabaseProvider();
  
  static initProviders() {
    this.dbp.init();
  }
  
  static prepareProviders() {
    console.log('Running in DEV env: ', isDev());
    
    Bridge.registerServerListener('dbp', (a) => {
      const fun = a[0];
      const methods = Object.keys(Object.getPrototypeOf(this.dbp)).filter(k => typeof this.dbp[k] === 'function');
      
      if (!methods.some(m => m === fun)) {
        throw Error(`Method ${fun} not found for type 'dbp'. Available: [${methods.join(', ')}]`);
      }
      
      return this.dbp[fun](a[1]);
    });
    
    Bridge.registerServerListener('shell', (a) => {
      const fun = a[0];
      
      if (fun === 'showDbFile') {
        const fullPath = path.join(path.dirname(app.getPath('exe')), Utils.DB_NAME);
        if (isDev()) { console.log('showing file ', fullPath); }
        shell.showItemInFolder(fullPath);
      }
      
      return [];
    });
    
    
  }
  
}


