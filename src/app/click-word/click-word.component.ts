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
            let nameMatch = text.match(/\|(.*)\]/);
            this.name = nameMatch[1].replace(/~/g, ' ');
            text = text.replace(nameMatch[0], '');
            this.display = text.replace("[", "").replace(/~/g, " ");
        }
    }

    public clicked() {
        this.select.emit({display: this.display, name: this.name});
    }

    @Output() select:EventEmitter<any> = new EventEmitter();
}
