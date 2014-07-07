Mob = Ice.$extend('Mob', {
    __init__: function() {

        this.$super();

        this.health = ko.observable(100);
        this.max_health = ko.observable(100);
        this.mana = new ManaPool();

        this.name = ko.observable(chance.first());
        this.portrait_url = ko.observable('/images/badguy-white.png');
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
    __init__: function(costs) {
        var self = this;
        costs = costs || {};

        _.each(COLORS, function(color) {
            self[color] = ko.observable(self, costs[color] || 0);
        });
    }
});

