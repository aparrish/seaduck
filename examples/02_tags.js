let seaduck = require("../seaduck");

let n = new seaduck.Narrative({
  "nouns": [
    {
      "name": "Chris",
      "properties": {
        "sleepiness": 0
      },
      "tags": ["person"]
    },
    {
      "name": "Finn",
      "properties": {
        "sleepiness": 5
      },
      "tags": ["person"]
    },
    {
      "name": "top bunk",
      "properties": {
        "occupied": false
      },
      "tags": ["bed"]
    },
    {
      "name": "bottom bunk",
      "properties": {
        "occupied": false
      },
      "tags": ["bed"]
    }
  ],
  "actions": [
    {
      "match": ["#person"],
      "when": function(a) {
        return a.properties.sleepiness < 10;
      },
      "action": function*(a) {
        a.properties.sleepiness++;
        yield new seaduck.StoryEvent("moreSleepy", a);
      }
    },
    {
      "match": ["#person"],
      "when": function(a) {
        return a.properties.sleepiness == 7;
      },
      "action": function*(a) {
        yield new seaduck.StoryEvent("reallySleepy", a);
      }
    },
    {
      "match": ["#person", "#bed"],
      "when": function(a, b) {
        return a.properties.sleepiness >= 10 
          && !this.relatedByTag("sleepingIn", a, "bed")
          && !b.properties.occupied;
      },
      "action": function*(a, b) {
        this.relate("sleepingIn", a, b);
        b.properties.occupied = true;
        yield new seaduck.StoryEvent("getsInto", a, b);
      }
    },
    {
      "match": ["#person", "#bed"],
      "when": function(a, b) {
        return this.isRelated("sleepingIn", a, b);
      },
      "action": function*(a, b) {
        yield new seaduck.StoryEvent("asleep", a, b);
      }
    }
  ],
  "traceryDiscourse": {
    "moreSleepy": [
      "#nounA# yawns.",
      "#nounA#'s eyelids droop.",
      "#nounA# nods off for a second, then perks up.",
      "#nounA# says, 'I could use a cup of coffee.'",
      "'I don't think I can stay awake a minute longer,' says #nounA# to no one in particular.",
      "#nounA# checks their watch."
    ],
    "adverb": ["at last", "finally", "not a moment too soon"],
    "getsInto": [
      "#adverb.capitalize#, #nounA# gets into the #nounB#.",
      "#adverb.capitalize#, #nounA# climbs into the #nounB#."
    ],
    "asleep": [
      "#nounA# is asleep in the #nounB#.",
      "#nounA# snores beneath the covers of the #nounB#.",
      "#nounA# sleep-mumbles peacefully in the #nounB#."
    ],
    "reallySleepy": [
      "#nounA# is really sleepy.",
      "'I'm just about ready to hit the hay,' says #nounA#.",
      "You can tell just by looking at them that #nounA# really needs some rest."
    ],
    "_end": [
      "Good night."
    ]
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
