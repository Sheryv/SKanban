import { DatabaseProvider } from './database-provider';
import { NotificationTemplate } from '../../../renderer/src/shared/model/notification';
import * as notifier from 'node-notifier';
import * as path from 'path';
import { app, Notification } from 'electron';
import { Utils } from '../../../renderer/src/shared/util/utils';
import { ProvidersBuilder } from '../providers-builder';

export class NotificationProvider {

  constructor(private db: DatabaseProvider) {
  }

  init() {
    // notifier.notify({
    //     title: 'NotificationCenter',
    //     message: 'Hello from node, Mr. User!',
    //     icon: path.join(__dirname, 'renderer', 'favicon.256x256.png'),
    //     action: ['OK', 'Cancel'],
    //     // sound: false,
    //     wait: true,
    //     timeout: 1000,
    //     appID: Utils.APP,
    //     // install: 'cvcv'
    //   },
    //   function (err, response, metadata) {
    //     console.log(err, response, metadata);
    //     if (response == undefined || response == 'clicked') {
    //       ProvidersBuilder.window.focus();
    //     }
    //
    //   });
  }

// String

  show(options: NotificationTemplate): Promise<any> {

    /*
    Reminder - SKanban
    ----
    title                       | Snooze  |
    date                        | Disable |
    first line of text
    ----

    * */


    return new Promise((resolve, reject) => {
//           <image id="1" src="${path.join(__dirname,'renderer','dist', 'favicon.256x256.png')}" alt="img"/>  ToastGeneric
      const toastXmlString = `
        <toast scenario='reminder'>
        <audio silent="true"/>
          <visual>
                <binding template="ToastText03">
                    <text id="1">${options.title}</text>
        <!--                <text id="3" hint-style="captionSubtle" hint-align="right">1 Microsoft Way</text>-->
                    <text id="2">${options.body}</text>
        <!--            <text placement="attribution">4.04.2023, 20:08:35</text>-->
        <!--            <group id="3">-->
        <!--              <subgroup>-->
        <!--                <text hint-style="base">52 attendees</text>-->
        <!--                <text hint-style="captionSubtle">23 minute drive</text>-->
        <!--              </subgroup>-->
        <!--              <subgroup>-->
        <!--                <text hint-style="captionSubtle" hint-align="right">Bellevue, WA 98008</text>-->
        <!--              </subgroup>-->
        <!--            </group>-->
                </binding>
            </visual>
        </toast>
        `;

      const s = new Notification({
        ...options,
        toastXml: toastXmlString,
        body: options.body,
        title: options.title || Utils.APP,
      });
      s.show();
      s.once('action', (e, i) => console.log('Builtin action', e, i));
      s.once('show', (e) => console.log('Builtin show', e));
      s.once('failed', (e, i) => console.log('Builtin failed', e, i));
      s.once('reply', (e, i) => console.log('Builtin reply', e, i));
      s.once('click', (e) => console.log('Builtin click', e));
      s.once('close', (e) => {
        resolve(e?.['title']); console.log('Builtin close', e);
      });

      // const n = new WindowsToaster();

      // n.notify(
      //   {
      //     title: 'WindowsToaster',
      //     message: 'Hello from node, Mr. User!',
      //     icon: path.join(__dirname+'/../../dist', 'renderer', 'favicon.256x256.png'),
      //     action: ['st1', 'st2'],
      //     sound: false,
      //     wait: true,
      //     appID: Utils.APP,
      //     // install: 'cvcv'
      //   },
      //   function (err, response, metadata) {
      //     console.log(err, response, metadata);
      //     resolve(response);
      //   });


    });


  }
}
