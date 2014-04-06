MobInSlot = Renderer.$extend('MobInSlot', {
    template_html: function() {
        return [
            '<div class="mob_slot">',
                '<img id="portrait" class="portrait" />',

            '</div>'
        ].join('');
    },
    __init__: function() {
        var self = this;

        self.$super();

        self.mob = self.rendered;


    },
    render: function(mob, eargs) {
        console.log("MobInSlot rendering, mob=", mob);
        mob = mob || this.mob();

        if(!eargs || eargs.obs === mob.portrait_url) {
            this.$portrait.attr('src', mob.portrait_url());
        }
    }
});

// Is there a good reason to do this outside of the arena_slot
// frame?  I mean, technically this gets rendered onto it
// And I can't think of a lot of other things that would go there
// instead.

// The answer to this was that the arena slot's rendering is
// all bound to its slot, not the mob or more importantly
// the mob's properties, which means a whole lot of stuff
// would have to be resubscribed, potentially abusing the
// renderer pattern.  No, this turned out to be a good idea.