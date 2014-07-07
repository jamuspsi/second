ArenaFrame = Renderer.$extend('ArenaFrame', {
    template_html: function() {
        return [
        '<div class="arena_frame">',
            '<div id="slot_holder" class="slot_holder">',
            '</div>',
        '</div>'
        ].join('');
    },
    __init__: function() {
        this.slots = Arena.CreateSlots(this, SlotFrame);
        console.log(this.slots[3][3].pretty());
        this.all_slots = _.flatten(_.map(_.values(this.slots), function(d) {
            return _.values(d);
        }));

        this.$super();
        this.arena = this.rendered;


        this.rendered.subChanged(this.onArenaMutate, this);

    },
    setup_el: function() {
        var self = this;
        this.$super();
        console.log("Going to append.", this.all_slots);
        _.each(this.all_slots, function(slot) {
            console.log("Appending");
            slot.appendTo(self.$el);
        });
    },
    onAttach: function() {
        this.position_slots();
    },
});
