import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

import * as _ from 'lodash';

import { User } from '../../../shared/models/user.model';

import { AuthService } from '../../../shared/services/auth.service';
import { UsersService } from '../../../shared/services/users.service';

import {
  AlertFactory,
  AlertType,
  getValueOfAlertType
} from '../../../shared/factories/alert.factory';

import { DeleteAccountPage } from '../../../pages/settings/delete-account/delete-account';
import { ChangePassword } from '../change-password/change-password';
import { Location } from '@angular/common';

@Component({
  selector: 'account-settings-edit',
  templateUrl: 'account-settings-edit.html',
  standalone: false,
})
export class AccountSettingsEditPage {
  public userPayload: any;

  constructor(
    public authService: AuthService,
    private usersService: UsersService,
    private alertFactory: AlertFactory,
    private translateService: TranslateService,
    public navCtrl: NavController,
    private location: Location,
  ) {
    this.updateUserPayload();
  }

  ionViewWillEnter() {
    this.updateUserPayload();
  }

  public updateUser(): void {
    this.usersService.updateUser(this.userPayload).subscribe(
      response => {
        this.handleSuccess(new User(response));
      },
      error => {
        this.handleFail();
      }
    );
  }

  private handleSuccess(user: User): void {
    this.authService.user = _.cloneDeep(user);

    this.createAlert(AlertType.Success, () => {
      this.location.back();
    }).then(alert => {
      alert.present();
    });
  }

  private handleFail() {
    this.createAlert(AlertType.Fail, null).then(alert => {
      alert.present();
    });
  }

  private createAlert(type: AlertType, dismissHandler: Function): any {
    let alertTitle, alertMessage, alertButtonTitle;
    let alertTypeValue = getValueOfAlertType(type);

    this.translateService.get('common.ok').subscribe(value => {
      alertButtonTitle = value;
    });

    this.translateService
      .get(`account_settings.alert.${alertTypeValue}.title`)
      .subscribe(value => {
        alertTitle = value;
      });

    this.translateService
      .get(`account_settings.alert.${alertTypeValue}.message`)
      .subscribe(value => {
        alertMessage = value;
      });

    const alertButton = this.alertFactory.createButton(
      alertButtonTitle,
      dismissHandler
    );

    return this.alertFactory.createAlert(alertTitle, alertMessage, [
      alertButton
    ]);
  }

  private updateUserPayload(): void {
    this.userPayload = _.pick(_.cloneDeep(this.authService.user), [
      'id',
      'first_name',
      'last_name',
      'email'
    ]);
  }

  public goToDeleteAccountPage(): void {
    this.navCtrl.navigateForward('/delete-account-page');
  }
  public goToChangePasswordPage(): void {
    this.navCtrl.navigateForward('/change-password-page', {state:{ userPayload: this.userPayload }});
  }
}
