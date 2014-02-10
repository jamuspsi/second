Hoodoo = Ice.$extend('Hoodoo', {
    __init__: function() {
        this.$super();
        this.kind = 'BaseHoodoo';
        this.phase = 'starting';
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
