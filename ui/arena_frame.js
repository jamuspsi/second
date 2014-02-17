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
    position_slots: function() {
        var self = this;
        var my_size = new Point(this.$slot_holder.width(), this.$slot_holder.height());

        var center = my_size.center();
        console.log("Frame thinks it's at ", center);
        //Assuming all are roughly circular, then I can figure out how many I need to fit..
        var center_slot = self.slots[3][3];
        // We're going to walk out from center.
        p = function(here, dir, from) {
            if(here === center_slot)
                here.center = Point(0,0);
            else{
                var angle = {
                    'e': 0,
                    'ne': 60,
                    'nw': 120,
                    'w': 180,
                    'sw': 240,
                    'se': 300,
                }[dir];
                var square_size = 60;
                var spacing = 25;
                var dist = square_size + spacing;
                var offset = Point(
                    dist * Trig.cosd(angle),
                    dist * Trig.sind(angle) * -1 // positive is down.
                );
                //console.log("For direction ", dir, "I got offset ", offset);
                here.center = from.plus(offset);
            }
            _.each(CARDINALS, function(dir) {
                var neighbor = here[dir];
                if(!neighbor) {
                    return;
                }
                if(neighbor.center) {
                    return; // skip anything I've assigned already.
                }
                p(neighbor, dir, here.center);
            });


        };
        p(center_slot);
        _.each(self.all_slots, function(slot) {
            //console.log("Putting ", slot.row, " ", slot.col, " at ", slot.center);
            slot.$el.css(slot.center.plus(center).plus(-25, -25).lt());
        });
    },
    listen: function(arena) {
        console.log("Arena frame is listening.");
        this.$super(arena);
        var self = this;
        var arena = self.arena();
        _.each(self.all_slots, function(slot) {
            slot.slot(arena.slots[slot.row][slot.col]);
        });
    },
    unlisten: function(arena) {
        this.$super(arena);
        var self = this;
        _.each(self.all_slots, function(slot) {
            slot.slot(null);
        });
    },

    onArenaMutate: function(eargs) {

    }
});
