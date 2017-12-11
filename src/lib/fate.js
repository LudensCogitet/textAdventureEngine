'use strict';

let world = require('./fate_compiler/compiled.json');
let initState = JSON.stringify(world);
console.log(initState);
let directives = world.start.directives;
let active = "";

let resolveVal = (val) => {
    return val.var ? world.conditions[val.var] : val;
};

let functions = {
    "say": function() {
        let final = [];

        for(let i = 0; i < arguments.length; i++) {
            let toPush;
            if(arguments[i].if) {
                if(Object.keys(arguments[i].if.conditions).every(condition => compareConditions(condition, arguments[i].if.conditions[condition]))) {
                    console.log("CONDITIONS MET");
                    console.log(arguments[i]);
                    toPush = arguments[i].if.then;
                }
            }
            else {
                toPush = resolveVal(arguments[i]);
            }

            final.push(toPush);
        }
        return final.join('');
    },
    "set": function() {
        console.log("SET ARGU",arguments);
        for(let i = 0; i < arguments.length; i++) {
            world.conditions[arguments[i][0]] = resolveVal(arguments[i][1]);
        }
    },
    "add": function(value, condition) {
        world.conditions[condition] += resolveVal(value);
    },
    "subtract": function(value, condition) {
        world.conditions[condition] -= resolveVal(value);
    },
    "take": function(thing) {
        world.things.find(x => x.name === resolveVal(thing)).location = 'player';
    },
    "drop": function(thing) {
        world.things.find(x => x.name === resolveVal(thing)).location = world.conditions.location;
    },
    "list": function(room, preface, coda) {
        room = resolveVal(room);
        preface = resolveVal(preface);
        coda = resolveVal(coda);

        let items = world.things
                            .filter(x => x.location === room)
                                .map(thing => thing.description);

        return items.map(item => `${preface}${item}${coda}`);
    },
    "travel": function(place) {
            place = resolveVal(place);
            world.conditions.location = place;
            if(world.rooms[place]) {
                let actions = world.rooms[place].actions.filter(x => !x.conditions || Object.keys(x.conditions).every(condition => compareConditions(condition, x.conditions[condition])));
                let returns = [];

                actions.forEach(actionsGroup => {
                    let result = runActions(actionsGroup.actions[`look&${place}`]);
                    if(result) returns = returns.concat(result);
                });

                return returns;
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
    },
    "dial": function(name) {
        name = resolveVal(name);
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
        console.log(world);
        let things = world.things.filter(x => x.location === world.conditions.location || x.location === 'player');
        if(world.rooms[world.conditions.location])
            things.push(world.rooms[world.conditions.location]);
        if(world.rooms["anywhere"])
            things.push(world.rooms["anywhere"]);

        console.log("--THINGS",things);
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
        console.log("THING",thing);
        let actionsGroups = thing.actions.filter(x => !x.conditions || Object.keys(x.conditions).every(condition => compareConditions(condition, x.conditions[condition])));
        actionsGroups.forEach(actions => {
            let result = runActions(actions.actions[active]);
            console.log("RESULT", result);
            if(result) returns = returns.concat(result);
        });
    });

    return returns;
}

let runActions = (actions) => {
    if(!actions) return;
    let returns = [];
    console.log("ROUTE", actions.route);

    if(actions.route) {
        let [room, active] = actions.route;
        return loopThings([world.rooms[room]], active);
    }

    actions.forEach(action => {
        let toRun;

        if(!action.conditions || Object.keys(action.conditions).every(condition => compareConditions(condition, action.conditions[condition])))
            toRun = action.steps;
        else if(action.else)
            toRun = action.else.steps;

        if(toRun) {
            toRun.forEach(step => {
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

    if(predicate.hasOwnProperty('ne'))     return predicate.ne.var ?     leftHandSide !== world.condition[predicate.ne.var] :
                                                                         leftHandSide !== predicate.ne;

    if(predicate.hasOwnProperty('lt'))     return predicate.lt.var ?     leftHandSide <   world.conditions[predicate.lt.var] :
                                                                         leftHandSide <   predicate.lt;

    if(predicate.hasOwnProperty('lte'))    return predicate.lte.var ?    leftHandSide <=   world.conditions[predicate.lte.var] :
                                                                         leftHandSide <=   predicate.lte;

    if(predicate.hasOwnProperty('gt'))     return predicate.gt.var ?     leftHandSide >   world.conditions[predicate.gt.var] :
                                                                         leftHandSide >   predicate.gt;

    if(predicate.hasOwnProperty('gte'))    return predicate.gte.var ?    leftHandSide >=   world.conditions[predicate.gte.var] :
                                                                         leftHandSide >=   predicate.gte;

    if(predicate.hasOwnProperty('mu')) {
        if(leftHandSide === 0)
            return false;

        if(predicate.mu.var) {
            if(predicate.mu.var === 0) return false;
        } else {
            if(predicate.mu === 0) return false;
        }

        return predicate.mu.var ?       leftHandSide % world.conditions[predicate.mu.var] === 0 :
                                        leftHandSide % predicate.mu === 0
    }
};

module.exports = { select, start }
