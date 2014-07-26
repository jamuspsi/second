$(function(){
    //TEMPLATES = new TemplateManager('#html_templates');
    ShowFullErrorStacks();
    MonkeypatchKoTemplateBinding();

    loadExternalKnockoutTemplates('/kot/', function() {


        sound_manifest = [
        ];

        createjs.Sound.registerManifest(sound_manifest);

        settings = new Settings();
        settings.load();



        game = Second.start_game();

        var body = $('#game');
        // console.log(body, scene.$el);

        console.log("Applying bindings to ", body[0]);
        ko.applyBindings( window.game, body[0]);


    });


});

log10 = Math.log(10);
log1000 = Math.log(1000);
NUMBER_SUFFIXES = ["K", "M", "B", "T", "Qa", "Qt", "Sx", "Sp", "Oc", "Nn", "Dc", "UDc", "DDc", "TDc", "QaDc", "QtDc", "SxDc", "SpDc", "ODc", "NDc", "Vi", "UVi", "DVi", "TVi", "QaVi", "QtVi", "SxVi", "SpVi", "OcVi", "NnVi", "Tg"];
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
    return fmted + suffix;


}


Second = Ice.$extend('Second', {
    __init__: function(blob) {
        var self = this;

        self.$super();
        self.buildings = ko.observableArray([]);
        self.money = ko.observable(100);
        self.proofs = ko.observable(0);
        self.integrating = ko.observable(false);


        self.load_game(blob);
        self.tick_interval = window.setInterval(_.bind(self.tick, self), 500);
        self.refresh_interval = window.setInterval(_.bind(self.refresh_integrate_display, self), 500);

        self.total_clicks = ko.observable(0);
        self.total_ticks = ko.observable(0);

        /*self.autoclick_interval = window.setInterval(function() {
            self.button_click(100);
        }, 200);*/

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
        self.total_clicks(self.total_clicks() + num);
        for(var x=0;x<num;x++) {
            _.each(self.buildings_by_tier(), function(bld) {
                bld.click();
            });
        }
    },
    tick: function() {
//        console.log('Tick!');
        var self = this;
        self.total_ticks(self.total_ticks() + 1);
        _.each(self.buildings_by_tier(), function(bld) {
            bld.tick();
        });

        if(self.integrating()) {
            self.integrate();
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
                    //console.log("Can't build because no prev: ", bld);
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

    get_multiplier: function(mode, currency, bld) {
        return 1.0 * bld.upgrade_bonus();
    },
    throttled_save: function() {
        var self = this;
        _.debounce(_.bind(self.save_game, self), 1000)();
    },
    save_game: function() {
        var self = this;

        var blob = {
            building_qtys: {},
            money: self.money(),
            buildings: {}
        };
        _.each(self.buildings(), function(bld) {
            blob.buildings[bld.key()] = {
                qty: bld.qty(),
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
        console.log('Going to push BUILDINGS: ', BUILDINGS);
        _.each(BUILDINGS, function(bld) {
            new_buildings.push(Building(bld));
        });
        self.buildings(new_buildings);
        self.refresh_building_links();


        /*
        _.each(blob.buildings || [], function(bld) {
            _.each(bld.__keys__(), function(key) {
                self.indexed_buildings()[key]( bld[key]() );
            });
        });*/
        self.money(blob.money);

        _.each(blob.buildings || {}, function(bld_blob, key) {
            console.log(self.indexed_buildings(), key);
            var bld = self.indexed_buildings()[key];
            _.each(['qty', 'upgrade_cost', 'upgrade_bonus'], function(attr) {
                if(bld_blob[attr] !== undefined) {
                    bld[attr](bld_blob[attr]);
                }
            });
        });

    },
    new_game_plus: function() {
        var blob = JSON.parse(JSON.stringify(Second.new_game_blob));

        // Copy things onto blob that you want to keep.

        this.load_game(blob);

    }

});


Second.new_game_blob = {
    money: 0,
    buildings: {
        'IT.2': {
            qty: 1
        },
        'QA.2': {
            qty:1
        },
        'Programmer.2': {
            qty: 1
        },
        'DBA.2': {
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

