import { Component } from '@angular/core';
import { Platform, NavController } from '@ionic/angular';
import { DevicesService } from '../../shared/services/devices.service';
import { Subscription } from 'rxjs';
@Component({
  selector: 'device-connected',
  templateUrl: 'device-connected.html',
  standalone: false,
})
export class DeviceConnectedPage {
  private backButtonSubscription: Subscription;
  
  constructor(
    private platform: Platform,
    public devicesService: DevicesService,
    private navCtrl: NavController
  ) {}

  ionViewWillEnter() {
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
      this.disconnectFromDevice();
    });
  }

  ionViewWillLeave() {
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
  }

  public flash(): void {
    console.log('flash', this.devicesService.connectedDevice)
    this.devicesService.connectedDevice.flash();
  }

  public disconnectFromDevice(): void {
    this.devicesService.connectedDevice.disconnect().then(() => {
      this.navCtrl.navigateForward('/search-inprogress-page');
    });
  }

  public goToMainScreenPage(): void { 
    this.navCtrl.navigateForward('/color-picker-page');
  }
}
