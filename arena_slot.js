ArenaSlot = Ice.$extend('ArenaSlot', {
    __init__: function(arena, row, col) {
        this.arena = arena;
        this.row = row;
        this.col = col;

        var self = this;

        _.each(CARDINALS, function(dir) {
            self[dir] = null;
        });
    }
});

CARDINALS = [
    'n',
    'ne',
    'e',
    'se',
    'sw',
    'w',
    'nw',
];

