import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-click-word',
  templateUrl: './click-word.component.html',
  styleUrls: ['./click-word.component.css']
})
export class ClickWordComponent implements OnInit {
    @Input() text;
    public display;
    public name;

    constructor() { }

    ngOnInit() {
        this.update(this.text);
    }

    public update(text) {
        if(!text.match(/\[.+\|.+\]/)) {
            this.display = text;
            this.name = text;
        }
        else {
            let sides = text.split("|");
            this.display = sides[0].replace("[", "").replace(/~/g, " ");
            this.name = sides[1].replace("]", "").replace(/~/g, " ");
        }
    }

    public clicked() {
        this.select.emit({display: this.display, name: this.name});
    }

    @Output() select:EventEmitter<any> = new EventEmitter();
}
