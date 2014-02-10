Mob = Ice.$extend('Mob', {
    __init__: function() {

        this.health = IceObservable(this, 100);
        this.max_health = IceObservable(this, 100);
        this.mana = new ManaPool();

        this.name = IceObservable(this, chance.first());
    }
});

COLORS = [
    'white',
    'red',
    'green',
    'black',
    'blue',
    'yellow'
];

ManaPool = Ice.$extend('ManaPool', {
    __init__: function() {
        var self = this;
        _.each(COLORS, function(color) {
            self[color] = IceObservable(self, 100);
        });
    }
});