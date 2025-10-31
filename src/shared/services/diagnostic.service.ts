import { Injectable } from '@angular/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Geolocation } from '@capacitor/geolocation';
import { Observable } from 'rxjs';


@Injectable()
export class DiagnosticService {
  private previousValues = {
    location: undefined,
    bluetooth: undefined
  };

  public isLocationEnabled: Observable<any>;
  public isBluetoothEnabled: Observable<any>;

  constructor() {
    this.isLocationEnabled = this.createIsLocationEnabledObservable();
    this.isBluetoothEnabled = this.createIsBluetoothEnabledObservable();
  }

  private createIsBluetoothEnabledObservable(): Observable<any> {
    return Observable.create(observer => {
      setInterval(() => {
        BleClient.isEnabled().then(() => {
            observer.next({
              previous: this.previousValues.bluetooth,
              current: true
            });

            this.previousValues.bluetooth = true;
          },
          () => {
            observer.next({
              previous: this.previousValues.bluetooth,
              current: false
            });

            this.previousValues.bluetooth = false;
          }
        );
      }, 1000);
    });
  }

  public createIsLocationEnabledObservable(): Observable<{ previous: boolean, current: boolean }> {
    return new Observable(observer => {
      const interval = setInterval(async () => {
        try {
          const permStatus = await Geolocation.checkPermissions();

          const isEnabled = permStatus.location === 'granted';

          observer.next({
            previous: this.previousValues.location,
            current: isEnabled
          });

          this.previousValues.location = isEnabled;
        } catch (err) {
          console.error('Error checking location permission:', err);

          observer.next({
            previous: this.previousValues.location,
            current: false
          });

          this.previousValues.location = false;
        }
      }, 1000);

      // Cleanup on unsubscribe
      return () => clearInterval(interval);
    });
  }
}
