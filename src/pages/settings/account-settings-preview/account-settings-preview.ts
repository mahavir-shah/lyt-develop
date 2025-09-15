import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

import { AuthService } from '../../../shared/services/auth.service';

import { LoginPage } from '../../onboarding/login/login';
import { AccountSettingsEditPage } from '../account-settings-edit/account-settings-edit';

@Component({
  selector: 'account-settings-preview',
  templateUrl: 'account-settings-preview.html',
  standalone: false,
})
export class AccountSettingsPreviewPage {
  constructor(
    public navCtrl: NavController,
    public authService: AuthService
  ) {}

  public logout() {
    this.authService.logout();
    this.navCtrl.navigateRoot('/login-page');
  }

  public goToAccountSettingsEditPage() {
    debugger
    this.navCtrl.navigateForward('/account-settings-edit-page');
  }
}
