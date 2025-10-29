import { Component } from '@angular/core';
import { Platform, NavController, NavParams } from '@ionic/angular';
import { Router } from '@angular/router';
import { Device } from '../../shared/models/device.model';

import { SearchInProgressPage } from '../search-in-progress/search-in-progress';
import { ConnectionInProgressPage } from '../connection-in-progress/connection-in-progress';
import { Subscription } from 'rxjs';

@Component({
  selector: 'connection-failed',
  templateUrl: 'connection-failed.html',
  standalone: false,
})
export class ConnectionFailedPage {
  private device: Device;
  private backButtonSubscription: Subscription;

  constructor(
    private platform: Platform,
    private navParams: NavParams,
    private navCtrl: NavController,
    private router: Router
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state;
    if (state?.['device']) {
      this.device = state?.['device'];
    }
  }

  ionViewWillEnter() {
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
      // This blocks default back button behavior
      // console.log('Back button pressed, default prevented.');
    });
  }

  ionViewWillLeave() {
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
  }


  public goToSearchInProgressPage() {
    this.navCtrl.navigateForward('/search-inprogress-page');
  }

  public goToConnectionInProgressPageAndReconnect(): void {
    this.navCtrl.navigateForward('/search-inprogress-page', {
      state: { device: this.device }
    });
  }
}
