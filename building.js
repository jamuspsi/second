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

        self.upgrades = ko.observable(0);
        self.upgrade_currency = ko.observable(opts.upgrade_currency || 'money');
        self.upgrade_cost = ko.observable(opts.upgrade_cost || Math.pow(1000000, self.tier()-1));

        self.cached_integration_display = ko.observable(null);
        //self.integrates_to = ko.observable(0);

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
            'per_tick', 'per_click',
            'upgrades',
        ]);
    },
    key: Ice.kocomputed(function() {
        var self = this;
        return self.kind() + '.' + self.tier();
    }),
    id: Ice.kocomputed(function() {
        var self = this;
        return self.kind() + '.' + self.tier();
    }),

    upgrade_bonus: function() {
        var self = this;
        return 1 + game.upgrade_effectiveness() * self.upgrades();
    },
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
        if(self.id() === 'Programmer.1' && game.is_idle()) {
            classes += ' idle_mode';
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
        self.upgrades(self.upgrades() + 1);

        game.throttled_save();
    },
    manual_tick: function() {
        //self.click(db);

    },
    tick: function(ticks) {
        if(!ticks || isNaN(Number(ticks))) ticks = 1;
        var self = this;
        _.each(self.per_tick(), function(amt, currency) {
            var mult = self.get_multiplier('tick', currency);

            if(currency === 'money' || currency === 'bugs') {
                game[currency](game[currency]() + mult * amt * ticks * self.qty());
            } else {
                var bld = game.indexed_buildings()[currency];
                bld.qty(bld.qty() + mult * amt * ticks * self.qty());
            }
        });



    },
    click: function(num) {
        var self = this;
        game.total_clicks(game.total_clicks() + 1);

        var db_power = game.indexed_buildings()['DB.1'].db_click_power();
        var ticks = db_power;
        game.manual_ticks(game.manual_ticks() + ticks);
        game.total_ticks(game.total_ticks() + ticks);
        self.tick(ticks);

        if(self.is_peak()) {
            ticks *= (1+ game.bonuses().peak_bonus_tpc);

            var sub_ticks = Math.floor(ticks * game.bonuses()['peak_click_cascade']);
            game.bonus_ticks(game.bonus_ticks() + sub_ticks);
            game.total_ticks(game.total_ticks() + sub_ticks);
            self.prev.tick(sub_ticks);

        }

        if(self.id() === 'QA.1') {
            var choices = _.filter(game.buildings(), function(bld) {
                return bld.id() !== 'QA.1' && bld.id() !== 'DB.1' && bld.id() !== 'Programmer.1' && bld.qty();
            });
            var r = Rand.choose(choices);
            var sub_ticks = Math.floor(ticks * game.bonuses().qa_random_tpc_factor);
            game.bonus_ticks(game.bonus_ticks() + sub_ticks);
            game.total_ticks(game.total_ticks() + sub_ticks);
            // console.log("Giving ", r.id(), sub_ticks);
            r.tick(sub_ticks);

        }
        if(self.id() === 'DB.1') {
            var sub_ticks = Math.floor(ticks * game.bonuses().db1_tpc_factor);
            if(sub_ticks > 0) {
                var spread = _.filter(game.buildings(), function(bld) {
                    return bld.id() !== 'QA.1' && bld.id() !== 'DB.1' && bld.id() !== 'Programmer.1' && bld.qty();
                });
                _.each(spread, function(bld) {
                    bld.tick(sub_ticks);
                    game.bonus_ticks(game.bonus_ticks() + sub_ticks);
                    game.total_ticks(game.total_ticks() + sub_ticks);
                });

            }
        }
        if(self.id() === 'Programmer.1') {
            game.is_idle(true);
        } else {
            game.is_idle(false);
        }

    },
    is_peak: function() {
        var self = this;
        return (!self.next || self.next.qty() === 0) && self.qty();
    },
    get_multiplier: function(mode, currency) {
        var self = this;

        var mult = self.upgrade_bonus();
        var qa = game.indexed_buildings()['QA.' + self.tier()];
        mult *= qa.qa_bonus();
        if(self.is_peak()) {
            mult *= game.bonuses()['peak_production_factor'];
        }
        if(game.is_idle()) {
            mult *= game.bonuses()['prog1_idle_factor'];
        }
        if(currency === 'money' || currency === 'bugs') {
            mult *= game.bonuses()[currency];
        }
        return mult;

    },
    qa_bonus: function() {
        var self = this;

        if(self.qty() === 0) {
            return 1;
        }
        var log_base = game.bonuses().qa_log_base;
        var bonus = 1 + Math.log(self.qty() * self.upgrade_bonus()) / Math.log(log_base);
        bonus += game.bonuses().qa_add_row_bonus;
        bonus *= game.bonuses().qa_row_bonus_factor;
        return bonus;
    },
    db_click_power: function() {
        var self = this;
        if(!self.qty()) { return 1; }
        var qty = self.qty() * self.get_multiplier();
        var log_base = game.bonuses().db_log_base;
        var tpc = Math.max(1, Math.floor(Math.log(qty) / Math.log(log_base)));
        tpc += game.bonuses().db_tpc_add;
        tpc *= game.bonuses().db_tpc_factor;
        return tpc;
    },
    programmer_ticks_per_second: function() {
        var self = this;
        if(!self.qty()) { return 1; }
        var qty = self.qty() * self.get_multiplier();
        var log_base = game.bonuses().programmer_log_base;
        var tps = Math.max(1, Math.floor(Math.log(qty) / Math.log(log_base)));
        tps += game.bonuses().programmer_tps_add;
        tps *= game.bonuses().programmer_tps_factor;
        return tps;
    },
    // How many of this building converts to the next.
    ifactor: function() {
        var self = this;

        var tier = self.tier();

        return Math.pow(1000, self.tier()) * game.bonuses().conversion_ratio;

        if(self.kind() == 'IT') {
            return Math.pow(100, self.tier()+1);
        }
        return Math.pow(100, self.tier());

    },
    /*integration_count: function(qty) {
        var self = this;
        var ifactor = self.ifactor();

        if(!self.next) {
            return 0;
        }

        return Math.floor(qty / ifactor);
    },*/
    // How many of these will result from an integration
    integrate: function() {
        var self = this;
        if(!self.can_integrate()) {
            return;
        }
        var prev = self.prev;
        self.qty(self.integrates_to());
        while(prev) {
            prev.qty(0);
            prev = prev.prev;
        }
        if(!self.unlocked()) {
            self.unlocked(true);
            if(self.upgrade_currency() === 'money') {
                self.upgrades(self.upgrades() + game.bonuses()['free_money_upgrades']);
            }
            if(self.upgrade_currency() === 'bugs') {
                self.upgrades(self.upgrades() + game.bonuses()['free_bugs_upgrades']);
            }
            icea.report_unlocked_tier(self.kind(), self.tier());

            self.prev.qty(self.prev.ifactor() * game.bonuses()['unlock_conservation']);
        }
        return;
        // var ifactor = self.ifactor();
        // var next = self.next;

        // var will_integrate = self.integration_count(self.qty());
        // if(will_integrate === 0) return;

        // self.qty(0);

        // next.qty(next.qty() + will_integrate);
        // if(!next.unlocked()) {
        //     next.unlocked(true);
        //     icea.report_unlocked_tier(next.kind(), next.tier());
        // }


    },
    integrates_to: function() {
        var self = this;
        if(!self.can_integrate()) return null;
        var possible = self.total_possible();
        if(!possible) return null;

        if(!self.next) {
            return possible;
        }
        return Math.min(possible, self.ifactor());
    },
    // How many of these are possible to make from components.
    total_possible: function() {
        var self = this;
        var qty = self.qty();

        var prev = self.prev;
        var ifactor = 1;
        while(prev) {
            ifactor *= prev.ifactor();
            qty += prev.qty() / ifactor;
            prev = prev.prev;
        }
        qty = Math.floor(qty);
        return qty;
    },
    // Can make more of THIS building with previous ones.
    can_integrate: function() {
        var self = this;
        if(self.tier() === 1) {
            return false;
        }
        // if(!self.unlocked()) {
        //     return false;
        // }
        if(self.qty() >= self.ifactor()) return false;

        var prev = self.prev;
        if(!self.prev) {
            return false;
        }
        if(prev.total_possible() >= prev.ifactor()) {
            return true;
        }

        return false;


        // if(!self.next) {
        //     return self.integrates_to() > 0;
        // }
        // return self.integrates_to() > 0 && self.next.integrates_to() === 0;
    }
});

BUILDINGS = [
    {
        kind: 'IT',
        tier: 1,
        per_tick: {'money': 0.01}
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
        tier:1
        //per_tick: {'money': 100}
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
        if(kind === 'NOTIT') {
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
    'Programmer.4': 'Bjarne Stroustrup',
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
