import { Component } from '@angular/core';
import { Platform, NavController } from '@ionic/angular';
import { DevicesService } from '../../shared/services/devices.service';
@Component({
  selector: 'device-connected',
  templateUrl: 'device-connected.html',
  standalone: false,
})
export class DeviceConnectedPage {
  constructor(
    private platform: Platform,
    public devicesService: DevicesService,
    private navCtrl: NavController
  ) {}

  ionViewDidEnter() {
    this.platform.backButton.subscribeWithPriority(10, () => {
      this.disconnectFromDevice();
    });
  }

  public flash(): void {
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
