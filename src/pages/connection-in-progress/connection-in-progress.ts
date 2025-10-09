import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';


import { Subscription, timer } from 'rxjs';
import { Observable } from 'rxjs';
import { map, filter, take } from 'rxjs/operators';

import { Device } from '../../shared/models/device.model';

import { DevicesService } from '../../shared/services/devices.service';

import { DeviceConnectedPage } from '../device-connected/device-connected';
import { ConnectionFailedPage } from '../connection-failed/connection-failed';
import { Router } from '@angular/router';

@Component({
  selector: 'connection-in-progress',
  templateUrl: 'connection-in-progress.html',
  standalone: false,
})
export class ConnectionInProgressPage {
  private device: Device;
  private ticks: number = 10;
  private timerSubscription: Subscription;

  private isConnectionSuccess = false;
  private isConnectionFail = false;

  constructor(
    private devicesService: DevicesService,
    private navCtrl: NavController,
    private route: ActivatedRoute,
   private router: Router
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state;
    if (state?.['device']) {
      this.device = state?.['device'];
    }
  }

  public ionViewDidEnter() {
    this.connect();
  }

  private connect() {
    this.timerSubscription = timer(1000, 1000).pipe(
      take(10) // <-- This limits the emissions to exactly 10
    ).subscribe(tick => {
        this.onTimerTick(tick);
    }, 
    // Optional: A complete handler that fires after the 10th emission
    () => {
        console.log('Timer finished checking after 10 seconds.');
    });

    this.device.connect().then(
      connectedDevice => {
        this.handleConnectionSuccessForDevice(this.device);
      },
      () => {
        this.handleConnectionFail();
      }
    );
  }

  private onTimerTick(tick): void {
    this.ticks--;

    if (
      this.ticks === 0 &&
      !this.isConnectionSuccess &&
      !this.isConnectionFail
    ) {
      this.handleConnectionFail();
    }
  }

  private handleConnectionSuccessForDevice(connectedDevice: Device) {
    this.isConnectionSuccess = true;
    this.devicesService.connectedDevice = new Device(connectedDevice);
    this.goToDeviceConnectedPage();
  }

  private handleConnectionFail() {
    this.isConnectionFail = true;
    this.goToConnectionFailedPage();
  }

  private goToDeviceConnectedPage() {
    this.navCtrl.navigateForward('/device-connected-page');
  }

  private goToConnectionFailedPage() {
    this.navCtrl.navigateForward('/connection-failed', {
      state: {
        device: this.device
      }
    });
  }
}
