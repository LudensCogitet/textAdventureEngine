'use strict';

let world = require('./world.json');
let location = "clearing";
let active = "";

let functions = {
    "say": function(text) {
        return text;
    },
    "describe": function(place) {
        let roomDescription = world.rooms[place].description || [];

        let thingsDescription = world.rooms[place].things.map(thing => {
            return `There is a ${world.things[thing].description} here.`;
        });

        return [roomDescription].concat(thingsDescription);
    },
    "travel": function(place) {
        if(world.rooms[place]) {
            location = place;
            return select('look')
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
        active = world.things[selected];

        let actions = world.rooms[location].actions[selected];

        if(!actions) return "You can't do that.";

        let returns = [];
        actions.forEach(action => {
            if(functions[action.function]) returns = returns.concat(functions[action.function](...action.params));
        });

        return returns;
};

module.exports = { select }
