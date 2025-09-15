import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { ConnectionFailedPage } from 'src/pages/connection-failed/connection-failed';
import { DeviceConnectedPage } from 'src/pages/device-connected/device-connected';
import { BluetoothFailedPage } from 'src/pages/bluetooth-failed/bluetooth-failed';
import { LocationDisabledPage } from 'src/pages/location-disabled/location-disabled';
import { SearchInProgressPage } from 'src/pages/search-in-progress/search-in-progress';
import { PresetsPage } from 'src/pages/presets/presets';
import { DebugPage } from 'src/pages/debug/debug';
import { ColorPickerPage } from 'src/pages/color-picker/color-picker';
import { ConnectionInProgressPage } from 'src/pages/connection-in-progress/connection-in-progress';
import { ConfirmationSentPage } from 'src/pages/onboarding/forgot-password/confirmation-sent';
import { LoginPage } from 'src/pages/onboarding/login/login';
import { RegistrationPage } from 'src/pages/onboarding/registration/registration';
import { ForgotPasswordPage } from 'src/pages/onboarding/forgot-password/forgot-password';
import { DeleteAccountPage } from 'src/pages/settings/delete-account/delete-account';
import { ChangePassword } from 'src/pages/settings/change-password/change-password';
import { AccountSettingsEditPage } from 'src/pages/settings/account-settings-edit/account-settings-edit';
import { SearchFailedPage } from 'src/pages/search-failed/search-failed';
import { AccountSettingsPreviewPage } from 'src/pages/settings/account-settings-preview/account-settings-preview';

const routes: Routes = [
  {
    path: 'home',
    component: AppComponent,
  },
  {
    path: 'connection-failed',
    component: ConnectionFailedPage,
  },
  {
    path: 'device-connected-page',
    component: DeviceConnectedPage
  },
  {
    path: 'bluetooth-failed',
    component: BluetoothFailedPage
  },
  {
    path: 'location-disabled-page',
    component: LocationDisabledPage
  },
  {
    path: 'search-inprogress-page',
    component: SearchInProgressPage
  },
  {
    path: 'presets-page',
    component: PresetsPage
  },
  {
    path: 'debug-page',
    component: DebugPage
  },
  {
    path: 'color-picker-page',
    component: ColorPickerPage
  },
  {
    path: 'connection-inprogress-page',
    component: ConnectionInProgressPage
  },
  {
    path: 'confirmation-sent-page',
    component: ConfirmationSentPage
  },
  {
    path: 'login-page',
    component: LoginPage
  },
  {
    path: 'register-page',
    component: RegistrationPage
  },
  {
    path: 'forgot-passwor-page',
    component: ForgotPasswordPage
  },
  {
    path: 'delete-account-page',
    component: DeleteAccountPage
  },
  {
    path: 'change-password-page',
    component: ChangePassword
  },
  {
    path: 'account-settings-edit-page',
    component: AccountSettingsEditPage
  },
  {
    path: 'search-failed-page',
    component: SearchFailedPage
  },
  {
    path: 'account-settings-preview',
    component: AccountSettingsPreviewPage
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
