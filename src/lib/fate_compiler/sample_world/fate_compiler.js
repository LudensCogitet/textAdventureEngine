let fs = require('fs');

let parseTag = (name, type = 'single') => {
    if(type === 'single') return ((data) => { return data === true || data === false ? data : data.match(new RegExp('<'+name+' "([\\s\\S]+?)">', 'i')); });
    if(type === 'closing') return ((data) => { return data === true || data === false ? data : data.match(new RegExp('<'+name+'>([\\s\\S]+?)<\/'+name+'>', 'i')); });
    return () => {};
};

let checkTag = (tag, tagName, elemIndex, paramNum) => {
    if(!tag) throw new Error(`Missing or invalid ${tagName} tag in element ${elemIndex}: "${tag}"`);
    if(tag.length < paramNum) throw new Error(`Missing parameter in ${tagName} tag in element ${elemIndex}: "${tag}"`);
};

let script = '';
let scriptFile = process.argv[2];
let fileExtension = scriptFile.split('.')[1];
console.log(process.env);
if(fileExtension === 'ft') {
    script = fs.readFileSync(scriptFile, 'utf8');
} else if(fileExtension === 'ftb') {
    let batch = fs.readFileSync(scriptFile, 'utf8');
    batch = batch.trim().split('\n');

    batch.forEach(line => {
        line = line.trim();
        if(line[0] === '#') return;
        console.log(line);
        script += '\n' + fs.readFileSync(line, 'utf8').trim() + '\n';
    });
} else {
    console.log("invalid file extension: must be .ft or .ftb");
    process.exit();
}

let targetPath = process.argv[3] || './';

let world = {
    "start": {
        "directives": []
    },
    "rooms": {},
    "conditions": {
        "location": '',
        "__turns__": -1
    },
    "switches": {},
    "emitters": [],
    "things": []
};

let extractLR = (array) => {
    console.log(array);
    let leftHand = array[0].trim();
    let rightHand = array[1].trim();

    return {leftHand, rightHand};
}

let compileVal = (data, index) => {
    let variable = parseTag('var', 'single')(data);
    let compiled = variable ? variable[1] : data;

    if(compiled === 'true') compiled = true;
    if(compiled === 'false') compiled = false;

    return variable ? JSON.stringify({var: compiled}) : compiled;
}

let compileConditional = (data, index) => {
    let compiledConditional = {};
    let conditions = data.split("&&");

    conditions.forEach(condition => {
        let logicalOp;
        let logicalOpCompiled;

        condition = condition.trim();
        if(condition.length < 1) return;

        if(condition.match(" == ")) {
            logicalOp = " == ";
            logicalOpCompiled = "eq";
        }

        if(condition.match(" < ")) {
            logicalOp = " < ";
            logicalOpCompiled = "lt";
        }

        if(condition.match(" <= ")) {
            logicalOp = " <= ";
            logicalOpCompiled = "lte";
        }

        if(condition.match(" > ")) {
            logicalOp = " > ";
            logicalOpCompiled = "gt";
        }

        if(condition.match(" >= ")) {
            logicalOp = " >= ";
            logicalOpCompiled = "gte";
        }

        if(condition.match(" != ")) {
            logicalOp = " != ";
            logicalOpCompiled = "ne";
        }

        if(condition.match(" % ")) {
            logicalOp = " % ";
            logicalOpCompiled = "mu";
        }

        let parts = condition.split(logicalOp);

        let {leftHand, rightHand} = extractLR(parts);
        leftHand = compileVal(leftHand);
        rightHand = compileVal(rightHand);

        compiledConditional[leftHand] = {}
        compiledConditional[leftHand][logicalOpCompiled] = rightHand;
    });

    return compiledConditional;
};

let compileSteps = (data, index) => {
    let compiledSteps = [];

    let steps = data.split(/<\/[\s\S]+?>/i);

    steps.forEach(step => {
        let compiledStep = {function: '',
                            params: []};
        step = step.trim();
        if(step.length < 1) return;

        let tag = step.match(/<([\s\S]+?)>/i);
        checkTag(tag, 'function tag', index, 0);
        let funcName = tag[1];

        compiledStep.function = funcName;
        step = step.replace(tag[0], '').trim().replace(/[\n\r]+/g,'').replace(/\s+/g,' ');

        if(funcName === "say") {
            step = step.split(/(?:<if|<fi>)/);
            compiledStep.params = step.map(chunk => {

                let conditions = chunk.match(/\(([\s\S]+?)\)>/);
                if(!conditions) return compileVal(chunk);

                let ifTrue = chunk.replace(conditions[0],'');

                return {if:{conditions: compileConditional(conditions[1]), then: compileVal(ifTrue)}};
            });
        }

        if(funcName === "set") {
            let {leftHand, rightHand} = extractLR(step.split('='));
            leftHand = compileVal(leftHand);
            rightHand = compileVal(rightHand);

            compiledStep.params = [[leftHand, rightHand]];

        }

        if(funcName === "take" || funcName === "drop" || funcName === "travel") {
            compiledStep.params = [compileVal(step.trim())];
        }

        if(funcName === "move" || funcName == "add" || funcName == "subtract") {
            let params = step.split(/<to>|<from>/);
            
            compiledStep.params = [compileVal(params[0].trim()), compileVal(params[1].trim())];
        }

        if(funcName === 'list') {
            let tag;
            tag = parseTag('location', 'single')(data);
            checkTag(tag, 'location', index, 1);
            compiledStep.params.push(compileVal(tag[1]));

            tag = parseTag('before', 'single')(data);
            checkTag(tag, 'before', index, 1);
            compiledStep.params.push(compileVal(tag[1]));

            tag = parseTag('after', 'single')(data);
            checkTag(tag, 'after', index, 1);
            compiledStep.params.push(compileVal(tag[1]));
        }

        compiledSteps.push(compiledStep);
    });

    return compiledSteps;
};

let compileActions = (data, index) => {
    let compiledActionsGroups = [];
    if(!data.match('</actions>')) return compiledActionsGroups;

    let actionsGroups = data.split('</actions>');

    actionsGroups.forEach(actions => {
        let compiledActions = {actions:{}};
        let ifClause = actions.match(/<actions if\(([\s\S]+?)\)>/i);
        if(ifClause) {
            let content = ifClause[1].trim();
            if(content.length < 1) return;
            checkTag(ifClause, 'conditional actions', index, 1);

            compiledActions.conditions = compileConditional(content, index);
        }

        actions = ifClause ? actions.slice(actions.indexOf(ifClause[0])).replace(ifClause[0], '') : actions.slice(actions.indexOf('<actions>')).replace('<actions>', '');

        actions = actions.split('</action>');

        actions.forEach(action => {
            action = action.trim();
            if(action.length < 1) return;

            let tag = parseTag('action','single')(action);
            checkTag(tag, "action", index, 1);
            let name = tag[1];
            compiledActions.actions[name] = [];

            let route = parseTag('route', 'closing')(action);
            if(route) {
                let roomTag = parseTag('room', 'single')(route[1]);
                checkTag(roomTag, 'route: room', index, 1);
                let activeTag = parseTag('active', 'single')(route[1]);
                checkTag(activeTag, 'route: active', index, 1);


                compiledActions.actions[name] = {route: [compileVal(roomTag[1].trim()), compileVal(activeTag[1].trim())]};
                return;
            }

            let stepGroups = action.replace(tag[0],'').split('</steps>');

            stepGroups.forEach(stepGroup => {
                stepGroup = stepGroup.trim();

                if(stepGroup.length < 1) return;

                let compiledStepGroup = {};

                let ifClause = stepGroup.match(/<steps if\(([\s\S]+?)\)>/i);
                if(ifClause) {
                    let content = ifClause[1].trim();
                    if(content.length < 1) return;
                    checkTag(ifClause, 'conditional steps', index, 1);

                    compiledStepGroup.conditions = compileConditional(content, index);
                }

                stepGroup = ifClause ? stepGroup.replace(ifClause[0], '') : stepGroup.replace('<steps>', '');

                compiledStepGroup.steps = compileSteps(stepGroup, index);

                compiledActions.actions[name].push(compiledStepGroup);
            });
        });
        compiledActionsGroups.push(compiledActions);
    });

    return compiledActionsGroups;
};

let compileRoom = (data, name, index) => {
    let compiledRoom = {actions: []};

    let description = parseTag('description', 'single')(data);
    checkTag(description, 'description', index, 1);

    compiledRoom.description = `[${description[1]}|${name}]`;
    compiledRoom.actions = compileActions(data, index);

    return compiledRoom;
};

let compileThing = (data, index) => {
    let compiledThing = {name: '',
                         location: '',
                         description: '',
                         actions: {}};
    let tag;
    tag = parseTag('name', 'single')(data);
    checkTag(tag, 'name', index, 1);
    compiledThing.name = tag[1];

    tag = parseTag('location', 'single')(data);
    checkTag(tag, 'location', index, 1);
    compiledThing.location = tag[1];

    tag = parseTag('description', 'single')(data);
    checkTag(tag, 'description', index, 1);
    compiledThing.description = `[${tag[1]}|${compiledThing.name}]`;

    compiledThing.actions = compileActions(data, index);

    return compiledThing;

};

let compileStart = (data, index) => {
    let start = {};
    let tag;

    tag = parseTag('location','single')(data);
    checkTag(tag, 'start location', index, 1);

    start.location = tag[1].trim();
    world.conditions.location = start.location;

    tag = parseTag('directives','closing')(data);
    checkTag(tag, 'directives', index, 0);

    let directives = tag[1];

    directives = directives.split('<and>');
    directives = directives.map(d => d.trim());
    start.directives = directives;

    return start;
};

let compileConditions = (data, index) => {
    let conditions = data.split('<and>');
    let compiled = {};

    conditions.forEach(condition => {
        let {leftHand, rightHand} = extractLR(condition.split('='));

        compiled[leftHand] = compileVal(rightHand);
    });


    return compiled;
};

let items = script.split("</describe>");

items.forEach((item, i) => {
    item = item.trim();

    if(item.length < 1) return;

    let type = parseTag('describe','single')(item);
    checkTag(type, 'describe', i, 1);

    if(type[1] === 'start') {
        world.start = compileStart(item, i);
    }
    if(type[1] === 'conditions') {
        world.conditions = Object.assign(world.conditions, compileConditions(item.replace(type[0],''), i));

    }
    if(type[1] === 'thing'){
        world.things.push(compileThing(item, i));
    }
    if(type[1] === 'room') {
        let name = parseTag('name','single')(item);
        checkTag(name, 'name', i, 1);
        world.rooms[name[1]] = compileRoom(item, name[1], i);
    }
});


fs.writeFileSync(targetPath, JSON.stringify(world));
