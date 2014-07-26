Building = Ice.$extend('Building', {
    __init__: function(opts) {
        var self = this;
        self.$super();
        self.tier = ko.observable(opts.tier || 1);
        self.kind = ko.observable(opts.kind || 'Shacks');
        self.name = ko.observable(opts.name || ('Lv' + self.tier() + ' ' + self.kind()));

        self.unlocked = ko.observable(opts.unlocked || false);
        self.purchased = ko.observable(opts.qty || 0);
        self.qty = ko.observable(opts.qty || 0);
        self.cost = ko.observable(opts.cost || Math.pow(100, self.tier()));
        self.proof_cost = ko.observable(opts.proof_cost || 0);

        self.upgrade_cost = ko.observable(opts.upgrade_cost || Math.pow(1000000, self.tier()-1));
        self.upgrade_bonus = ko.observable(1);

        self.integrates_to = ko.observable(0);

        self.cost_factor = ko.observable(opts.cost_factor || (1 + 0.05 * self.tier()));
        self.proof_cost_factor = ko.observable(opts.proof_cost_factor || 1.1);

        self.per_tick = ko.observable(opts.per_tick || {});
        self.per_click = ko.observable(opts.per_click || {});

    },
    __keys__: function() {
        return this.$super().concat([
            'qty', 'purchased',
            'cost', 'proof_cost',
            'cost_factor', 'proof_cost_factor',
            'per_tick', 'per_click'
        ]);
    },
    key: Ice.kocomputed(function() {
        var self = this;
        return self.kind() + '.' + self.tier();
    }),

    buy: function(amt) {
        var self = this;

        if(!self.unlocked()) {
            return;
        }

        // I'm thorough.
        if(!amt || amt < 1) {
            amt = 1;
        }
        amt = Math.floor(amt);

         //Reduce rendering overhead.

        var money = game.money();
        var bugs = game.bugs();
        var cost = self.cost();
        var proof_cost = self.proof_cost();
        var qty = self.qty();

        while(amt >= 1) {

            if(money < cost || bugs < proof_cost) {
                console.log("Cannot afford more.");
                return;
            }

            money -= self.cost();
            bugs -= self.proof_cost();

            cost *= self.cost_factor();
            proof_cost *= self.proof_cost_factor();

            qty += 1;
            amt -= 1;
        }

        game.money(money);
        game.bugs(bugs);
        self.qty(qty);
        self.cost(cost);
        self.proof_cost(proof_cost);
    },
    css: function() {
        var self = this;

        var classes = "";
        if(self.upgrade_cost() < game.money()) {
            classes += ' upgrade_ready';
        }
        if(self.can_integrate()) {
            classes += ' integration_ready';
        }
        return classes;
    },
    upgrade: function() {
        var self = this;
        var upgrade_cost_factor = 10;
        var upgrade_bonus_factor = 2;
        if(game.money() < self.upgrade_cost()) {
            return;
        }
        game.money(game.money() - self.upgrade_cost());
        self.upgrade_cost(self.upgrade_cost() * upgrade_cost_factor);
        self.upgrade_bonus(self.upgrade_bonus() + upgrade_bonus_factor);

        game.throttled_save();
    },
    tick: function() {
        var self = this;
        _.each(self.per_tick(), function(amt, currency) {
            var mult = self.get_multiplier('tick', currency);
            if(currency === 'money' || currency === 'bugs') {
                game[currency](game[currency]() + mult * amt * self.qty());
            } else {
                var bld = game.indexed_buildings()[currency];
                bld.qty(bld.qty() + mult * amt * self.qty());
            }
        });

    },
    click: function() {
        var self = this;
        _.each(self.per_click(), function(amt, currency) {
            var mult = self.get_multiplier('tick', currency);
            if(currency === 'money' || currency === 'bugs') {
                game[currency](game[currency]() + mult * amt * self.qty());
            } else {
                var bld = game.indexed_buildings()[currency];
                bld.qty(bld.qty() + mult * amt * self.qty());
            }
        });

    },
    get_multiplier: function(mode, currency) {
        var self = this;
        if(self.kind == 'QA') {
            return self.upgrade_bonus();
        } else {
            var qa = game.indexed_buildings()['QA.' + self.tier()];1;
            return self.upgrade_bonus() * qa.qa_bonus();
        }
    },
    qa_bonus: function() {
        var self = this;

        if(self.qty() == 0) return 1;
        return 1 + Math.log(self.qty() * self.upgrade_bonus()) / log10;
    },
    ifactor: Ice.kocomputed(function() {
        var self = this;
        return Math.pow(100, self.tier());
        //return Math.pow(100, Math.pow(2, self.tier()) - 1);
        return 100;
        return 100 * self.next.upgrade_bonus();
        return Math.pow(100, Math.pow(2, self.tier()) + 1);
    }),
    integrate: function() {
        var self = this;
        var ifactor = self.ifactor();
        //ifactor = 1000;
        var next = self.next;


        if(!next) {
            return; // Or make a new one, later.
        }
        var will_integrate = self.integration_count(self.qty());
        if(will_integrate === 0) return;

        self.qty(0);

        //self.qty(self.qty() - will_integrate * ifactor);
        next.qty(next.qty() + will_integrate);
        next.unlocked(true);


    },
    integration_count: function(qty) {
        var self = this;
        var ifactor = self.ifactor();

        if(!self.next) {
            return 0;
        }

        return Math.floor(qty / ifactor);
    },
    can_integrate: function() {
        var self = this;
        if(!self.next) {
            return self.integrates_to() > 0;
        }
        return self.integrates_to() > 0 && self.next.integrates_to() === 0;
    }
});

BUILDINGS = [
    {
        kind: 'IT',
        tier: 1,
        per_click: {'money': 1},
    },
    {
        kind: 'QA',
        tier: 1,
    },
    {
        kind: 'Programmer',
        tier: 1,
    },
    {
        kind: 'DBA',
        tier:1,
        per_tick: {'money': 10},
    }



];

_.each(['IT', 'QA', 'Programmer', 'DBA'], function(kind) {
    for(var x=2;x<=8;x++) {
        var bld = {
            kind: kind,
            tier: x,
            per_click: {},
            per_tick: {},
        };
        var prevkey = kind + '.' + (x-1);
        if(kind === 'IT') {
            bld.per_click[prevkey] = 1;
        } else {
            bld.per_tick[prevkey] = 1;
        }
        BUILDINGS.push(bld);
    }
});
