
SlotFrame = Renderer.$extend('SlotFrame', {
    template_html: function() {
        return [
            '<div class="arena_slot_frame">',
                //'<div id="portrait" class="portrait"></div>',
            '</div>'
        ].join('');
    },
    __init__: function(arena_frame, row, col) {
        this.arena_frame = arena_frame;
        this.row = row;
        this.col = col;

        this.$super();
        this.slot = this.rendered;

        //this.rendered.subChanged(this.onMobChange, this);

        this.mob_frame = MobInSlot(this);
    },
    setup_el: function() {
        this.$super();
        this.$el.text(this.row + ', ' + this.col);
    },
    listen: function(obj) {
        this.$super(obj);
        console.log("slotframe listening, obj is ", obj.pretty());
        obj.mob.subChanged(this.onMobChange, this);

    },
    unlisten: function(obj) {
        obj.mob.unsub(this);

        this.$super(obj);
    },
    onMobChange: function(slot, eargs) {
        // Tell my mob frame that it should render the
        // mob that's in my slot.
        console.log("My slot's mob changed to ", eargs.val);
        this.mob_frame.mob(eargs.val);

        if(eargs.val && !this.mob_frame.on_dom()) {
            // If I have a mob but my mob frame isn't on the
            // dom, put it on.
            console.log("Putting mob_frame onto el", this.mob_frame, this.$el);
            this.mob_frame.appendTo(this.$el);
        } else if (!eargs.val && this.mob_frame.on_dom()) {
            // If I don't have a mob anymore but my mob frame is
            // on the dom, take it off.
            console.log("Detaching mob_frame");
            this.mob_frame.detach();
        }
    }

});
