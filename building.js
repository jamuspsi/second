Building = Ice.$extend('Building', {
    __init__: function(opts) {
        var self = this;
        self.$super();
        self.tier = ko.observable(opts.tier || 1);
        self.kind = ko.observable(opts.kind || 'Shacks');
        self.name = ko.observable(opts.name || (BUILDING_NAMES[self.kind() + '.' + self.tier()]));

        self.unlocked = ko.observable(opts.unlocked || false);
        self.purchased = ko.observable(opts.qty || 0);
        self.qty = ko.observable(opts.qty || 0);
        self.cost = ko.observable(opts.cost || Math.pow(100, self.tier()));
        self.proof_cost = ko.observable(opts.proof_cost || 0);

        self.upgrade_currency = ko.observable(opts.upgrade_currency || 'money');
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
        if(self.qty() || self.unlocked()) {
            classes += ' has';
        }
        if(self.can_upgrade()) {
            classes += ' upgrade_ready';
        }
        if(self.can_integrate()) {
            classes += ' integration_ready';
        }
        return classes;
    },
    can_upgrade: Ice.kocomputed(function() {
        if(!lazy_game()) return;
        var self = this;
        if(!self.unlocked()) return false;
        return self.upgrade_cost() < game[self.upgrade_currency()]();
    }),
    upgrade: function() {
        var self = this;
        var upgrade_cost_factor = 1000;
        var cash_obs = game[self.upgrade_currency()];
        if(cash_obs() < self.upgrade_cost()) {
            return;
        }
        cash_obs(cash_obs() - self.upgrade_cost());
        self.upgrade_cost(self.upgrade_cost() * upgrade_cost_factor);
        self.upgrade_bonus(self.upgrade_bonus() + game.upgrade_effectiveness());

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
    click: function(num) {
        var self = this;
        _.each(self.per_click(), function(amt, currency) {
            var mult = self.get_multiplier('tick', currency) * num;
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
            var qa = game.indexed_buildings()['QA.' + self.tier()];
            return self.upgrade_bonus() * qa.qa_bonus();
        }
    },
    qa_bonus: function() {
        var self = this;

        if(self.qty() === 0) {
            return 1;
        }
        return 1 + Math.log(self.qty() * self.upgrade_bonus()) / log10;
    },
    programmer_click_power: function() {
        var self = this;
        if(!self.qty()) { return 1; }
        return Math.max(1, Math.floor(Math.log(self.qty() * self.get_multiplier()) / log10));
    },
    programmer_autoclicks_per_tick: function() {
        var self = this;
        if(!self.qty()) { return 0; }
        return Math.floor(Math.log(self.qty() * self.get_multiplier() * self.programmer_click_power()) / log10);
    },
    ifactor: Ice.kocomputed(function() {
        var self = this;
        if(self.kind() == 'IT') {
            return Math.pow(100, self.tier()+1);
        }
        return Math.pow(100, self.tier());

    }),
    integrate: function() {
        var self = this;
        var ifactor = self.ifactor();
        var next = self.next;


        if(!next) {
            return; // Or make a new one, later.
        }
        var will_integrate = self.integration_count(self.qty());
        if(will_integrate === 0) return;

        self.qty(0);

        next.qty(next.qty() + will_integrate);
        if(!next.unlocked()) {
            next.unlocked(true);
            icea.report_unlocked_tier(next.kind(), next.tier());
        }


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
        per_click: {'money': 1}
    },
    {
        kind: 'QA',
        tier: 1,
        upgrade_currency: 'bugs'
    },
    {
        kind: 'Programmer',
        tier: 1,
        upgrade_currency: 'bugs'
    },
    {
        kind: 'DB',
        tier:1,
        per_tick: {'money': 10}
    },
    {
        kind: 'User',
        tier: 1,
        per_tick: {'bugs': 1}
    }
];

_.each(['IT', 'QA', 'Programmer', 'DB', 'User'], function(kind) {
    for(var x=2;x<=9;x++) {
        var bld = {
            kind: kind,
            tier: x,
            per_click: {},
            per_tick: {},
            upgrade_currency: kind === 'Programmer' || kind === 'QA' ? 'bugs' : 'money'
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

BUILDING_NAMES = {
    'IT.1': 'Nephew',
    'IT.2': 'Rent-A-Geek',
    'IT.3': 'Manuals',
    'IT.4': 'Help Desk',
    'IT.5': 'IT Consultant',
    'IT.6': 'Server Admin',
    'IT.7': 'Cloud Architect',
    'IT.8': 'Tim Berners-Lee',
    'IT.9': 'Linus Torvalds',

    'QA.1': 'Red Pens',
    'QA.2': 'Print Preview',
    'QA.3': 'Frequent Backups',
    'QA.4': 'Peer Review',
    'QA.5': 'Requirements',
    'QA.6': 'CVS',
    'QA.7': 'SVN',
    'QA.8': 'Hg',
    'QA.9': 'Git',

    'Programmer.1': 'Will Wright',
    'Programmer.2': 'Richard Bartle',
    'Programmer.3': 'Peter Molyneux',
    'Programmer.4': 'Bjarne Strossup',
    'Programmer.5': 'Guido Van Rossum',
    'Programmer.6': 'Grace Hopper',
    'Programmer.7': 'Ada Lovelace',
    'Programmer.8': 'Nasir Gebelli',
    'Programmer.9': 'Alan Turing',

    'DB.1': 'Trapper Keeper',
    'DB.2': 'BDB',
    'DB.3': 'SQLite',
    'DB.4': 'MongoDB',
    'DB.5': 'NoSQL',
    'DB.6': 'MySQL',
    'DB.7': 'Postgres',
    'DB.8': 'Oracle',
    'DB.9': 'TSQL',

    'User.1': 'YouTube User',
    'User.2': 'Trained Monkey',
    'User.3': 'Forum Troll',
    'User.4': '"Enthusiast"',
    'User.5': 'John Q. Public',
    'User.6': 'Beta Tester',
    'User.7': 'OEM',
    'User.8': 'Casual Debugger',
    'User.9': 'Chaos Monkey'



};
