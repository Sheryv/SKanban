import { Context } from './context';
import { DatabaseProvider } from './provider/database-provider';
import { Bridge } from '../shared/service/bridge';

export class ProvidersBuilder {
  static readonly dbp = new DatabaseProvider();
  
  static initProviders() {
    this.dbp.init();
  }
  
  static prepareProviders() {
    Bridge.registerServerListener('dbp', (a) => {
      const fun = a[0];
      const methods = Object.keys(Object.getPrototypeOf(this.dbp)).filter(k => typeof this.dbp[k] === 'function');
      
      if (!methods.some(m => m === fun)) {
        throw Error(`Method ${fun} not found for type 'dbp'. Available: [${methods.join(', ')}]`);
      }
      
      return this.dbp[fun](a[1]);
    });
    
    
  }
  
}


