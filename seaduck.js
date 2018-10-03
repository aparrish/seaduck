'use strict';

let hash = require('object-hash');
let tracery = require('tracery-grammar');

function mk(t) {
  return t.join("$");
}

function filterTagMatch(matchStr, item) {
  if (matchStr.charAt(0) == "#") {
    let tagStr = matchStr.substring(1);
    if (item.tags.includes(tagStr)) {
      return true;
    }
  }
  else {
    if (item.name == matchStr) {
      return true;
    }
  }
  return false;
}

class Narrative {
  constructor(narrative) {
    this.narrative = narrative;
    this.stepCount = 0;
    this.relations = new Map();
    this.eventHistory = [];
    this.stateHistory = [];
  }
  choice(t) {
    // convenience function for selecting among alternatives in a list
    return t[Math.floor(Math.random()*t.length)];
  }
  noun(name) {
    // get the noun object in the narrative with the corresponding name
    for (let noun of this.narrative.nouns) {
      if (noun.name == name) {
        return noun;
      }
    }
  }
  getNounsByTag(tag) {
    // get all nouns in the narrative with this tag
    let matches = [];
    for (let noun of this.narrative.nouns) {
      if (noun.tags.includes(tag)) {
        matches.push(noun);
      }
    }
    return matches;
  }
  getNounsByProperty(prop, val) {
    // get all nouns with this property
    let matches = [];
    for (let noun of this.narrative.nouns) {
      if (noun.properties[prop] == val) {
        matches.push(noun);
      }
    }
    return matches;
  }
  relate(rel, a, b) {
    // relate a to b with relation rel
    this.relations.set(mk([rel, a.name, b.name]), true)
  }
  unrelate(rel, a, b) {
    // remove relation rel between a and b
    this.relations.delete(mk([rel, a.name, b.name]));
  }
  unrelateByTag(rel, a, bTag) {
    // remove relation rel between a and nouns tagged with bTag 
    for (let noun of this.allRelatedByTag(rel, a, bTag)) {
      this.unrelate(rel, a, noun);
    }
  }
  reciprocal(rel, a, b) {
    // relate a to b reciprocally with relation rel
    this.relations.set(mk([rel, a.name, b.name]), true)
    this.relations.set(mk([rel, b.name, a.name]), true)
  }
  unreciprocal(rel, a, b) {
    // remove reciprocal relation rel between a and b
    this.relations.delete(mk([rel, a.name, b.name]))
    this.relations.delete(mk([rel, b.name, a.name]))
  }
  unreciprocalByTag(rel, a, bTag) {
    // remove reciprocal relation rel between a and nouns tagged with bTag 
    for (let noun of this.allRelatedByTag(rel, a, bTag)) {
      this.unrelate(rel, a, noun);
      this.unrelate(rel, noun, a);
    }
  }
  isRelated(rel, a, b) {
    // return true if a and b are related with rel
    return this.relations.get(mk([rel, a.name, b.name]))
  }
  allRelatedByTag(rel, a, bTag) {
    // returns all nouns related to a by rel with tag bTag
    let matches = [];
    let byTag = this.getNounsByTag(bTag);
    for (let b of byTag) {
      if (this.isRelated(rel, a, b)) {
        matches.push(b);
      }
    }
    return matches;
  }
  relatedByTag(rel, a, bTag) {
    // returns only the first noun related to a by rel with tag bTag
    return this.allRelatedByTag(rel, a, bTag)[0];
  }
  init() {
    // call the initialize function and add events to history
    let events = [];
    let boundInit = this.narrative.initialize.bind(this);
    for (let sEvent of boundInit()) {
      this.eventHistory.push(sEvent);
      events.push(sEvent);
    }
    return events;
  }
  step() {
    // step through the simulation
    // do nothing if story is over
    if (this.eventHistory.length > 0 &&
      this.eventHistory[this.eventHistory.length-1].ending()) {
      return [];
    }
    // initialize on stepCount 0, if provided
    if (this.stepCount == 0 && this.narrative.hasOwnProperty('initialize')) {
      this.stepCount++;
      return this.init();
    }

    let events = [];
    // for matches with two parameters
    for (let action of this.narrative.actions) {
      if (action.match.length == 2) {
        let matchingA = this.narrative.nouns.filter(
          function(item) { return filterTagMatch(action.match[0], item); });
        let matchingB = this.narrative.nouns.filter(
          function(item) { return filterTagMatch(action.match[1], item); });
        let boundWhen = action.when.bind(this);
        let boundAction = action.action.bind(this);
        for (let objA of matchingA) {
          for (let objB of matchingB) {
            if (objA == objB) {
              continue;
            }
            if (boundWhen(objA, objB)) {
              for (let sEvent of boundAction(objA, objB)) {
                this.eventHistory.push(sEvent);
                events.push(sEvent);
              }
            }
          }
        }
      }
    // for matches with one parameter
      else if (action.match.length == 1) {
        let matching = this.narrative.nouns.filter(
          function(item) { return filterTagMatch(action.match[0], item); });
        let boundWhen = action.when.bind(this);
        let boundAction = action.action.bind(this);
        for (let obj of matching) {
          if (boundWhen(obj)) {
            for (let sEvent of boundAction(obj)) {
              this.eventHistory.push(sEvent);
              events.push(sEvent);
            }
          }
        }
      }
    }

    // hash the current state and store 
    this.stateHistory.push(hash(this.narrative.nouns) + hash(this.relations));

    this.stepCount++;

    // if the last two states are identical, or no events generated, the end
    let shLen = this.stateHistory.length;
    if (
        (shLen >= 2 && this.stateHistory[shLen-1] == this.stateHistory[shLen-2]) ||
        events.length == 0) {
      // _end is a special sentinel value to signal the end of the narration
      this.eventHistory.push(new StoryEvent("_end"));
      events.push(new StoryEvent("_end"));
    }

    return events;
  }
  renderEvent(ev) {
    // renders an event using the associated tracery rule
    let discourseCopy = JSON.parse(
      JSON.stringify(this.narrative.traceryDiscourse));
    if (ev.a) {
      discourseCopy["nounA"] = ev.a.name;
    }
    if (ev.b) {
      discourseCopy["nounB"] = ev.b.name;
    }
    let grammar = tracery.createGrammar(discourseCopy);
    grammar.addModifiers(tracery.baseEngModifiers);
    return grammar.flatten("#"+ev.verb+"#");
  }
  stepAndRender() {
    // combines step() and renderEvent()
    let events = this.step();
    let rendered = [];
    for (let ev of events) {
      rendered.push(this.renderEvent(ev));
    }
    return rendered;
  }
}

class StoryEvent {
  constructor(verb, a, b) {
    this.verb = verb;
    this.arity = 0;
    if (a !== undefined) {
      this.a = a;
      this.arity++;
    }
    if (b !== undefined) {
      this.b = b;
      this.arity++;
    }
  }
  dump() {
    if (this.arity == 0) {
      return [this.verb];
    }
    else if (this.arity == 1) {
      return [this.a.name, this.verb];
    }
    else if (this.arity == 2) {
      return [this.a.name, this.verb, this.b.name];
    }
  }
  ending() {
    return this.verb == '_end';
  }
}

module.exports = {Narrative: Narrative, StoryEvent: StoryEvent};
