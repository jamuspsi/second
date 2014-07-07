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



        game = Proto.start_game();
        //scene = new Scene();
        //scene.game(game);
        //game.scene = scene;
        //game.sidebar = scene.sidebar;


        var body = $('body');
        // console.log(body, scene.$el);

        console.log("Applying bindings to ", body[0]);
        ko.applyBindings( window.game, body[0]);


    });


});



Proto = Ice.$extend('Proto', {
    __init__: function(blob) {
        this.$super();

        this.load_game(blob);

        this.stack = Stack();
        this.arena = ko.observable(null);
        this.arena(Arena());
        this.something = ko.observable(3);


    },
    save_game: function() {
        // We're going to construct a big blob
        // and slap data into it, which our init should be able to reparse.

        /*
        Things we need saved:
            each die
            each unlocked trick (by name)
            each applied perk (by name?)
            gold, xp, bp, level
            rolls remaining, earned, total

        */
        var blob = {};

        var json = JSON.stringify(blob);
        localStorage['Proto.current_game'] = json;
        return blob;
    },
    load_game: function(blob) {


    },
    new_game_plus: function() {
        var blob = JSON.parse(JSON.stringify(Proto.new_game_blob));

        // Copy things onto blob that you want to keep.

        this.load_game(blob);

    }

});


Proto.new_game_blob = {
};

Proto.start_game = function() {
    var json = localStorage['Proto.current_game'];
    var blob;
    if(json) {
        blob = JSON.parse(json);
    } else {
        blob = Proto.new_game_blob;
    }
    return new Proto(blob);

};

