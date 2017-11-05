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
        if(!this.text.match(/\[.+\|.+\]/)) {
            this.display = this.text;
            this.name = this.text;
        }
        else {
            let sides = this.text.split("|");
            this.display = sides[0].replace("[", "");
            this.name = sides[1].replace("]", "");
        }
    }

    public clicked() {
        console.log(this.name);
        this.select.emit(this.name);
    }

    @Output() select:EventEmitter<any> = new EventEmitter();
}
