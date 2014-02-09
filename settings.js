Settings = Ice.$extend('Settings', {
    __init__: function() {
        this.$super();
        this.mute_sounds = IceObservable(this, false);
        this.mute_music = IceObservable(this, false);
        this.show_tutorial_on_start = IceObservable(this, true);

        this.evChanged.sub(this.save, this);
    },
    load: function() {
        var json = localStorage['Dunno.settings'];
        var blob;
        if(json) {
            blob = JSON.parse(json);
        } else {
            blob = _.omit(Settings.default_settings);
        }

        var self = this;
        _.each(Settings.keys, function(k) {
            self[k](blob[k]);
        });
    },
    save: function() {
        var self = this;
        var blob = {};
        _.each(Settings.keys, function(k) {
            blob[k] = self[k]();
        });

        var json = JSON.stringify(blob);
        localStorage['Dunno.settings'] = json;
    }
});
Settings.keys = ['mute_sounds', 'mute_music', 'show_tutorial_on_start'];
Settings.default_settings = {
    mute_sounds: false,
    mute_music: false,
    show_tutorial_on_start: true
};