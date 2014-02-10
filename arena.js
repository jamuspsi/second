Arena = Ice.$extend('Arena', {
    __init__: function() {
        this.$super();
        this.slots = Arena.CreateSlots(this, ArenaSlot);
    }
});

Arena.CreateSlots = function(arena, kls) {
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
            var here = kls(arena, row, col);
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
    return slots;

};

/*
         X X X X
        X X X X X
       X X X X X X
      X X X X X X X
       X X X X X X
        X X X X X
         X X X X

X X X X
X X X X X
X X X X X X
X X X X X X X
X X X X X X
X X X X X
X X X X


*/