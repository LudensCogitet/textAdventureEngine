'use strict';

let world = require('./world.json');
let location = world.start.location;
let directives = world.start.directives;
let active = "";

let functions = {
    "say": function(text) {
        return text;
    },
    "set": function() {
        for(let i = 0; i < arguments.length; i++) {
            world.conditions[arguments[i][0]] = arguments[i][1];
        }
    },
    "items": function(room, preface, coda) {
        let items = world.things
                            .filter(x => x.location === room)
                                .map(thing => thing.description);
        return items.map(item => `${preface}${item}${coda}`);
    },
    "travel": function(place) {
            location = place;
            if(world.rooms[place]) {
                active = 'look';
            return select(place).text;
        }
    },
    "replace": function() {
        let currentLayer = world[arguments[0]];
        for(let i = 1; i < arguments.length; i++) {
            if(i === arguments.length -2) {
                currentLayer[arguments[i]] = arguments[i+1];
                break;
            } else currentLayer = currentLayer[arguments[i]];
        }
    }
};

let start = () => {
    return select(world.start.command);
};

let select = (selected) => {
        selected = selected.toLowerCase();
        active = active ? `${active}&${selected}` : selected;

        console.log(active);
        let returns = [];

        let things = world.things.filter(x => x.location === location);

        things.forEach(thing => {
            let result = runActions(thing.actions[active]);
            console.log("RESULT", result);
            if(result) returns = returns.concat(result);
        });
        console.log("RETURNS", returns);
        if(returns.length){
            active = '';
            return packageData(returns);
        }

        if(world.rooms[location].actions[active]) {
            returns = runActions(world.rooms[location].actions[active]);
        }

        if(returns.length || directives.includes(active) || active.includes('&')) active = '';

        return packageData(returns);
};

let runActions = (actions) => {
    if(!actions) return;
    let returns = [];
    actions.forEach(action => {
        if(functions[action.function]) {
            if(!action.conditions || !Object.keys(action.conditions).some(condition => action.conditions[condition] !== world.conditions[condition])){
                let val = functions[action.function](...action.params);
                if(val) returns = returns.concat(val);
            }
        }
    });

    if(!returns.length) return null;

    return returns.filter(x => x);
};

let packageData = (returns) => {
    return { text: returns,
             status: {
                     active: active,
                     location: location,
                     conditions: world.conditions,
                     player: world.player
                 }
            };
};

module.exports = { select, start }
