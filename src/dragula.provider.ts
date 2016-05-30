import {Injectable} from "@angular/core";
import {DragulaModelWrapper} from "./dragula-model-wrapper.class";
import dragula = require('dragula');
import Drake = dragula.Drake;

export interface DragulaBag {
    name:string;
    drake:Drake
}

export interface DragulaModel {
    container:HTMLElement,
    get:()=>any[],
    set:(value:any[])=>void
}

export type JSONSerializer = (obj:any)=>string;

@Injectable()
export class DragulaService {
    protected _bags:DragulaBag[] = [];
    protected _models:DragulaModel[] = [];
    protected _jsonSerializer:JSONSerializer = null;

    public get jsonSerializer():JSONSerializer {
        if (this._jsonSerializer == null) return JSON.stringify;
        return this._jsonSerializer;
    }

    public set jsonSerializer(method:JSONSerializer) {
        this._jsonSerializer = method;
    }

    /**
     * Adds a DragulaBag using the given name and the given Drake instance.
     * @param name
     * @param drake
     * @returns {DragulaBag}
     */
    public add(name:string, drake:Drake) {
        var bag:DragulaBag = this.find(name);
        if (bag != null) throw `Cannot create bag "${name}": Dragula Bag with same name already exists`;

        bag = {name: name, drake: drake};
        this._bags.push(bag);

        // todo drake.models - handleModels

        // todo setup events

        return bag;
    }

    /**
     * Adds a DragulaBag using the given options.
     * @param bagName
     * @param options
     * @returns {DragulaBag}
     */
    public addWithOptions(bagName:string, options:any):DragulaBag {
        return this.add(bagName, dragula(options));
    }

    /**
     * Finds a DragulaBag having the given name.
     * If no element is found, null is returned.
     * @param name
     * @returns {DragulaBag}
     */
    public find(name:string):DragulaBag {
        for (let i = 0; i < this._bags.length; i++) {
            if (this._bags[i].name == name) return this._bags[i];
        }
        return null;
    }

    /**
     * Destroys a given DragulaBag
     * @param name
     */
    public destroy(name:string):void {
        var bag = this.find(name);
        if (bag == null) return;

        this._bags.splice(this._bags.indexOf(bag), 1);
        bag.drake.destroy();
    }

    protected bindDrakeEvents(bagName:string, drake:Drake):void {
        var indexOfCurrentElement:number;
        var draggedElement:HTMLElement;

        // While dragging, set local variables
        drake.on('drag', (element:HTMLElement, source:HTMLElement) => {
            draggedElement = element;
            indexOfCurrentElement = this.getDomIndexOf(element, source);
        });

        drake.on('remove', (element:HTMLElement, source:HTMLElement) => {
            this.bindDrakeRemoveEvent(element, source, indexOfCurrentElement);
        });

        drake.on('drop', (droppedElement:HTMLElement, target:HTMLElement, source:HTMLElement) => {
            var indexOfDroppedElement = this.getDomIndexOf(droppedElement, target);
            this.bindDrakeDropEvent(
                draggedElement,
                droppedElement,
                source,
                target,
                indexOfCurrentElement,
                indexOfDroppedElement
            );
        });
    }

    protected bindDrakeRemoveEvent(removedElement:HTMLElement, source:HTMLElement, removeIndex:number):void {
        var model = this.findModel(source);
        if (model == null) return; // Cancel if no corresponding model was found

        // Manipulate model
        var currentValue = model.get();
        currentValue.splice(removeIndex, 1);
        model.set(currentValue);
        //todo emit removeModel event
    }

    protected bindDrakeDropEvent(draggedElement:HTMLElement, droppedElement:HTMLElement, source:HTMLElement, target:HTMLElement, dragIndex:number, dropIndex:number) {
        // Cancel if no target was defined
        if (target == null) return;
        var sourceModel = this.findModel(source);
        if (sourceModel == null) return;

        // Check if target is equal to source ~> rearrange item
        if (target === source) {
            var currentValue = sourceModel.get();
            currentValue.splice(dropIndex, 0, currentValue.splice(dragIndex, 1)[0]);
            return sourceModel.set(currentValue);
        }

        // Change behavior based on whether or not the dropped element is a copy of the originally dragged element
        var droppedElementIsCopy = (draggedElement !== droppedElement);
        var targetModel = this.findModel(target);
        if (targetModel == null) return;

        var sourceModelValue = sourceModel.get();
        var droppedElementModel:any;
        if (droppedElementIsCopy) {
            droppedElementModel = new DragulaModelWrapper(JSON.parse(this.jsonSerializer(sourceModelValue[dragIndex])));
        }
        else {
            droppedElementIsCopy = sourceModelValue[dragIndex];

            // Remove from sourceModelValue
            sourceModelValue.splice(dragIndex, 1);
            sourceModel.set(sourceModelValue);
        }

        var targetModelValue = targetModel.get();
        targetModelValue.splice(dropIndex, 0, droppedElementModel);
        targetModel.set(targetModelValue);

        // todo emit dropModel
    }

    /**
     * Finds a DragulaModel using its container element.
     * @param container
     * @returns {DragulaModel}
     */
    protected findModel(container:HTMLElement):DragulaModel {
        for (let i = 0; i < this._models.length; i++) {
            if (this._models[i].container == container) return this._models[i];
        }
        return null;
    }

    protected getDomIndexOf(child:HTMLElement, parent:HTMLElement):number {
        return Array.prototype.indexOf.call(parent.children, child);
    }
}