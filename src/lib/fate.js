'use strict';

let world = require('./world.json');
let location = "clearing";
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
        let items = [];
        Object.keys(world.things).forEach(thing => {
                if(world.things[thing].location === room)
                    items.push(world.things[thing].description);
            });
        return items.map(item => `${preface}${item}${coda}`);
    },
    "travel": function(place) {
            location = place;
            if(world.rooms[place]) {
                active = place;
            return select('describe').text;
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

let select = (selected) => {
        selected = selected.toLowerCase();

        let returns;

        if(active &&
           world.things[selected] &&
           world.things[selected].location === location &&
           world.things[selected].actions[active]) {
               returns = runActions(world.things[selected].actions[active]);
        }

        if(returns){
            active = '';
            return packageData(returns);
        }

        if(world.rooms[location].actions[selected]) {
            returns = runActions(world.rooms[location].actions[selected]);
        }

        if(!returns) active = selected;

        return packageData(returns);
};

let runActions = (actions) => {
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

module.exports = { select }
