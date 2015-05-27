$(function(){
    /* https://gist.github.com/AndreasBriese/1670507 */
    _.mixin({
        sum: function(obj, iterator, context) {
        if (!iterator && _.isEmpty(obj)) return 0;
        var result = 0;
        if (!iterator && _.isArray(obj)){
            for(var i=obj.length-1;i>-1;i-=1){
                result += obj[i];
            }
          return result;
        }
        _.each(obj, function(value, index, list) {
            var computed = iterator ? iterator.call(context, value, index, list) : value;
            result += computed;
        });
        return result;
      }
    });

    ShowFullErrorStacks();
    MonkeypatchKoTemplateBinding();

    loadExternalKnockoutTemplates('/kot/', function() {


        sound_manifest = [
        ];

        createjs.Sound.registerManifest(sound_manifest);

        settings = new Settings();
        settings.load();

        icea = Analytics();

        lazy_game = ko.observable(null);
        game = Second.start_game();
        lazy_game(game);

        var body = $('#game');

        ko.applyBindings( window.game, body[0]);


    });


});

log10 = Math.log(10);
log100 = Math.log(100);
log1000 = Math.log(1000);
NUMBER_SUFFIXES = ["K", "M", "B", "T", "Qa", "Qt", "Sx", "Sp", "Oc", "Nn",
                   "Dc", "UDc", "DDc", "TDc", "QaDc", "QtDc", "SxDc", "SpDc", "ODc", "NDc",
                   "Vi", "UVi", "DVi", "TVi", "QaVi", "QtVi", "SxVi", "SpVi", "OcVi", "NnVi",
                   "Tg", "UTg", "DTg", "TTg", "QaTg", "QtTg", "SxTg", "SpTg", "OcTg", "NnTg",
                   "Qd", "UQd", "DQd", "TQd", "QaQd", "QtQd", "SxQd", "SpQd", "OcQd", "NnQd",
                   "Qq", "UQq", "DQq", "TQq", "QaQq", "QtQq", "SxQq", "SpQq", "OcQq", "NnQq",
                   "Sg"
];
PERK_BASE_COST = 0.3;

function test_perks() {
    var perks = {};
    _.each(PERKS, function(v,i) {
        perks[i] = 10;
    });
    game.perks(perks);
    game.prestige(20);
    PERK_BASE_COST = 0.0000000001;
    game.apply_perks();
}

function format_number(num) {
    if(num === 0) {
        return 0;
    }
    if(num < 10 && num % 1) {
        return num.toFixed(2);
    }
    if(num < 1000) {
        return Math.floor(num);
    }
    var digits = Math.floor(Math.log(num) / log10 + 0.1);
    var suffix = NUMBER_SUFFIXES[Math.floor(digits / 3)-1];
    var smaller = (num / Math.pow(10, Math.floor(digits/3)*3));
    var fmted;
    if(smaller >= 100) fmted = smaller.toFixed(0);
    else if(smaller >= 10) fmted = smaller.toFixed(1);
    else fmted = smaller.toFixed(2);
    return fmted + "<span class='suffix'>"+suffix+"</span>";


}

Analytics = Ice.$extend('Analytics', {
    __init__: function() {
        var self = this;
        self.$super();
        self.ticks = 0;
        self.clicks = 0;
        self.pulse_interval = window.setInterval(_.bind(self.pulse, self), 60000);
        self.pulse();
    },
    pulse: function(category, action, label, value) {
        var self = this;
        self.report_idle();
    },

    /*
        'gameplay', 'unlocked_tier', kind, tier
        'gameplay', 'prestige', 'earned_bonus', prestige_preview
        'gameplay', 'checkin', 'idle', 1
    */
    send_event: function(category, action, label, value) {
        try {
            if(!ga) {
                return;
            }
            ga('send', 'event', category, action, label, value||1);

        } catch(e) {}
    },
    report_unlocked_tier: function(kind, tier) {
        var self = this;
        self.send_event('unlocked_tier', kind, 'tier_' + tier, 1);
    },
    report_idle: function() {
        var self = this;
        self.send_event('gameplay', 'checkin', 'idle', 1);
    },
    report_prestige: function(earned_bonus) {
        var self = this;
        self.send_event('gameplay', 'prestige', 'earned_bonus', Math.floor(earned_bonus*100));
    }

});

Second = Ice.$extend('Second', {
    __init__: function(blob) {
        var self = this;

        self.$super();
        self.buildings = ko.observableArray([]);
        self.money = ko.observable(100);
        self.bugs = ko.observable(0);
        self.upgrade_effectiveness = ko.observable(1);
        self.total_clicks = ko.observable(0);
        self.total_ticks = ko.observable(0);
        self.manual_ticks = ko.observable(0);
        self.time_ticks = ko.observable(0);
        self.bonus_ticks = ko.observable(0);

        self.is_idle = ko.observable(false);

        self.hide_conversions = ko.observable(false);

        self.bonuses = ko.observable(base_bonuses());
        self.prestige = ko.observable(0);
        self.perks = ko.observable({});

        self.next_perk_cost = ko.observable(PERK_BASE_COST);
        self.unspent_prestige = ko.observable(0);
        self.perk_objects = ko.observable({});

        self.load_game(blob);
        self.tick_interval = window.setInterval(_.bind(self.tick, self), 500);
        self.refresh_interval = window.setInterval(_.bind(self.refresh_integrate_display, self), 500);
        self.autosave_interval = window.setInterval(_.bind(self.save_game, self), 60000);
        self.autoclickinterval = window.setInterval(_.bind(self.autoclick, self), 1000);

        self.open_pane = ko.observable('production');
    },
    indexed_buildings: Ice.kocomputed(function() {
        var self = this;
        return _.indexBy(self.buildings(), function(bld) {
            return bld.key();
        });
    }),
    buildings_by_tier: Ice.kocomputed(function() {
        var self = this;
        return _.sortBy(self.buildings(), function(bld) {
            return 1 * bld.tier();
        });
    }),
    buy_all_upgrades: function() {
        var self = this;
        _.each(self.buildings_by_tier(), function(bld) {
            if(bld.can_upgrade()) {
                bld.upgrade();
            }
        });
    },
    integrate_highest: function() {
        var self = this;
        _.each(self.kinds(), function(kind) {
            var buildings = _.filter(self.buildings(), function(bld) {
                return bld.kind() === kind && bld.can_integrate();
            });
            if(!buildings.length) {
                return; // Next kind.
            }
            buildings = _.sortBy(buildings, function(bld) {
                return -1 * bld.tier();
            });
            var bld = buildings[0];
            bld.integrate();


            var highest = _.find(self.tiers().slice().reverse(), function(tier) {

            });
        });
    },
    button_click: function(num) {
        var self = this;
        if(!num) {
            var prog = self.indexed_buildings()['DB.1'];
            num = prog.db_click_power();
        }
        self.total_clicks(self.total_clicks() + num);
        click_each = function(bld) { bld.click(num); };

        //for(var x=0;x<num;x++) {
            _.each(self.buildings_by_tier(), click_each);
        //}
    },
    tick: function() {
        var self = this;
        var ticks = self.indexed_buildings()['Programmer.1'].programmer_ticks_per_second();
        // self.total_ticks(self.total_ticks() + 1);
        _.each(self.buildings_by_tier(), function(bld) {
            var bld_ticks = ticks;
            if(bld.is_peak()) {
                bld_ticks = Math.floor(bld_ticks * (1 + self.bonuses().peak_bonus_tps));
            }
            bld.tick(bld_ticks);

            self.total_ticks(self.total_ticks() + bld_ticks);
            console.log("Adding time_ticks", bld_ticks);
            self.time_ticks(self.time_ticks() + bld_ticks);
            // console.log("Ticking ", ticks);
            if(bld.is_peak()) {
                bld.qty(bld.qty() + self.bonuses().peak_self_creation);
            }
        });


    },
    autoclick: function() {
        var self = this;
        return;  //no such thing anymore.

        var prog = self.indexed_buildings()['Programmer.1'];
        var db = self.indexed_buildings()['DB.1'];
        //This got exponential REAL fast.
        //var autoclicks = prog.programmer_autoclicks_per_tick() * prog.programmer_click_power();
        // var autoclicks = prog.programmer_autoclicks_per_tick() * db.db_click_power();
        var autoclicks = prog.programmer_autoclicks_per_tick();
        if(autoclicks) {
            self.button_click(autoclicks);
        }
    },
    money_per_click: function() {
        var self = this;
        var it = self.indexed_buildings()['IT.1'];
        return format_number(it.qty() * it.get_multiplier('click', 'money') * self.bonuses()['money']);
    },
    ticks_per_second: function() {
        var self = this;
        return self.indexed_buildings()['Programmer.1'].programmer_ticks_per_second();
    },
    money_per_second: function() {
        var self = this;
        return self.ticks_per_second() * self.money_per_tick();
    },
    money_per_tick: function() {
        var self = this;

        var it = self.indexed_buildings()['IT.1'];
        return it.qty() * 0.01 * it.get_multiplier('click', 'money') * self.bonuses()['money'];
    },
    bugs_per_second: function( ){
        var self = this;
        return self.ticks_per_second() * self.bugs_per_tick();
    },
    bugs_per_tick: function() {
        var self = this;

        var it = self.indexed_buildings()['User.1'];
        return it.qty() * 1 * it.get_multiplier('click', 'bugs');

    },
    integrate: function(target) {
        var self = this;
        target.integrate();
        /*_.each(self.buildings_by_tier(), function(bld) {
            if(target && bld.tier() >= target.tier()) {
                return;
            }
            if(target && bld.kind() != target.kind()) {
                return;
            }
            bld.integrate();
        });*/
        self.refresh_integrate_display();
        game.throttled_save();
    },
    refresh_building_links: function() {
        var self = this;
        _.each(self.buildings(), function(bld) {
            bld.prev = self.indexed_buildings()[bld.kind() + '.' + (bld.tier()-1)];
            bld.next = self.indexed_buildings()[bld.kind() + '.' + (bld.tier()+1)];
        });
    },
    kinds: Ice.kocomputed(function() {
        var self = this;
        if(!self.buildings().length) {
            return [];
        }
        return _.uniq(_.map(self.buildings(), function(bld) {
            return bld.kind();
        }));
    }),
    tiers: Ice.kocomputed(function() {
        var self = this;
        if(!self.buildings().length) {
            return 0;
        }
        return _.range(1, _.max(self.buildings(), function(b) {
                                return b.tier();
                            }).tier() + 1
        );
    }),

    refresh_integrate_display: function() {
        var self = this;
        _.each(self.kinds(), function(kind) {
            _.each(self.tiers(), function(tier) {
                var bld = self.indexed_buildings()[kind + '.' + tier];
                var integrates_to = bld.integrates_to();
                if(!integrates_to) {
                    bld.cached_integration_display(null);
                } else {
                    bld.cached_integration_display(bld.integrates_to() - bld.qty());
                }
                // if(!bld) return;
                // if(!bld.prev) {
                //     bld.integrates_to(0);
                //     return;
                // }

                // var willbuild = bld.prev.integration_count(bld.prev.qty() + bld.prev.integrates_to());
                // if(willbuild) {
                //     //bld.prev.integrates_to(0);
                // }

                // bld.integrates_to(willbuild);


            });
        });
    },
    can_prestige: Ice.kocomputed(function() {
        var self = this;
        if(!self.buildings) { return false; }
        return !!_.sum(self.buildings(), function(bld) {
            return bld.tier() >= 4 ? bld.qty() : 0;
        });
    }),
    prestige_for_tier: function(tier) {
        if(tier < 4) return 0;
        var this_tier = Math.pow(tier-2, 2) * 0.05;
        var prev_tier = 0;
        if(tier > 4)
            prev_tier = Math.pow(tier-3, 2) * 0.05;

        return this_tier - prev_tier + game.bonuses()['prestige_per_tier'];
    },
    prestige_preview: Ice.kocomputed(function() {
        var self = this;

        if(!self.can_prestige()) {
            return 0;
        }

        var total_prestige = 0;
        var tiers_reached = {};
        _.each(self.buildings(), function(bld) {
            if(!bld.qty() || bld.tier() < 4) return;
            total_prestige += self.prestige_for_tier(bld.tier());
        });

        total_prestige *= game.bonuses()['prestige_factor'];
        total_prestige = Math.floor(total_prestige * 100) / 100;
        return total_prestige;
    }),


    throttled_save: function() {
        var self = this;
        _.debounce(_.bind(self.save_game, self), 1000)();
    },
    save_game: function() {
        return;
        var self = this;

        var blob = {
            save_version: Second.save_version,
            building_qtys: {},
            money: self.money(),
            bugs: self.bugs(),
            upgrade_effectiveness: self.upgrade_effectiveness(),
            total_ticks: self.total_ticks(),
            total_clicks: self.total_clicks(),
            time_ticks: self.time_ticks(),
            manual_ticks: self.manual_ticks(),
            bonus_ticks: self.bonus_ticks(),
            hide_conversions: self.hide_conversions(),

            buildings: {}
        };
        _.each(self.buildings(), function(bld) {
            blob.buildings[bld.key()] = {
                qty: bld.qty(),
                unlocked: bld.unlocked(),
                upgrade_cost: bld.upgrade_cost(),
                upgrades: bld.upgrades()
            };
        });

        var json = JSON.stringify(blob);
        localStorage['Second.current_game'] = json;
        return blob;
    },
    load_game: function(blob) {
        var self = this;
        var new_buildings = [];
        _.each(BUILDINGS, function(bld) {
            new_buildings.push(Building(bld));
        });
        self.buildings(new_buildings);
        self.refresh_building_links();

        var new_game_blob = Second.new_game_blob();

        _.each(['money', 'bugs', 'upgrade_effectiveness', 'total_clicks', 'total_ticks', 'hide_conversions', 'manual_ticks', 'time_ticks', 'bonus_ticks'], function(attr) {
            if(blob[attr] === undefined) {
                blob[attr] = new_game_blob[attr];
            }
            console.log("Loading ", attr);
            self[attr](blob[attr]);
        });

        _.each(blob.buildings || {}, function(bld_blob, key) {
            var bld = self.indexed_buildings()[key];
            if(!bld) return;
            _.each(['qty', 'upgrade_cost', 'upgrades', 'unlocked'], function(attr) {
                if(bld_blob[attr] !== undefined) {
                    bld[attr](bld_blob[attr]);
                }
            });
        });

        if(self.indexed_buildings()['DB.2'].qty() === 0) {
            self.indexed_buildings()['DB.2'].qty(1); //oops
        }
        if(!self.indexed_buildings()['DB.1'].unlocked()) {
            self.indexed_buildings()['DB.1'].unlocked(true); //oops
        }

        self.perks(blob.perks);
        self.prestige(blob.prestige);
        self.apply_perks();
    },
    new_game_plus: function() {
        var self = this;
        if(!self.can_prestige()) {
            window.alert("You can't prestige until you've unlocked something in the 4th tier.");
            return;
        }
        if(!window.confirm("Prestiging now will cause you to lose ALL your current items and upgrades, but will permanently add " + self.prestige_preview().toFixed(2) +"x to every upgrade you buy.\n\nPress OK to prestige and gain the bonus, Cancel to keep playing for now.")) {
            return;
        }

        icea.report_prestige(self.prestige_preview());

        var blob = JSON.parse(JSON.stringify(Second.new_game_blob()));
        blob.total_clicks = self.total_clicks();
        blob.total_ticks = self.total_ticks();
        blob.time_ticks = self.time_ticks();
        blob.manual_ticks = self.manual_ticks();
        blob.bonus_ticks = self.bonus_ticks(),

        blob.prestige = self.prestige();
        blob.perks = self.perks();

        this.load_game(blob);
        _.each(this.buildings(), function(bld) {
            if(bld.upgrade_currency() === 'money') {
                bld.upgrades(self.bonuses()['free_money_upgrades']);
            } else if(bld.upgrade_currency() === 'bugs') {
                bld.upgrades(self.bonuses()['free_bugs_upgrades']);
            }
        });

    },
    wipe_save: function() {
        var self = this;
        if(!window.confirm("Are you sure?  This IS NOT PRESTIGE.  You're going to lose everything.  Press OK to wipe everything, Cancel to stop.")) {
            return;
        }
        if(!window.confirm("I can't help it.  Are you REALLY SURE you want to LOSE ALL PROGRESS and START OVER?  Press OK to start from scratch, Cancel to keep going.")) {
            return;
        }
        self.load_game(Second.new_game_blob());
    },
    apply_perks: function() {
        var self = this;
        var bonuses = base_bonuses();
        var perks_applied = 0;
        var actual_perks = {};

        _.each(self.perks(), function(level, perk_id) {
            var perk = PERKS[perk_id];
            if(!perk) return;
            if(perk.max_level() !== null && level > perk.max_level()) {
                level = perk.max_level();
            }
            perks_applied += level;
            actual_perks[perk_id] = level;

            perk.apply(bonuses, level);
        });
        var total_cost = 0.5 * PERK_BASE_COST * perks_applied * (perks_applied - 1);
        if(total_cost > self.prestige()) {
            window.alert('Your perks outcost your prestige, probably because the game changed.  Reapply them.');
            self.reset_perks();
            return;
        }
        self.unspent_prestige(self.prestige() - total_cost);
        self.bonuses(bonuses);
        self.next_perk_cost((perks_applied + 1)* PERK_BASE_COST);
        self.perks(actual_perks);
        self.upgrade_effectiveness(1 + self.unspent_prestige());

        var perk_objs = {};
        _.each(self.kinds(), function(kind) {
            _.each([1,2,3,4,5], function(tier) {
                var id = [kind, tier].join('.');
                var perk = PERKS[id].clone();
                perk.level(actual_perks[id] || 0);

                perk_objs[id] = perk;
            });
        });
        self.perk_objects(perk_objs);
    },
    reset_perks: function() {
        var self = this;
        self.perks({});
        self.apply_perks();
    },
    purchase_perk: function(perk) {
        var self = this;
        var perk_id = perk.id();

        if(self.next_perk_cost() > self.unspent_prestige()) {
            return;
        }
        self.perks()[perk_id] = (self.perks()[perk_id] || 0) + 1;
        self.apply_perks(); // Takes care of syncing cost, etc.
    },
    can_buy_perk: function() {
        var self = this;
        return self.next_perk_cost() <= self.unspent_prestige();
    }
});


Second.save_version = 3;

Second.new_game_blob = function() {
    return {
        save_version: Second.save_version,
        money: 0,
        bugs: 0,
        upgrade_effectiveness: 1,
        total_ticks: 0,
        total_clicks: 0,
        time_ticks: 0,
        manual_ticks: 0,
        bonus_ticks: 0,

        prestige: 0,
        perks: {},

        hide_conversions: false,
        buildings: {
            'IT.1': {
                unlocked: true
            },
            'QA.1': {
                unlocked: true
            },
            'Programmer.1': {
                unlocked: true
            },
            'DB.1': {
                unlocked: true
            },
            'User.1': {
                unlocked: true
            },

            'IT.2': {
                qty: 1,
                unlocked: true
            },
            'QA.2': {
                qty:1,
                unlocked: true
            },
            'Programmer.2': {
                qty: 1,
                unlocked: true
            },
            'DB.2': {
                qty: 1,
                unlocked: true
            },
            'User.2': {
                qty: 1,
                unlocked: true
            }
        }
    };
};

Second.start_game = function() {
    var json = localStorage['Second.current_game'];
    var blob;
    if(json) {
        blob = JSON.parse(json);
    } else {
        blob = Second.new_game_blob();
    }
    if(!blob.save_version || blob.save_version < Second.save_version) {
        // blob = Second.new_game_blob;

        if(window.confirm("The game has changed dramatically since you last played!  Your save will still work, but it might be more fun to wipe your save and start over with the new rules.  Click OK to wipe your save now, or Cancel to continue with your old save.")) {
            blob = Second.new_game_blob();
        }
    }

    if(blob.save_version < 3) {
        blob.prestige = blob.upgrade_effectiveness - 1;
        _.each(blob.buildings, function(bld) {
            bld.upgrades = Math.floor((bld.upgrade_bonus - 1), blob.upgrade_effectiveness);
        });
    }
    return new Second(blob);

};

