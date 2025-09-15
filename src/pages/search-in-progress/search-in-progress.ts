import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { BluetoothLe, ScanResult } from '@capacitor-community/bluetooth-le';
import * as _ from 'lodash';
import { Device } from '../../shared/models/device.model';
import { DevicesService } from '../../shared/services/devices.service';
import { Subscription, timer } from 'rxjs';

@Component({
  selector: 'search-in-progress',
  templateUrl: 'search-in-progress.html',
  standalone: false,
})
export class SearchInProgressPage implements OnInit, OnDestroy {
  private ticks = 10;
  private timerSubscription?: Subscription;
  private scanListener: any;

  constructor(
    public devicesService: DevicesService,
    public navCtrl: NavController
  ) {}

  async ngOnInit() {
    this.devicesService.devices = [];

    try {
      await BluetoothLe.initialize();

      await BluetoothLe.requestLEScan({ services: [] }); // scan all devices

      this.scanListener = BluetoothLe.addListener('onScanResult', (device: ScanResult) => {
        this.handleDeviceFound(device);
      });

      this.timerSubscription = timer(1000, 1000).subscribe(tick => {
        this.onTimerTick(tick);
      });

    } catch (error) {
      console.error('BLE scan failed', error);
      this.goToSearchFailedPage();
    }
  }

  ngOnDestroy() {
    this.stopScan();
    this.timerSubscription?.unsubscribe();
  }

  private handleDeviceFound(device: any) {
    // Assuming your Device constructor accepts ScanResult or compatible
    if(device) {
      if (!this.devicesService.devices.find((d :any) => d?.deviceId === device?.deviceId)) {
        this.devicesService.devices.push(new Device(device));
      }
    }
  }

  private async onTimerTick(tick: number) {
    this.ticks--;

    if (this.ticks === 0) {
      this.timerSubscription?.unsubscribe();
      await this.stopScan();
    }
  }

  private async stopScan() {
    try {
      await BluetoothLe.stopLEScan();
      if (this.scanListener) {
        await this.scanListener.remove();
        this.scanListener = null;
      }
      this.handleStopScan();
    } catch (error) {
      console.error('Stop scan failed', error);
      this.goToSearchFailedPage();
    }
  }

  private handleStopScan() {
    if (this.devicesService.devices.length > 0) {
      this.devicesService.devices = _.orderBy(this.devicesService.devices, ['rssi'], ['desc']);
      this.goToDevicesListPage();
    } else {
      this.goToSearchFailedPage();
    }
  }

  private goToDevicesListPage() {
    this.navCtrl.navigateForward('/devices-list'); // Route path as string
  }

  private goToSearchFailedPage() {
    this.navCtrl.navigateForward('/search-failed-page'); // Route path as string
  }
}
