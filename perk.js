Perk = Ice.$extend('Perk', {
    __init__: function(opts) {
        var self = this;
        this.$super();

        self.opts = opts;

        self.kind = ko.observable(opts.kind);
        self.tier = ko.observable(opts.tier);
        self.name = ko.observable(opts.name);
        self.max_level = ko.observable(opts.max_level);
        self.mode = ko.observable(opts.mode);
        self.format = opts.format;
        self.bonus = opts.bonus;
        self.bonus_attr = opts.bonus_attr;
        self.level = ko.observable(0);

    },
    id: function() {
        var self = this;
        return [self.kind(), self.tier()].join('.');
    },
    apply: function(bonuses, level) {
        var self = this;
        var bonus = self.bonus(level);

        if(self.mode() === 'add' || !self.mode()) {
            bonuses[self.bonus_attr] += bonus;
        }
        if(self.mode() === 'multiply') {
            bonuses[self.bonus_attr] *= bonus;
        }

    },
    current_bonus: function() {
        var self = this;
        return self.bonus(self.level());
    },
    next_bonus: function() {
        var self = this;
        if(self.max_level() && self.level() >= self.max_level()) return self.bonus(self.level());

        return self.bonus(self.level() + 1) - self.bonus(self.level());
    },
    format_html: function(num) {
        var self = this;
        if(self.format === 'percent') {
            return Math.floor(num * 100) + '%';
        } else if(self.format === 'percent1') {
            return Math.floor((num -1) * 100) + '%';
        } else if(self.format === 'multiplier') {
            return num.toFixed(2) + 'x';
        } else if(num % 1) {
            return num.toFixed(2);
        } else {
            return num;
        }
    },
    current_bonus_html: function() {
        var self = this;
        return self.format_html(self.current_bonus());
    },
    next_bonus_html: function() {
        var self = this;
        if(self.max_level() && self.level() >= self.max_level()) return 'MAX';

        var next_bonus = self.next_bonus();
        return (next_bonus > 0 ? '+' : '') + self.format_html(self.next_bonus());
    },
    clone: function() {
        var self = this;
        return Perk(self.opts);
    },
    css: function() {
        var self = this;
        var classes = "";
        if(self.level()) {
            classes += ' has';
        }
        if(game.unspent_prestige() >= game.next_perk_cost()) {
            classes += ' upgrade_ready';
        }

        return classes;
    },
    calc_level: function() {
        var self = this;
        return self.level() || 1;
    }
});
PERKS = {};

function add_perk(opts) {
    var perk = Perk(opts);
    PERKS[perk.id()] = perk;
}

function base_bonuses() {
    return {
        money: 1,
        free_money_upgrades: 0,
        prestige_per_tier: 0,
        peak_click_cascade: 0,
        conversion_ratio: 1,

        qa_log_base: 5,
        qa_add_row_bonus: 0,
        qa_row_bonus_factor: 1,
        peak_production_factor: 1,
        qa_random_tpc_factor: 0,

        programmer_log_base: 10,
        programmer_tps_add: 0,
        programmer_tps_factor: 1,
        peak_bonus_tps: 0,
        prog1_idle_factor: 1,

        db_log_base: 5,
        db_tpc_add: 0,
        db_tpc_factor: 1,
        peak_bonus_tpc: 0,
        db1_tpc_factor: 0,

        bugs: 1,
        free_bugs_upgrades: 0,
        prestige_factor: 1,
        peak_self_creation: 0,
        unlock_conservation: 0,

    };
}

identity_bonus = function(level) { return level; };
pow2 = function(level) { return Math.pow(2, level); };
per_level = function(x) { return function(level) { return x * level; }; };

add_perk({
    kind: 'IT',
    tier: 1,
    name: 'Extra Money',
    max_level: null,
    bonus_attr: 'money',
    mode: 'multiply',
    format: 'multiplier',
    bonus: pow2
});

add_perk({
    kind: 'IT',
    tier: 2,
    name: 'Free Upgrades',
    max_level: 5,
    bonus_attr: 'free_money_upgrades',
    bonus: per_level(1)
});
add_perk({
    kind: 'IT',
    tier: 3,
    name: 'More Prestige',
    max_level: null,
    bonus_attr: 'prestige_per_tier',
    bonus: per_level(0.01)
});
add_perk({
    kind: 'IT',
    tier: 4,
    name: 'Cascading Clicks',
    max_level: null,
    bonus_attr: 'peak_click_cascade',
    bonus: per_level(0.1)
});
add_perk({
    kind: 'IT',
    tier: 5,
    name: 'Lower Conversion Ratio',
    max_level: 20,
    bonus_attr: 'conversion_ratio',
    format: 'percent',
    bonus: per_level(-0.01)

});

add_perk({
    kind: 'QA',
    tier: 1,
    name: 'Lower QA Log Scale',
    max_level: 5,
    bonus_attr: 'qa_log_base',
    bonus: per_level(-0.3)
});
add_perk({
    kind: 'QA',
    tier: 2,
    name: '+Row Bonus',
    max_level: null,
    bonus_attr: 'qa_add_row_bonus',
    bonus: per_level(2)

});
add_perk({
    kind: 'QA',
    tier: 3,
    name: 'Row Bonus Bonus',
    max_level: null,
    bonus_attr: 'qa_row_bonus_factor',
    format: 'percent',
    bonus: per_level(0.5)
});
add_perk({
    kind: 'QA',
    tier: 4,
    name: 'Peak Production Bonus',
    max_level: null,
    format: 'percent',
    bonus_attr: 'peak_production_factor',
    bonus: per_level(0.5)
});
add_perk({
    kind: 'QA',
    tier: 5,
    name: 'Distributed Growth',
    max_level: null,
    bonus_attr: 'qa_random_tpc_factor',
    format: 'percent',
    bonus: per_level(0.5)
});


add_perk({
    kind: 'Programmer',
    tier: 1,
    name: 'Lower Programmer Log Scale',
    max_level: 10,
    bonus_attr: 'programmer_log_base',
    bonus: per_level(-0.5)
});
add_perk({
    kind: 'Programmer',
    tier: 2,
    name: '+Ticks/Second',
    max_level: null,
    bonus_attr: 'programmer_tps_add',
    bonus: per_level(1)
});
add_perk({
    kind: 'Programmer',
    tier: 3,
    name: 'Ticks/Second Bonus',
    max_level: null,
    bonus_attr: 'programmer_tps_factor',
    format: 'percent',
    bonus: per_level(0.5)
});
add_perk({
    kind: 'Programmer',
    tier: 4,
    name: 'Peak Ticks/Second Bonus',
    max_level: null,
    bonus_attr: 'peak_bonus_tps',
    format: 'percent',
    bonus: per_level(0.5)
});
add_perk({
    kind: 'Programmer',
    tier: 5,
    name: 'Idle Mode',
    max_level: null,
    bonus_attr: 'prog1_idle_factor',
    format: 'percent',
    bonus: per_level(0.5)
});


add_perk({
    kind: 'DB',
    tier: 1,
    name: 'Lower DB Log Scale',
    max_level: 5,
    bonus_attr: 'db_log_base',
    bonus: per_level(-0.3)
});
add_perk({
    kind: 'DB',
    tier: 2,
    name: '+Ticks/Click',
    max_level: null,
    bonus_attr: 'db_tpc_add',
    bonus: per_level(1)
});
add_perk({
    kind: 'DB',
    tier: 3,
    name: 'Ticks/Click Bonus',
    max_level: null,
    bonus_attr: 'db_tpc_factor',
    format: 'percent',
    bonus: per_level(0.5)
});
add_perk({
    kind: 'DB',
    tier: 4,
    name: 'Peak Ticks/Click Bonus',
    max_level: null,
    bonus_attr: 'peak_bonus_tpc',
    format: 'percent',
    bonus: per_level(0.5)
});
add_perk({
    kind: 'DB',
    tier: 5,
    name: 'Ticks/Tick',
    max_level: 20,
    bonus_attr: 'db1_tpc_factor',
    format: 'percent',
    bonus: per_level(0.05)
});


add_perk({
    kind: 'User',
    tier: 1,
    name: 'Buggy',
    max_level: null,
    bonus_attr: 'bugs',
    format: 'multiplier',
    mode: 'multiply',
    bonus: pow2
});
add_perk({
    kind: 'User',
    tier: 2,
    name: 'Free Bugs Upgrades',
    max_level: 5,
    bonus_attr: 'free_bugs_upgrades',
    bonus: per_level(1),
});
add_perk({
    kind: 'User',
    tier: 3,
    name: 'Prestige Bonus',
    max_level: null,
    bonus_attr: 'prestige_factor',
    format: 'percent',
    bonus: per_level(0.5)
});
add_perk({
    kind: 'User',
    tier: 4,
    name: 'Peak Growth',
    max_level: null,
    bonus_attr: 'peak_self_creation',
    bonus: function(level) {
        if(!level) {
            return 0;
        }
        return Math.pow(level, 2);
    }
});
add_perk({
    kind: 'User',
    tier: 5,
    name: 'Rounding Error',
    max_level: null,
    bonus_attr: 'unlock_conservation',
    format: 'percent',
    bonus: per_level(0.5)
});


