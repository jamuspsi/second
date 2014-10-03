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
function format_number(num) {
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

        self.hide_conversions = ko.observable(false);

        self.load_game(blob);
        self.tick_interval = window.setInterval(_.bind(self.tick, self), 500);
        self.refresh_interval = window.setInterval(_.bind(self.refresh_integrate_display, self), 500);
        self.autosave_interval = window.setInterval(_.bind(self.save_game, self), 60000);
        self.autoclickinterval = window.setInterval(_.bind(self.autoclick, self), 1000);


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
    button_click: function(num) {
        var self = this;
        if(!num) {
            var prog = self.indexed_buildings()['Programmer.1'];
            num = prog.programmer_click_power();
        }
        self.total_clicks(self.total_clicks() + num);
        click_each = function(bld) { bld.click(num); };

        //for(var x=0;x<num;x++) {
            _.each(self.buildings_by_tier(), click_each);
        //}
    },
    tick: function() {
        var self = this;
        self.total_ticks(self.total_ticks() + 1);
        _.each(self.buildings_by_tier(), function(bld) {
            bld.tick();
        });


    },
    autoclick: function() {
        var self = this;

        var prog = self.indexed_buildings()['Programmer.1'];
        //This got exponential REAL fast.
        //var autoclicks = prog.programmer_autoclicks_per_tick() * prog.programmer_click_power();
        var autoclicks = prog.programmer_autoclicks_per_tick();
        if(autoclicks) {
            self.button_click(autoclicks);
        }
    },
    integrate: function(target) {
        var self = this;
        _.each(self.buildings_by_tier(), function(bld) {
            if(target && bld.tier() >= target.tier()) {
                return;
            }
            if(target && bld.kind() != target.kind()) {
                return;
            }
            bld.integrate();
        });
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
                if(!bld) return;
                if(!bld.prev) {
                    bld.integrates_to(0);
                    return;
                }

                var willbuild = bld.prev.integration_count(bld.prev.qty() + bld.prev.integrates_to());
                if(willbuild) {
                    //bld.prev.integrates_to(0);
                }

                bld.integrates_to(willbuild);


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
    prestige_preview: Ice.kocomputed(function() {
        var self = this;

        if(!self.can_prestige()) {
            return 0;
        }
        var tiers_reached = {};
        _.each(self.buildings(), function(bld) {
            if(!bld.qty() || bld.tier() < 4) return;
            if(!tiers_reached[bld.kind()] || tiers_reached[bld.kind()] < bld.tier()) {
                tiers_reached[bld.kind()] = bld.tier();
            }
        });

        return _.sum(tiers_reached, function(tier) {
            return Math.pow(tier-3, 2) * 0.03;
        });
    }),


    throttled_save: function() {
        var self = this;
        _.debounce(_.bind(self.save_game, self), 1000)();
    },
    save_game: function() {
        var self = this;

        var blob = {
            building_qtys: {},
            money: self.money(),
            bugs: self.bugs(),
            upgrade_effectiveness: self.upgrade_effectiveness(),
            total_ticks: self.total_ticks(),
            total_clicks: self.total_clicks(),
            hide_conversions: self.hide_conversions(),

            buildings: {}
        };
        _.each(self.buildings(), function(bld) {
            blob.buildings[bld.key()] = {
                qty: bld.qty(),
                unlocked: bld.unlocked(),
                upgrade_cost: bld.upgrade_cost(),
                upgrade_bonus: bld.upgrade_bonus()
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

        _.each(['money', 'bugs', 'upgrade_effectiveness', 'total_clicks', 'total_ticks', 'hide_conversions'], function(attr) {
            if(blob[attr] === undefined) {
                blob[attr] = Second.new_game_blob[attr];
            }
            self[attr](blob[attr]);
        });

        _.each(blob.buildings || {}, function(bld_blob, key) {
            var bld = self.indexed_buildings()[key];
            if(!bld) return;
            _.each(['qty', 'upgrade_cost', 'upgrade_bonus', 'unlocked'], function(attr) {
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

        var blob = JSON.parse(JSON.stringify(Second.new_game_blob));
        blob.total_clicks = self.total_clicks();
        blob.total_ticks = self.total_ticks();
        blob.upgrade_effectiveness = self.upgrade_effectiveness() + self.prestige_preview();

        this.load_game(blob);

    },
    wipe_save: function() {
        var self = this;
        if(!window.confirm("Are you sure?  This IS NOT PRESTIGE.  You're going to lose everything.  Press OK to Prestige, Cancel to stop.")) {
            return;
        }
        if(!window.confirm("I can't help it.  Are you REALLY SURE you want to LOSE ALL PROGRESS and START OVER?  Press OK to start from scratch, Cancel to keep going.")) {
            return;
        }
        self.load_game(Second.new_game_blob);
    }

});


Second.new_game_blob = {
    money: 0,
    bugs: 0,
    upgrade_effectiveness: 1,
    total_ticks: 0,
    total_clicks: 0,

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
            qty: 1
        },
        'QA.2': {
            qty:1
        },
        'Programmer.2': {
            qty: 1
        },
        'DB.2': {
            qty: 1
        },
        'User.2': {
            qty: 1
        }
    }
};

Second.start_game = function() {
    var json = localStorage['Second.current_game'];
    var blob;
    if(json) {
        blob = JSON.parse(json);
    } else {
        blob = Second.new_game_blob;
    }
    return new Second(blob);

};

