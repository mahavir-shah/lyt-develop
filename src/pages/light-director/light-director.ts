import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'light-director',
  templateUrl: 'light-director.html',
  standalone: false,
})
export class LightDirectorPage {
  constructor(public navCtrl: NavController) {}
}
