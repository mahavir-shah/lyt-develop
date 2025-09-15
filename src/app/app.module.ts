import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppRoutingModule } from './app-routing.module';
import { ReactiveFormsModule } from '@angular/forms';

import { ErrorHandler, NgModule, isDevMode } from '@angular/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar } from '@capacitor/status-bar';
import { ScreenOrientation } from '@capawesome/capacitor-screen-orientation';
import { Camera } from '@capacitor/camera'; // Corrected syntax
import { Geolocation } from '@capacitor/geolocation'; // Corrected syntax
import { BluetoothLe } from '@capacitor-community/bluetooth-le'; // Corrected name

import { HttpClientModule, HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// import { Deeplinks } from '@capacitor/app';
import { AppComponent } from './app.component'; 

import { EnvVariables } from 'src/environments/enviroment-variables.token';

import { LoginPage } from '../pages/onboarding/login/login';
import { RegistrationPage } from '../pages/onboarding/registration/registration';
import { BluetoothFailedPage } from '../pages/bluetooth-failed/bluetooth-failed';
import { DevicesListPage } from '../pages/devices-list/devices-list';
import { SearchInProgressPage } from '../pages/search-in-progress/search-in-progress';
import { SearchFailedPage } from '../pages/search-failed/search-failed';
import { AccountSettingsEditPage } from '../pages/settings/account-settings-edit/account-settings-edit';
import { AccountSettingsPreviewPage } from '../pages/settings/account-settings-preview/account-settings-preview';
import { DeleteAccountPage } from '../pages/settings/delete-account/delete-account';
import { ColorPickerPage } from '../pages/color-picker/color-picker';
import { AccountInfo } from '../pages/settings/account-info/account-info';
import { ChangePassword } from '../pages/settings/change-password/change-password';
import { ConnectionInProgressPage } from '../pages/connection-in-progress/connection-in-progress';
import { DeviceConnectedPage } from '../pages/device-connected/device-connected';
import { ConnectionFailedPage } from '../pages/connection-failed/connection-failed';
import { ForgotPasswordPage } from '../pages/onboarding/forgot-password/forgot-password';
import { ConfirmationSentPage } from '../pages/onboarding/forgot-password/confirmation-sent';
import { ResetPasswordPage } from '../pages/onboarding/forgot-password/reset-password';
import { LightDirectorPage } from '../pages/light-director/light-director';
import { LocationDisabledPage } from '../pages/location-disabled/location-disabled';
import { PresetsPage } from '../pages/presets/presets';
import { DebugPage } from '../pages/debug/debug';

import { LytNavbar } from '../shared/components/navbar/navbar';
import { ColorWheel } from '../shared/components/color-wheel/color-wheel';

import { ValidationService } from '../shared/services/validation.service';
import { DevicesService } from '../shared/services/devices.service';
import { UsersService } from '../shared/services/users.service';
/* import { DeeplinksService } from '../shared/services/deeplinks.service';
import { DiagnosticService } from '../shared/services/diagnostic.service';
import { PresetsService } from '../shared/services/presets.service';
 */
import { AlertFactory } from '../shared/factories/alert.factory';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from 'src/environments/environment.prod';

import { DeeplinksService } from 'src/shared/services/deeplinks.service';
import { DiagnosticService } from 'src/shared/services/diagnostic.service';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    LoginPage,
    RegistrationPage,
    BluetoothFailedPage,
    DevicesListPage,
    SearchInProgressPage,
    SearchFailedPage,
    AccountSettingsEditPage,
    AccountSettingsPreviewPage,
    ColorPickerPage,
    LytNavbar,
    ColorWheel,
    AccountInfo,
    ChangePassword,
    DeleteAccountPage,
    ConnectionInProgressPage,
    DeviceConnectedPage,
    ConnectionFailedPage,
    ForgotPasswordPage,
    ConfirmationSentPage,
    ResetPasswordPage,
    LightDirectorPage,
    LocationDisabledPage,
    PresetsPage,
    DebugPage
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule,
    IonicModule.forRoot({}),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    AppRoutingModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    DeeplinksService,
    DiagnosticService,
    ValidationService,
    UsersService,
    AlertFactory,
    {
      provide: EnvVariables,
      useValue: environment
    },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [
    AppComponent
  ],
})
export class AppModule {}
