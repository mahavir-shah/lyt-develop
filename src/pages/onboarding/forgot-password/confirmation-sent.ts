import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'confirmation-sent',
  templateUrl: 'confirmation-sent.html',
  standalone: false,
})
export class ConfirmationSentPage {
  constructor(public navCtrl: NavController) {}

  public goToLoginPage(): void {
    this.navCtrl.navigateRoot('/');
  }
}
