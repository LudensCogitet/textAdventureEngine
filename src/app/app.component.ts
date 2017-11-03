import { Component, OnInit } from '@angular/core';
import * as fate from '../lib/fate';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  public feed: string[] = [];

  ngOnInit() {
      this.printToFeed(fate.select('look'));
  }

  private printToFeed(text) {
      this.feed = this.feed.concat(text);
  }

  public select(event) {
    this.printToFeed(fate.select(event.originalTarget.innerText));
  }
}
