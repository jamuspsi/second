ArenaSlot = Ice.$extend('ArenaSlot', {
    __init__: function(arena, row, col) {
        this.$super();

        this.arena = ko.observable(arena);
        this.row = ko.observable(row);
        this.col = ko.observable(col);
        this.center = ko.observable(null);
        this.pos = ko.observable(null);

        this.mob = ko.observable(null);

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

