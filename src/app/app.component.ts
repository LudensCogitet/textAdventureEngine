import { Component, OnInit, ViewChild } from '@angular/core';
import * as fate from '../lib/fate';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  public feed:string[] = [];
  public status:any = {};

  ngOnInit() {
      this.update(fate.start());
  }

  private printToFeed(text) {
      if(!text) return;
      console.log(text);
      text = text.map(entry => entry.split(" "));
      this.feed = this.feed.concat(text);
  }

  private update(data) {
      console.log("DATA", data);

      if(data.status.location !== this.status.location)
        this.feed = [];

      this.status = data.status;
      this.printToFeed(data.text);
  }

  public select(event) {
    let command = typeof event === "string" ? event : event.originalTarget.innerText.replace(/\W+/g, "");
    this.update(fate.select(command));
  }
}
