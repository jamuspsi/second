Mob = Ice.$extend('Mob', {
    __init__: function() {

        this.$super();

        this.health = IceObservable(this, 100);
        this.max_health = IceObservable(this, 100);
        this.mana = new ManaPool();

        this.name = IceObservable(this, chance.first());
        this.portrait_url = IceObservable(this, '/images/badguy-white.png');
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

