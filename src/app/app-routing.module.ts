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
import { AuthGuard } from 'src/guards/auth.guard'; 
import { ResetPasswordPage } from 'src/pages/onboarding/forgot-password/reset-password';
const routes: Routes = [
  {
    path: 'home',
    component: AppComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'connection-failed',
    component: ConnectionFailedPage,
    canActivate: [AuthGuard]
  },
  {
    path: 'device-connected-page',
    component: DeviceConnectedPage,
    canActivate: [AuthGuard]
  },
  {
    path: 'bluetooth-failed',
    component: BluetoothFailedPage,
    canActivate: [AuthGuard]
  },
  {
    path: 'location-disabled-page',
    component: LocationDisabledPage,
    canActivate: [AuthGuard]
  },
  {
    path: 'search-inprogress-page',
    component: SearchInProgressPage,
    canActivate: [AuthGuard]
  },
  {
    path: 'presets-page',
    component: PresetsPage,
    canActivate: [AuthGuard]
  },
  {
    path: 'debug-page',
    component: DebugPage,
    canActivate: [AuthGuard]
  },
  {
    path: 'color-picker-page',
    component: ColorPickerPage,
    canActivate: [AuthGuard]
  },
  {
    path: 'connection-inprogress-page',
    component: ConnectionInProgressPage,
    canActivate: [AuthGuard]
  },
  {
    path: 'confirmation-sent-page',
    component: ConfirmationSentPage,
    canActivate: [AuthGuard]
  },
  {
    path: 'login-page',
    component: LoginPage,
  },
  {
    path: 'register-page',
    component: RegistrationPage,
  },
  {
    path: 'forgot-password-page',
    component: ForgotPasswordPage,
  },
  {
    path: 'reset-password-page',
    component: ResetPasswordPage,
  },
  {
    path: 'delete-account-page',
    component: DeleteAccountPage,
    canActivate: [AuthGuard]
  },
  {
    path: 'change-password-page',
    component: ChangePassword,
    canActivate: [AuthGuard]
  },
  {
    path: 'account-settings-edit-page',
    component: AccountSettingsEditPage,
    canActivate: [AuthGuard]
  },
  {
    path: 'search-failed-page',
    component: SearchFailedPage,
    canActivate: [AuthGuard]
  },
  {
    path: 'account-settings-preview',
    component: AccountSettingsPreviewPage,
    canActivate: [AuthGuard]
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
