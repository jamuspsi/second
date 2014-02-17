
Scene = Renderer.$extend('Scene', {
    template_html: function() {
        return [
    '<div class="game">',
        '<div id="arena_holder" class="arena_holder">',
        '</div>',
    '</div>'
        ].join('');
    },
    __init__: function() {
        this.$super();

        this.game = this.rendered;
        this.arena_frame = ArenaFrame();
        this.arena_frame.appendTo(this.$arena_holder);

    },
    listen: function(obj) {
        this.$super(obj);
        obj.arena.subChanged(this.onArenaChanged, this);
        this.arena_frame.arena(obj.arena());
    },
    onArenaChanged: function(eargs) {
        this.arena_frame.arena(eargs.val);
    },

    onAttach: function() {
        this.$super();
        console.log("Attached.");
        var self = this;

        this.on_resize = function() {
            self.refresh_layout();
        };
        this.on_resize();
        $(window).on('resize', this.on_resize);
    },
    onDetach: function() {
        this.$super();
        if(this.on_resize) {
            $(window.off('resize', this.on_resize));
            this.on_resize = null;
        }
    },
    refresh_layout: function() {
        //this.sidebar.refresh_layout();
        //this.banner.refresh_layout();
    },
    render: function(game, eargs) {
        game = game || this.game;
        if(!eargs || eargs.obs === game.arena) {
            this.arena_frame.arena(game.arena());
        }
    }

});
