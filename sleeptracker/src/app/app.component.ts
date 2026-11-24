import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add, checkmarkCircle, informationCircleOutline, moon, moonOutline, pulseOutline, listOutline, sunny,
  sunnyOutline, timeOutline, todayOutline, trashOutline, warningOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    // Register every icon the app uses in one place.
    addIcons({
      add, checkmarkCircle, informationCircleOutline, moon, moonOutline, pulseOutline, listOutline, sunny,
      sunnyOutline, timeOutline, todayOutline, trashOutline, warningOutline,
    });
  }
}
