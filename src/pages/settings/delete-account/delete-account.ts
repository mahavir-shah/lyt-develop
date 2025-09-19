import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from '../../../shared/services/auth.service';
import { AlertFactory } from '../../../shared/factories/alert.factory';
import { Location } from '@angular/common';

@Component({
  selector: 'delete-account',
  templateUrl: 'delete-account.html',
  standalone: false,
})
export class DeleteAccountPage {
  constructor(
    private authService: AuthService,
    private alertFactory: AlertFactory,
    public navCtrl: NavController,
    private location: Location
  ) {}

  public goToPreviousPage() {
    this.location.back();
  }

  public deleteAccount() {
    this.authService.deleteUser().subscribe(
      response => {
        this.handleDeletionSuccess();
      },
      error => {  
        this.handleDeletionFail();
      }
    );
  }

  private async handleDeletionSuccess() {
    // Await the creation of the alert
    const alert = await this.createDeletionSuccessAlert(() => {
      this.logoutAndGoToLoginPage();
    });

    // Await the presentation of the alert
    await alert.present();
  } 

   /* private async handleDeletionSuccess() {
    let alert:any = await this.createDeletionSuccessAlert(() => {
      this.logoutAndGoToLoginPage();
    });

    await alert.then(alert => {
      alert.present();
    });
  } */

  private async handleDeletionFail() {
    let alert:any = await this.createDeletionFailAlert();
    await alert.then(alert => {
      alert.present();
    });
  }

  private logoutAndGoToLoginPage() {
    this.authService.signOut();
    this.navCtrl.navigateForward('/login-page');
  }

  private createDeletionSuccessAlert(dismissHandler) {
    const dismissButton = this.alertFactory.createDismissButton(
      'OK',
      dismissHandler
    );
    return this.alertFactory.createAlert(
      'Account deleted',
      'You will now be logged out.',
      [dismissButton]
    );
  }

  private createDeletionFailAlert() {
    const dismissButton = this.alertFactory.createDismissButton('OK', null);
    return this.alertFactory.createAlert(
      'Error',
      'Something went wrong. Unable to delete account.',
      [dismissButton]
    );
  }
}
