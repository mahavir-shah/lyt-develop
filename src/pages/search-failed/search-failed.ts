import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

import { SearchInProgressPage } from '../search-in-progress/search-in-progress';

@Component({
  selector: 'search-failed',
  templateUrl: 'search-failed.html',
  standalone: false,
})
export class SearchFailedPage {
  constructor(public navCtrl: NavController) {}

  scan() {
    this.navCtrl.navigateForward('/search-inprogress-page');
  }
}
