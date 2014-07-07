Arena = Ice.$extend('Arena', {
    __init__: function() {
        var self = this;
        self.$super();

        self.size = ko.observable(Point(960, 600));

        self.slots = ko.observable(null);
        self.create_slots();
        self.position_slots();


    },
    all_slots: Ice.kocomputed(function() {
        var self = this;

        return _.flatten(_.map(self.slots(), function(cols, row) {
            return _.flatten(cols);
        }));
    }),
    position_slots: function() {
        var self = this;
        positioning_arena = this;
        //var my_size = new Point(this.$slot_holder.width(), this.$slot_holder.height());
        var my_size = self.size();

        var center = my_size.center();
        console.log("Frame thinks it's at ", center);
        //Assuming all are roughly circular, then I can figure out how many I need to fit..
        var center_slot = self.slots()[3][3];
        // We're going to walk out from center.
        p = function(here, dir, from) {
            //console.log("Setting position for ", here.row(), here.col());
            if(here === center_slot)
                here.center(Point(0,0));
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
                here.center(from.plus(offset));
            }
            _.each(CARDINALS, function(dir) {
                //console.log("Checking direction ", dir, "for slot ", here.row(), here.col());
                var neighbor = here[dir];
                if(!neighbor) {
                    return;
                }
                if(neighbor.center()) {
                    return; // skip anything I've assigned already.
                }
                p(neighbor, dir, here.center());
            });


        };
        p(center_slot);
        _.each(self.all_slots(), function(slot) {
            //console.log("Putting ", slot.row, " ", slot.col, " at ", slot.center);
            slot.pos(slot.center().plus(center).plus(-25, -25));
        });
    },
    create_slots: function() {
        var self = this;

        var slots = {};

        for(var row = 0; row < 7; row += 1) {
            var len = {
                0: 4,
                1: 5,
                2: 6,
                3: 7,
                4: 6,
                5: 5,
                6: 4
            }[row];

            for(var col = 0; col < len; col += 1) {
                var here = ArenaSlot(self, row, col);
                if(! slots[row]) {
                    slots[row] = {};
                }
                slots[row][col] = here;

                // Attach to whatever I can.
                // east, se, sw never exist at this stage.
                // Attach west.
                if(col > 0) {
                    here.w = slots[row][col-1];
                    here.w.e = here;
                }
                // Attach nw
                if(row === 0) {
                    // Top row has no nw.
                } else if(row < 4 && col > 0) {
                    // In the top half, nw is column -1
                    here.nw = slots[row-1][col-1];
                    here.nw.se = here;
                } else if(row >= 4) {
                    // In the bottom half, nw is same column.
                    here.nw = slots[row-1][col];
                    here.nw.se = here;
                }

                // Attach ne
                if(row === 0) {
                    // Top row has no ne.
                } else if(row < 4) {
                    // In the top half, ne is same column assuming that row has one.
                    here.ne = slots[row-1][col] || null;
                    if(here.ne) {
                        here.ne.sw = here;
                    }
                } else if(row >= 4) {
                    // In the bottom half, ne is column + 1, and always exists.
                    here.ne = slots[row-1][col + 1];
                    here.ne.sw = here;
                }
            }
        }
        self.slots(slots);
    }

});
