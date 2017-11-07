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

    private appendToFeed(text) {
        this.feed[this.feed.length-1] = this.feed[this.feed.length-1].concat(text.split(" "));
        console.log("\n\n", this.feed.join(" "), "\n\n");
    }

    private update(data) {
      if(this.status.location !== data.status.location) {
          this.heading.update(data.status.location);
          this.feed = [];
      }

      this.status = data.status;

      let toPrint = data.text;
      if(this.status.active) this.appendToFeed(' ... ');
      else if(!data.text.length) toPrint = ["You can't do that."];
      this.printToFeed(toPrint);
    }

    public select(text) {
    let command = text.replace(/\W+/g, "");

    this.status.active ? this.appendToFeed(command) : this.printToFeed([`?> ${command}`]);
    this.update(fate.select(command));
    }
}
