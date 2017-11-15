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

    private packAliases(texts) {
        return texts.map(text => {
            let match = text.match(/\[(.*?)\]/g);
            if(match) {
                match.forEach(x => {
                    text = text.replace(x, x.replace(/ /g, "~"));
                });
            }
            return text;
        });
    }

    private update(data) {
      if(this.status.location !== data.status.location) {
          this.heading.update(this.packAliases([data.status.location])[0]);
          this.feed = [];
      }

      this.status = data.status;

      let toPrint = data.text;
      if(this.status.active) this.appendToFeed(' ... ');
      this.printToFeed(this.packAliases(toPrint));
      if(!this.status.active) this.printToFeed(['?>']);
    }

    public select(command) {
        let name = command.name ? command.name.replace(/\W+/g, "") : command;
        let display = command.display ? command.display : command;

        this.appendToFeed(display);
        this.update(fate.select(name));
    }
}
