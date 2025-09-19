import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Amplify } from 'aws-amplify'; // Corrected import path

import { AppModule } from './app/app.module';
import awsExports from './aws-exports';
// Make sure you have the 'awsExport' object defined,
// usually from a file like 'aws-exports.js'
Amplify.configure(awsExports);

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));