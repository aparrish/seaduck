# Sea Duck

By [Allison Parrish](https://www.decontextualize.com/)

Sea Duck is a minimally opinionated rough-draft JavaScript framework for
producing narratives through simulation. All you have to do is define a list of
nouns, a list of actions that happen to those nouns (thereby producing events),
and a [Tracery](http://tracery.io) grammar to turn those events into text.

Note: This library uses a number of ES6 features
([maps](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map),
[generator
functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*))
and I haven't used a transpiler or anything to provide backwards compatibility.
Internet Explorer probably won't work (but Edge probably will?). Sorry!

I made this framework primarily as a toy for experimentation and teaching,
because I couldn't find any similar frameworks (available in a more-or-less
complete form to the general public) that make it easy to get started with
making narratives from simulated events. The idea was to facilitate quick
prototypes for projects along the lines of Darius Kazemi's [Teens Wander Around
A House](http://tinysubversions.com/nanogenmo/novel-2.pdf) ([NaNoGenMo thread
here](https://github.com/dariusk/NaNoGenMo/issues/2)) As a consequence, this
framework doesn't contain a built-in world model, or a system for solving
constraints or action planning (though you could implement any of those things
yourself on top of the framework).

Pull requests or suggestions for overall architecture are solicited.

## Installation

You can npm install from this git repo and `require('seaduck')` in your code:

    npm install https://github.com/aparrish/seaduck --save

Or you can [download the bundle](/build/seaduck-bundle.js) (click "Raw" and
then `File > Save as...` or equivalent in your browser) and add it to your
project with a `<script>` tag:

    <script src="seaduck-bundle.js"></script>

... which will create a global `seaduck` variable available to the rest of your
JavaScript code.

## Examples

You can find annotated examples in the `examples/` folder. If you've downloaded
this repo, you can run them like so:

    node examples/01_basic.js

The examples are also available in adapted form on the [p5.js web
editor](https://editor.p5js.org/):

* [Example 1: The Basics](https://editor.p5js.org/allison.parrish/sketches/ByC_daWcX)
* [Example 2: With
  tags](https://editor.p5js.org/allison.parrish/sketches/S15I3TbcQ)
* [Example 3:
  Relations](https://editor.p5js.org/allison.parrish/sketches/Hkrhppb9X)
* [Example 4: Rooms and
  objects](https://editor.p5js.org/allison.parrish/sketches/BJflApbcm)

## Concepts and usage

The purpose of a Sea Duck narrative is to generate sentences from events that
transpire as nouns interact according to a set of rules. At each step of the
simulation, the state of the nouns (properties and relations) are checked, and
then potentially changed, generating narrative events in the process, which are
rendered as text using Tracery grammars. A Sea Duck narrative consists of the
following components:

* Nouns
* Actions
* Relations
* Events
* Discourse

Create Sea Duck narrative object like so:

    let n = new seaduck.Narrative({
        "nouns": [
            ... list of noun objects ...
        ],
        "actions": [
            ... list of action definitions ...
        ],
        "initialize": function() { ...code to execute on startup... },
        "traceryDiscourse": {
            ... tracery rules for each kind of event ...
        }
    });

After creation, you can step through the simulation using `.step()`, which
returns a list of `StoryEvent` objects created during the simulation step; or
you can call `.stepAndRender()`, which collects events from `.step()` and
renders them using the associated Tracery grammar.

### Nouns and properties

A `noun` is something that will participate in the narrative (a person, place,
or thing). Here's an example noun:

    {
      "name": "Joe",
      "properties": {
        "happiness": 0,
        "hungry": true
      },
      "tags": ["person"]
    }

The `name` attribute identifies the noun and is also the string that will be
used to render it in the Tracery output; the `properties` attribute is an
object for storing values associated with this noun; and the `tags` attribute
is a list of strings "tagging" this noun. (The tags are used to group objects
into categories for the purpose of relations and action matching; see below.)
Nouns must have *all* of these attributes defined.

### Actions

An `action` is a series of checks to perform against nouns on each step, along
with code for what to do if those checks pass. A typical action is structured
like this:

    {
      "name": "eat",
      "match": ["#person", "#food"],
      "when": function(a, b) {
        return a.properties.hungry && !b.properties.eaten;
      },
      "action": function*(a, b) {
        yield (new seaduck.StoryEvent("eat", a, b));
        a.properties.hungry = false;
        b.properties.eaten = true;
      }
    }

The value of the `when` attribute should be a function that takes one or two
`noun`s as parameters and returns `true` or `false`. If this function returns
`true`, then the action check succeeds, and the function associated with
the `action` attribute will be executed.

Inside the `when` and `action` functions, `this` is bound to the Sea Duck
`Narrative` object itself, to make it easy to call any of its methods. (Read
on for more information on the methods you can call.)

The `name` attribute of an action is currently ignored (but might be used for
something else in the future).

### Matching

The `match` attribute of an `action` specifies which nouns or groups of nouns
to will be given to the `when` and `action` functions. The list can contain
either one or two items; if one item, then the `when` function will be called
for each matching noun(s) it turn. If two items, then the `when` function will
be called once for each pair of items from both matching lists, with the items
from the corresponding lists being passed as the first and second parameters,
respectively. If the string in the list starts with `#`, then all nouns
matching the tag will be included; otherwise, only the noun whose name exactly
matches will be included.

For example, the following `match` list:

    "match": ["#person"]

... would cause the `when` function to be called once for every noun tagged
"person," while this `match` list:

    "match": ["#dog", "#cat"]

... would cause the `when` function to be called for every possible pairing of
nouns labelled `dog` and `cat`. Without the `#` sign, only the noun with
exactly the matching name will be included, so:

    "match": ["Joe", "cupcake"]

... would cause the `when` function to be called only once (with the noun named
`Joe` and the noun named `cupcake` as parameters).

### Yielding actions

Note that *updating parameters or manipulating relations* does not itself
create narrative events. It's up to you to decide what changes to story state
"mean" in terms of the events that they create.

To that end, the `action` function should be a [generator
function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)
that `yield`s `StoryEvent` objects. (Generator functions are used so that
`actions` can potentially generate multiple events; you need to put a `*` after
the word `function` in the function definition to make it a generator
function.) The `StoryEvent` constructor takes at least one and up to three
parameters, specifying the event's verb, the first noun, and the second noun.
For example, the following `action` function would yield three different
events:

    "action": function*(a, b) {
        yield new seaduck.StoryEvent("rain"); // just verb
        yield new seaduck.StoryEvent("sleep", a); // verb + subject
        yield new seaduck.StoryEvent("see", a, b); // verb + subject + object
    }

### Discourse (rendering events with Tracery)

When "rendering" `StoryEvent`s as sentences, the name of the verb will be
matched to a Tracery rule. When rendering, the rules `nounA` and `nounB` will
be set to the corresponding nouns in the `StoryEvent`. For example, the
`traceryDiscourse` section to render the events in the example above might look
like:

    "traceryDiscourse": {
        "rain": ["It's raining."],
        "sleep": ["#nounA# falls asleep."],
        "see": ["#nounA# sees #nounB# out of the corner of their eye."]
    }
   
The properties of each noun are also available as rules in the Tracery grammar
with the names `nounA_<propname>` and `nounB_<propname>`, where `<propname>` is
the name of the property.

### Relations

In Sea Duck, a relation is a named boolean value that relates one noun to
another. You can check for relations between nouns in a `when` function and
create (or destroy) relations between nouns in an `action` function. For
example, if you wanted to create an `in_love` relation between two nouns in an
`action` function, you might write:

    this.relate("in_love", a, b);

To check to see if two nouns are related to each other with a particular
relationship, use `this.isRelated(...)`:

    if (this.isRelated("in_love", a, b)) { ... }

The `this.reciprocal()` method creates a two-way relation (so that `a` is
`in_love` with `b` and `b` is `in_love` with `a`):

    this.reciprocal("in_love", a, b);

You can erase a relation using `this.unrelate()` or `this.unreciprocal()`:

    this.unrelate("in_love", a, b); // a is no longer in_love with b
    this.unreciprocal("in_love", a, b); // a & b are no longer in_love w/each other

The function `this.allRelatedByTag(...)` function gives you a list of all
objects with the given tag that a noun is related to with the named relation.
For example, to find all nouns that `a` is `in_love` with tagged `person`:

    this.allRelatedByTag("in_love", a, "person") // array of related nouns

If you're pretty sure that there's only one related noun by tag, you can use
`this.relatedByTag(...)` to only get the first result:

    this.relatedByTag("in_love", a, "person") // one noun object

### Initializing

The `initialize` attribute of the object passed to the `Narrative` constructor
should point to a generator function, which will be called when the `.step()`
method is called before any actions are checked. This is a great place to put
any code to initialize relations between objects or generate introductory
story events. For example, the following `initialize` function generates
story events for each `hungry` noun:

```
  "initialize": function*() {
    for (let noun of this.getNounsByProperty("hungry", true)) {
      yield (new seaduck.StoryEvent("isHungry", noun));
    }
  }
```

### Finding noun objects

Two handy methods for looking up noun objects:

* `this.getNounsByProperty(prop, val)` returns an array of noun objects for each
  noun whose property named by `prop` is equal to `val`;
* `this.noun(name)` returns the noun with the given name. (This is handy in
  `initialize` or advanced uses of `action` functions where you don't
  have a reference to the object itself.)

### When narration ends

Narration ends when either of the following two conditions obtain:

* No events are generated by any action
* The state of the narrative (i.e., noun properties and relations) did not
  change from one step to the next

In both cases, Sea Duck inserts a special `StoryEvent` with the verb `_end` to
indicate that the story is over. You can manually end a narration by yielding
an event with this verb from an `action` function. Subsequent calls to
`.step()` (and `.stepAndrender()`) will return empty arrays.

A typical loop for stepping through the narration simulation might look like
this:

    let n = seaduck.Narrative(...your narration specification here...);
    let maxSteps = 100; // maximum number of steps to perform

    for (let i = 0; i < maxSteps; i++) {
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

## License

    Copyright 2018 Allison Parrish

    Permission is hereby granted, free of charge, to any person obtaining a copy of
    this software and associated documentation files (the "Software"), to deal in
    the Software without restriction, including without limitation the rights to
    use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
    of the Software, and to permit persons to whom the Software is furnished to do
    so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
