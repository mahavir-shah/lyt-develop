import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';

export enum AlertType {
  Success,
  Fail
}

@Injectable()
export class AlertFactory {
  constructor(public alertCtrl: AlertController) {}

  public createButton(text, handler) {
    return {
      text: text,
      handler: handler
    };
  }

  public createDismissButton(text, handler) {
    return {
      text: text,
      role: 'cancel',
      handler: handler
    };
  }

  public createAlert(title, subtitle, buttons) {
    return this.alertCtrl.create({
      header: title,
      subHeader: subtitle,
      buttons: buttons
    });
  }
}

export const getValueOfAlertType = (alertType: AlertType): string => {
  return alertType === AlertType.Success ? 'success' : 'fail';
};
