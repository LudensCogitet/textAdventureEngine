'use strict';

let world = require('./world.json');
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
    "take": function(thing) {
        world.things.find(x => x.name === thing).location = 'player';
    },
    "drop": function(thing) {
        world.things.find(x => x.name === thing).location = world.conditions.location;
    },
    "items": function(room, preface, coda) {
        let items = world.things
                            .filter(x => x.location === room)
                                .map(thing => thing.description);

        return items.map(item => `${preface}${item}${coda}`);
    },
    "travel": function(place) {
            world.conditions.location = place;
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
    return select(`look&${world.conditions.location}`);
};

let select = (selected) => {
        selected = selected.toLowerCase();
        active = active ? `${active}&${selected}` : selected;

        console.log(active);
        let returns = [];

        let things = world.things.filter(x => x.location === world.conditions.location || x.location === 'player');

        things.forEach(thing => {
            let result = runActions(thing.actions[active]);
            console.log("RESULT", result);
            if(result) returns = returns.concat(result);
        });

        if(world.rooms[world.conditions.location].actions[active]) {
            returns = returns.concat(runActions(world.rooms[world.conditions.location].actions[active]));
        }

        if(world.rooms["anywhere"].actions[active]) {
            console.log("HERE", world.rooms["anywhere"].actions[active]);
            returns = returns.concat(runActions(world.rooms["anywhere"].actions[active]));
        }
        console.log("FINAL RETURNS", returns);
        if(returns.length || directives.includes(active) || active.includes('&')) active = '';

        return packageData(returns);
};

let runActions = (actions) => {
    if(!actions) return;
    let returns = [];
    actions.forEach(action => {
        if(!action.conditions || Object.keys(action.conditions).every(condition => compareConditions(action.conditions[condition], world.conditions[condition]))){
            action.steps.forEach(step => {
                if(functions[step.function]) {
                    let val = functions[step.function](...step.params);
                    console.log("VAL", val);
                    if(val) returns = returns.concat(val);
                }
            });
        }
    });

    return returns.filter(x => x);
};

let packageData = (returns) => {
    return { text: returns,
             status: {
                     active: active,
                     location: world.rooms[world.conditions.location].description,
                     conditions: world.conditions,
                     inventory: world.things.filter(x => x.location === 'player').map(x => x.description)
                 }
            };
};

let compareConditions = (condition, state) => {
    return condition === state;
}

module.exports = { select, start }
