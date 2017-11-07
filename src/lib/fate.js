'use strict';

let world = require('./world.json');
let initState = JSON.stringify(world);

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
            if(world.rooms[place])
                return runActions(world.rooms[place].actions[`look&${place}`]);
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

        ['__tick__', active].forEach(act => {
            things.forEach(thing => {
                let result = runActions(thing.actions[act]);
                console.log("RESULT", result);
                if(result) returns = returns.concat(result);
            });

            if(world.rooms[world.conditions.location].actions[act]) {
                returns = returns.concat(runActions(world.rooms[world.conditions.location].actions[act]));
            }

            if(world.rooms["anywhere"].actions[act]) {
                console.log("HERE", world.rooms["anywhere"].actions[act]);
                returns = returns.concat(runActions(world.rooms["anywhere"].actions[act]));
            }
        });

        console.log("FINAL RETURNS", returns);
        if(returns.length || directives.includes(active) || active.includes('&')) {
            active = '';
            world.conditions.turns++;
        }

        return packageData(returns);
};

let runActions = (actions) => {
    if(!actions) return;
    let returns = [];
    actions.forEach(action => {
        if(!action.conditions || Object.keys(action.conditions).every(condition => compareConditions(condition, action.conditions[condition]))){
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

let compareConditions = (condition, predicate) => {
    let leftHandSide = world.conditions[condition];

    if(predicate.hasOwnProperty('eq'))     return predicate.eq.var ?     leftHandSide === world.conditions[predicate.eq.var] :
                                                                         leftHandSide === predicate.eq;

    if(predicate.hasOwnProperty('lt'))     return predicate.lt.var ?     leftHandSide <   world.conditions[predicate.lt.var] :
                                                                         leftHandSide <   predicate.lt;

    if(predicate.hasOwnProperty('lte'))    return predicate.lte.var ?    leftHandSide <=   world.conditions[predicate.lte.var] :
                                                                         leftHandSide <=   predicate.lte;

    if(predicate.hasOwnProperty('gt'))     return predicate.gt.var ?     leftHandSide >   world.conditions[predicate.gt.var] :
                                                                         leftHandSide >   predicate.gt;

    if(predicate.hasOwnProperty('gte'))    return predicate.gte.var ?    leftHandSide >=   world.conditions[predicate.gte.var] :
                                                                         leftHandSide >=   predicate.gte;
}

module.exports = { select, start }
