import { Component, OnInit } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';

import { AuthService } from '../../../shared/services/auth.service';

import { LoginPage } from '../../onboarding/login/login';
import { AccountSettingsEditPage } from '../account-settings-edit/account-settings-edit';
import { Subscription } from 'rxjs';
import { DevicesService } from 'src/shared/services/devices.service';
import { PresetsService } from 'src/shared/services/presets.service';

@Component({
  selector: 'account-settings-preview',
  templateUrl: 'account-settings-preview.html',
  standalone: false,
})
export class AccountSettingsPreviewPage {
  public currentUser:any = null;
  private userSubscription: Subscription;
  constructor(
    public navCtrl: NavController,
    public authService: AuthService,
    public devicesService: DevicesService,
    private alertController: AlertController,
    public presetService: PresetsService,
  ) {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnInit() {
    this.presetService.removeColorPickerBackEffect(true);
  }

  public async logout() {  
    let message = 'Are you sure you want to logout ?';
    if (await this?.devicesService?.connectedDevice?.isConnected()) {
      message = 'Device is connected currently. Are you sure you want to logout ?';
    }
    const alert = await this.alertController.create({
      header: 'Logout Confirmation',
        cssClass: 'custom-color-alert',
        message: message, // Corrected grammar slightly
        buttons: [
          { 
            text: 'Yes', 
            role: 'confirm', 
            cssClass: 'primary-button',
            handler: async () => {
              if (await this?.devicesService?.connectedDevice?.isConnected()) {
                this?.devicesService?.connectedDevice?.disconnect();
              }
              this.authService.signOut().subscribe({
                  next: (result) => {
                      console.log('Sign-out successful, navigating...');
                      this.navCtrl.navigateRoot('/login-page');
                  },
                  error: (error) => {
                      console.error('Sign-out failed:', error);
                      // You might still want to navigate even on error
                      // this.navCtrl.navigateRoot('/login-page'); 
                  },
                  complete: () => {
                      console.log('Sign-out stream completed.');
                  }
              });
            }
          },
          { 
            text: 'No', 
            role: 'cancel',
            cssClass: 'primary-button'
          }
        ]
    });
    await alert.present();
  }

  public goToAccountSettingsEditPage() {
    this.navCtrl.navigateForward('/account-settings-edit-page');
  }
}
