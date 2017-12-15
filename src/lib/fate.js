'use strict';

let world = require('./fate_compiler/compiled.json');
let initState = JSON.stringify(world);

let directives = world.start.directives;
let active = "";

let resolveVal = (val) => {
    try { val = JSON.parse(val); }
    catch(e) { return val; }

    if(!val.var) return val;
    return world.conditions[val.var];
};

let resolveVar = (variable) => {
    try { variable = JSON.parse(variable); }
    catch(e) { return variable; }
    return variable.var;
}

let functions = {
    "say": function() {
        let final = [];

        for(let i = 0; i < arguments.length; i++) {
            let toPush;
            if(arguments[i].if) {
                if(Object.keys(arguments[i].if.conditions).every(condition => compareConditions(condition, arguments[i].if.conditions[condition]))) {
                    toPush = resolveVal(arguments[i].if.then);
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
        for(let i = 0; i < arguments.length; i++) {
            console.log("--set",resolveVar(arguments[i][0]));
            console.log("--with val", resolveVal(arguments[i][1]))
            world.conditions[resolveVar(arguments[i][0])] = resolveVal(arguments[i][1]);
        }
    },
    "add": function(value, condition) {
        world.conditions[resolveVar(condition)] += resolveVal(value);
    },
    "subtract": function(value, condition) {
        world.conditions[resolveVar(condition)] -= resolveVal(value);
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
        console.log("ACTIVE", active);
        let things = world.things.filter(x => x.location === world.conditions.location || x.location === 'player');
        if(world.rooms[world.conditions.location])
            things.push(world.rooms[world.conditions.location]);
        if(world.rooms["anywhere"])
            things.push(world.rooms["anywhere"]);


        let returns = loopThings(things, active);

        if(returns.length || directives.includes(active) || active.includes('&')) {
            active = '';
            world.conditions.__turns__++;
            returns = returns.concat(checkEmitters(things));
            returns = returns.concat(loopThings(things, '__tick__'));
        }
        console.log(world.conditions.__turns__);
        return packageData(returns);
};

let checkEmitters = (things) => {
    let returns = []
    world.emitters.forEach(emitter => {
        if(world.conditions.__turns__ !== 0 && world.conditions.__turns__ % emitter.fire === 0)
            returns = returns.concat(loopThings(things, emitter.action));
    });
    return returns;
};

let loopThings = (things, active) => {
    let returns = [];
    things.forEach(thing => {

        let actionsGroups = thing.actions.filter(x => !x.conditions || Object.keys(x.conditions).every(condition => compareConditions(condition, x.conditions[condition])));
        actionsGroups.forEach(actions => {
            let result = runActions(actions.actions[active]);

            if(result) returns = returns.concat(result);
        });
    });

    return returns;
}

let runActions = (actions) => {
    if(!actions) return;
    let returns = [];


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
    let leftHandSide = resolveVal(condition);

    console.log("CONDITION", leftHandSide);
    console.log("PREDICATE", predicate);

    if(predicate.hasOwnProperty('eq'))     return leftHandSide === resolveVal(predicate.eq);
    if(predicate.hasOwnProperty('ne'))     return leftHandSide !== resolveVal(predicate.ne);
    if(predicate.hasOwnProperty('lt'))     return leftHandSide <   resolveVal(predicate.lt);
    if(predicate.hasOwnProperty('lte'))    return leftHandSide <=  resolveVal(predicate.lte);
    if(predicate.hasOwnProperty('gt'))     return leftHandSide >   resolveVal(predicate.gt);
    if(predicate.hasOwnProperty('gte'))    return leftHandSide >=  resolveVal(predicate.gte);

    if(predicate.hasOwnProperty('mu')) {
        console.log(resolveVal(predicate.mu));
        console.log("HERE");
        if(leftHandSide === 0)
            return false;
        console.log("AND HERE");
        if(resolveVal(predicate.mu) === 0) return false;
        console.log(resolveVal  (predicate.mu));
        console.log(leftHandSide % resolveVal(predicate.mu));
        return leftHandSide % resolveVal(predicate.mu) === 0;
    }
};

module.exports = { select, start }
