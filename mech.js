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

But ticker shouldn't be a mech- that's extra exceptional behavior for no reason.
I also think the pre and post steps don't qualify as mechs on their own.  They can be standardized
steps made with a generator

Oops.  Event dispatch HAS to go on the stack somehow, or at least be re-entrant.  Doh.
*/

Mech = Query.$extend('Mech', {
    __init__: function(starting_phase) {
        this.$super();
        var self = this;


        this.phase = ko.observable(starting_phase);

        this.redirected = null;

        this.stack = null; // Stack will put this on me.
        this.blocking = false;
        this.stale = true;
        this.killed = false;
        this.complete = false;
        this.responders_by_phase = {};

    },

    run: function() {
        var self = this;
        self.stale = false;
        var current_phase = self.phase();

        self.announce(current_phase);

        if(self.phase() === current_phase && !self.killed) {
            _.bind(self[self.phase()], self)();
        }
    },
    announce: function() {
        var self = this;

        var hook_name = self.$class.$name + '.' + self.current_phase();
        return self.$super(hook_name);
    },
    fire_event: function(participant, hook_name, hook) {
        var self = this;
        if(participant.fired_hooks[hook_name]) {
            return;
        }
        participant.fired_hooks[hook_name] = 1;
        self.
        hook(self);
    },



});

Query = Ice.$extend('Query', {
 __init__: function() {
        this.$super();
        var self = this;
    },

    run: function() {
        var self = this;

        self.announce();
    },
    announce: function(hook_name) {
        var self = this;
        self.stop_announcing = false;

        if(!hook_name) {
            hook_name = self.$class.$name;
        }

        var participants = self.get_deep_participants();
        for(var x=0; x< participants.length; x++) {
            var p = participants[x];
            if(p[hook_name]) {
                self.fire_event(p, hook_name, _.bind(p[hook_name], p));
            }
            if(self.killed || self.stop_announcing) {
                return;
            }
        }
    },
    fire_event: function(participant, hook_name, hook) {
        var self = this;
        hook(self);
    },
    participants: function() {
        return [];
    },
    deep_participants: function() {
        var self = this;
        return _.uniq(_.flatten(
            _.map(self.participants(), function(p) {
                return p.deep_participants();
            })
        ));
    }

});

Participant = Ice.$extend('Participant', {
    __init__: function() {
        this.$super();
    },
    deep_participants: function(participants) {
        var self = this;
        if(participants === undefined) {
            participants = [];
        }

        if(!_.contains(participants, self)) {
            participants.push(self);
        }
        _.each(self.sub_participants(), function(sub) {
            sub.deep_participants(participants);
        });

        return deep_participants;

    },
    sub_participants: function() {
        return [];
    },
});

Effect = Ice.$extend('Effect', {
    __init__: function() {
        this.$super();

    }
});


Stack = Ice.$extend('Stack', {
    __init__: function() {
        // Begin a new stack.
        self.mechs = [];
        // I am always executing the last one, right?
    },
    push: function(mech) {
        self.mechs.push(mech);
    },
    pop: function(mech) {
        if(self.mechs[self.mechs.length - 1] === mech) {
            self.mechs.pop();
        }
    },
    // Run as many mechs as possible until it is blocked.  That's
    // potentially a lot, but also potentially very few (because of animation blocking)
    run: function() {
        // This can be called with _.defer to resume the stack.

        var self = this;
        while(self.mechs.length) {
            var current = self.mechs[self.mechs.length - 1];
            if(current.killed || current.complete) {
                self.pop(current);
                continue;
            }
            if(current.blocked || !current.stale) {
                break;
            }
            current.run();
        }
    }

});

Conductor = Ice.$extend('Conductor', {
    __init__: function() {
        var self = this;
        self.$super();
        self.next_scheduled_task = null;
        self.game_timer = 0;
        self.stack = Stack();

    },
    tick: function(ms) {
        var self = this;

        // Time doesn't move while stuff's on the stack.
        if(self.stack.mechs.length) {
            self.stack.run();
            return;
        }


        var nt = self.next_scheduled_task;
        while(nt && nt.canceled) {
            nt = self.next_scheduled_task = nt.next;
        }

        if(!nt) {
            return;
        }

        var next_in = nt.run_at - self.game_timer;
        if(next_in < ms) {
            // Clamp the timer.  A tick can only be as long as the next scheduled thing
            // to happen.
            ms = next_in;
        }

        self.game_timer += ms;

        self.next_scheduled_task = nt.next;
        self.stack.push(nt.mech);
        self.stack.run();
    },
    schedule: function(task, ms) {
        var self = this;

        task.run_at = self.game_timer + ms;
        if(!self.next_scheduled_task || task.run_at < self.next_scheduled_task.run_at) {
            task.next = self.next_scheduled_task;
            self.next_scheduled_task = task;
            return;
        }
        var walk = self.next_scheduled_task;

        while(walk.next && walk.next.run_at <= task.run_at) {
            walk = walk.next;
        }
        task.next = walk.next;
        walk.next = task;
    }
});

Task = Ice.$extend('Task', {
    __init__: function() {
        var self = this;
        self.$super();

        self.run_at = null;
        self.next = null;
        self.mech = null;
    }
});

