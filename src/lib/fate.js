'use strict';

let world = require('./world.json');
let initState = JSON.stringify(world);

let directives = world.start.directives;
let active = "";

let functions = {
    "say": function() {
        let final = []
        for(let i = 0; i < arguments.length; i++) {
            final.push(arguments[i].var ? world.conditions[arguments[i].var] : arguments[i])
        }
        return final.join('');
    },
    "set": function() {
        for(let i = 0; i < arguments.length; i++) {
            world.conditions[arguments[i][0]] = arguments[i][1].var ? world.conditions[arguments[i][1].var] : arguments[i][1];
        }
    },
    "add": function(value, condition) {
        world.conditions[condition] += value;
    },
    "subtract": function(value, condition) {
        world.conditions[condition] -= value;
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
    },
    "dial": function(name) {
        let currentIndex = world.switches[name].indexOf(world.conditions[name]);
        let newIndex = currentIndex + 1 === world.switches[name].length ? 0 : currentIndex + 1;
        world.conditions[name] = world.switches[name][newIndex];
    }
};

let start = () => {
    return select(`look&${world.conditions.location}`);
};

let select = (selected) => {
        selected = selected.toLowerCase();
        active = active ? `${active}&${selected}` : selected;

        let things = world.things.filter(x => x.location === world.conditions.location || x.location === 'player');
        things.push(world.rooms[world.conditions.location]);
        things.push(world.rooms["anywhere"]);

        let returns = loopThings(things, active);

        if(returns.length || directives.includes(active) || active.includes('&')) {
            active = '';
            world.conditions.turns++;
            returns = returns.concat(checkEmitters(things));
            returns = returns.concat(loopThings(things, '__tick__'));
        }

        return packageData(returns);
};

let checkEmitters = (things) => {
    let returns = []
    world.emitters.forEach(emitter => {
        if(world.conditions.turns !== 0 && world.conditions.turns % emitter.fire === 0)
            returns = returns.concat(loopThings(things, emitter.action));
    });
    return returns;
};

let loopThings = (things, active) => {
    let returns = [];
    things.forEach(thing => {
        let result = runActions(thing.actions[active]);
        console.log("RESULT", result);
        if(result) returns = returns.concat(result);
    });

    return returns;
}

let runActions = (actions) => {
    if(!actions) return;
    let returns = [];
    console.log("ROUTE", actions.route);
    let resolvedActions = actions.route ? world.rooms[actions.route[0]].actions[actions.route[1]] : actions;

    resolvedActions.forEach(action => {
        if(!action.conditions || Object.keys(action.conditions).every(condition => compareConditions(condition, action.conditions[condition]))){
            console.log(action);
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
