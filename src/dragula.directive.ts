import {Directive, OnInit, Output, OnChanges, Input, ElementRef, SimpleChange, EventEmitter} from "@angular/core";
import {DragulaService} from "./dragula.provider";
import dragula = require('dragula');
import Drake = dragula.Drake;

@Directive({
    selector: '[dragula]'
})
export class DragulaDirective implements OnInit, OnChanges {
    @Input('dragula') protected _bagName:string;
    @Input('dragulaModel') protected _bindModelData:any;
    @Output('dragulaModelChange') protected _bindModelDataChange:any = new EventEmitter();

    protected _element:ElementRef;
    protected _service:DragulaService;
    protected _drake:Drake;

    constructor(element:ElementRef, service:DragulaService) {
        this._element = element;
        this._service = service;
    }

    public ngOnInit():void {
        var bag = this._service.find(this._bagName);
        if (bag != null) {
            // Use already existing bag
            this._drake = bag.drake;
            // todo check model

            // Add directive's native element as Drake container
            this._drake.containers.push(this._element.nativeElement);
        }
        else {
            // Create new bag
            this._drake = dragula({
                containers: [this._element.nativeElement]
            });
            // todo check model

            // Push to DragulaService using given name
            this._service.add(this._bagName, this._drake);
        }
    }

    ngOnChanges(changes:{[propertyName:string]:SimpleChange}):any {
        var drake = <any>this._drake; // todo typings for drake.models
        if (changes && changes['dragulaModel']) {
            if (drake && drake.models) {
                var index = drake.models.indexOf(changes['dragulaModel'].previousValue);
                drake.models.splice(index, 1, changes['dragulaModel'].currentValue);
            }
            else if (drake && !drake.models) {
                drake.models = [changes['dragulaModel'].currentValue];
            }
        }
    }
}