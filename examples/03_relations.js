let seaduck = require('../seaduck.js')

let n = new seaduck.Narrative({
  "nouns": [
    {
      "name": "Joe",
      "properties": {
        "happiness": 0,
        "hungry": true
      },
      "tags": ["person"]
    },
    {
      "name": "Mary",
      "properties": {
        "happiness": 0,
        "hungry": true
      },
      "tags": ["person"]
    },
    {
      "name": "Horatio",
      "properties": {
        "happiness": 0,
        "hungry": true
      },
      "tags": ["person"]
    },
    {
      "name": "cookie",
      "properties": {
        "tastiness": 2,
        "eaten": false
      },
      "tags": ["food"]
    },
    {
      "name": "spinach",
      "properties": {
        "tastiness": 1,
        "eaten": false
      },
      "tags": ["food"]
    },
    {
      "name": "cake",
      "properties": {
        "tastiness": 3,
        "eaten": false
      },
      "tags": ["food"]
    }
  ],
  "initialize": function*() {
    for (let noun of this.getNounsByProperty("hungry", true)) {
      yield (new seaduck.StoryEvent("isHungry", noun));
    }
  },
  "actions": [
    {
      "name": "eat",
      "match": ["#person", "#food"],
      "when": function(a, b) {
        return a.properties.hungry 
          && b.properties.tastiness > 0 
          && !b.properties.eaten;
      },
      "action": function*(a, b) {
        yield (new seaduck.StoryEvent("eat", a, b));
        a.properties.hungry = false;
        b.properties.eaten = true;
        a.properties.happiness += b.properties.tastiness;
        if (b.properties.tastiness >= 2) {
          yield (new seaduck.StoryEvent("reallyLike", a, b));
        }
      }
    },
    {
      "name": "befriend",
      "match": ["#person", "#person"],
      "when": function(a, b) {
        return (
          (!a.properties.hungry && !b.properties.hungry) 
          && !this.isRelated("friendship", a, b));
      },
      "action": function*(a, b) {
        yield (new seaduck.StoryEvent("makeFriends", a, b));
        this.reciprocal("friendship", a, b);
      }
    },
    {
      "name": "express happiness",
      "match": ["#person"],
      "when": function(a) {
        return !a.properties.hungry 
          && a.properties.happiness >= 2 
          && this.allRelatedByTag("friendship", a, "#person").length > 0;
      },
      "action": function*(a) {
        yield (new seaduck.StoryEvent("isHappy", a));
      }
    }
  ],
  "traceryDiscourse": {
    "isHappy": ["#nounA# was happy", "#nounA# felt good!"],
    "isHungry": [
      "#nounA# had a rumble in their tummy.",
      "#nounA# felt very hungry."],
    "makeFriends": [
      "#nounA# made friends with #nounB#.",
      "#nounA# and #nounB# became friends."],
    "reallyLike": [
      "And let me tell you, #nounA# really enjoyed that #nounB#.",
      "#nounA# says, 'This #nounB# is so delicious!'"
    ],
    "eat": [
      "#nounA# ate a #nounB#.",
      "#nounA# gobbled up a #nounB#."
    ],
    "_end": ["The end.", "And they lived happily ever after."]
  }
});

for (let i = 0; i < 100; i++) {
  let storyEvents = n.stepAndRender();
  if (storyEvents.length > 0) {
    for (let ev of storyEvents) {
      console.log(ev);
    }
  }
  else {
    break;
  }
}

