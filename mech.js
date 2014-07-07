/* Example execution
    {Mech}, [Step]
    {Turn}:
        [Pre] pushes {PreMech}, step_complete: goto SelectAction
        [SelectAction] pushes and blocks on SelectAction {}, after: goto CastSpell or something
        [CastSpell] pushes and blocks {SpellCast}, after: goto SpellComplete
            {SpellCast}:
                [Pre]
                [SpendMana] pushes SpendManaMech, then goto cast or abort
                    {SpendMana}:
                        [Pre...]
                        Deducts mana: immediately deducts mana, then goto post.  (no anim)
                        [Post...]
                [Perform Spell]: pushes {Spell}, goto post unless aborted.
                    {Spell}:
                        [Pre...]
                        [PreAnimate]: pushes {Animation}, goto Deal Damage
                        [Deal Damage] pushes {Deal Damage}, goto PostAnimate
                            {Deal Damage}
                                [PreventChance]: goto Prevented if prevented, else RedirectChance
                                [RedirectChance]: goto PreventChance if redirected, else Pre
                                [Pre...]
                                Actually do damage.
                                [Post...]
                            Pre...

                            Post...
                        [PostAnimate]: pushes {Animation} goto Post
                        [Post...]
                [Post...]
                Aborted: mark self aborted.



        Post(parent)

I think most of the boilerplate for push, block, then can be reduced to a
method generator similar to Ice.kocomputed (but much less complicated)

The blocker might be able to, too...

function MechStep(mech_generator, post_mech) {
    var self = this;
    var mech = _.bind(mech_generator, self)();
    mech.on_complete = function() {
        // stack doesn't loop-run.
        // Each step function runs exactly once.
        // The rest is done by callback.
        if(post_mech.constructor === Function) {
            _.bind(post_mech, self)();
        } else {
            self.goto(post_mech);
        }
    }
    game.stack.push(mech);
}

function BlockingStep(step_func) {
    var self = this;
    var blocker = Block(function() {
        self.blocking = null;
    });
    self.blocking = blocker;
    _.bind(step_func, this)();
}

stacks maintain a list of mechs.  Each mech has a step, and also has a 'stale' method.
stale starts true.
goto on a mech sets stale.
stack calls the topmost mech IF stale is set.  This is so that a mech
can set stale and return with goto, or push a mech, then return.  The
stack will recall the (new) top-most mech's step if it is stale, until it is not.

mech has a do_step function which clears stale and calls the current step method.
Each mech has a complete flag.
Some steps do nothing but mark complete (post does this after its mech.)

Stack will pop mechs that are complete.  Stack returns control to the browser
when the top-most mech is neither stale nor complete, or is Ticker and no mechs were run.

The very top-most mechanic, Ticker, is always stale and never complete,
but Stack manages it specially, only calling it once per execution.

Ticker pushes turns and expirations/timers.

*/

Mech = Ice.$extend('Mech', {
    __init__: function(phases) {
        this.$super();
        var self = this;

        if(self.$class !== PreMech && self.$class !== PostMech) {
            self.phases = _.flatten([
                [PreMech(self)],
                phases,
                [PostMech(self)]
            ]);
        }

        this.phase = self.phases[0];
        this.participants = [];

        this.redirected = null;
        this.stack = null; // Stack will put this on me.
        this.blocking = false;
    },
    // The stack always runs the top-most hoodoo unless it is blocked, and will always
    // pop done hoodoos.  If this hoodoo is blocked on something *other than other hoodoos on the stack*,
    // then it should set blocking.
    run: function() {
        if(this.phase === 'starting') {
            this.phase = 'chance';
        } else if (this.phase === 'chance') {
            if(this.redirected) {
                this.target = this.redirected;
            } else {
                this.phase = 'pre';
            }
        } else if (this.phase === 'pre') {
            this.phase = 'execute';
        } else if (this.phase === 'execute') {
            //this.phase = 'post';
            // Execute can last a while.  When execution has been called enough times, it needs to
            // update phase.
        } else if(this.phase === 'done') {

        }

        this[this.phase + '_phase']();
    },

    chance_phase: function() {

    },
    pre_phase: function() {

    },
    execute_phase: function() {

    },
    post_phase: function() {

    },
    done_phase: function() {
        return;  // stack will call the next thing, I'm not going to 'call up'.
    }

});

Participant = Ice.$extend('Participant', {
    __init__: function() {
        this.$super();
    },
    get_effects: function() {
        return [];
    }
});

Effect = Ice.$extend('Effect', {
    __init__: function() {
        this.$super();

    }
});


Stack = Ice.$extend('Stack', {
    __init__: function(hoodoo) {
        // Begin a new stack.
        self.hoos = [];
        // I am always executing the last one, right?
    },
    push: function(hoo) {
        self.hoos.push(hoo);
    },
    pop: function(hoo) {
        if(self.hoos[self.hoos.length - 1] === hoo) {
            self.hoos.pop();
        }
    },
    // Run as many hoos as possible until it is blocked.  That's
    // potentially a lot, but also potentially very few (because of animation blocking)
    run: function() {
        var self = this;
        while(self.hoos.length) {
            var current = self.hoos[self.hoos.length - 1];
            if(current.blocked) {
                break;
            }
            if(current.phase === 'done') {
                self.pop(current);
                continue;
            }
            current.run();
        }
    }

});
