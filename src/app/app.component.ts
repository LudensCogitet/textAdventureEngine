import { Component, OnInit, ViewChild } from '@angular/core';
import { ClickWordComponent } from './click-word/click-word.component';
import * as fate from '../lib/fate';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent  {
    @ViewChild('heading') heading: ClickWordComponent;
    public feed:string[] = [];
    public status:any = {};

    ngOnInit() {
      this.update(fate.start());
    }

    private printToFeed(text) {
      if(!text) return;
      text = text.map(entry => entry.split(" "));
      this.feed = this.feed.concat(text);
    }

    private update(data) {
      if(this.status.location !== data.status.location) {
          this.heading.update(data.status.location);
          this.feed = [];
      }

      this.status = data.status;
      this.printToFeed(data.text);
    }

    public select(text) {
    let command = text.replace(/\W+/g, "");
    this.update(fate.select(command));
    }
}
