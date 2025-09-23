import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';

import { AuthService } from '../../../shared/services/auth.service';

import { LoginPage } from '../../onboarding/login/login';
import { AccountSettingsEditPage } from '../account-settings-edit/account-settings-edit';
import { Subscription } from 'rxjs';

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
    public authService: AuthService
  ) {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  public logout() {
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

  public goToAccountSettingsEditPage() {
    this.navCtrl.navigateForward('/account-settings-edit-page');
  }
}
