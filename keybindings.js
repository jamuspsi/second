KeyBindings = Ice.$extend('KeyBindings', {
    __init__: function(game) {
        this.game = game;

        var self = this;
        function switchColor(c) {
            function _switchColor() {
                self.switchColor(c);
            }
            return _switchColor;
        }
        function buy(what) {
            function _buy() {
                self.buy(what);
            }
            return _buy;
        }

        var binds = {
            'space': this.roll,
            'r': this.roll,

            'd': this.nextDie,
            'a': this.prevDie,
            's': this.currentDie,

            'q': buy('side'),
            'w': buy('plus'),
            'e': buy('multiplier'),
            'm': buy('magic')
        };

        _.each(Die.colors, function(v, i) {
            binds['' + i] = switchColor(v);
        });

        _.each(binds, function(fn, key) {
            console.log("Binding ", key, fn);
            Mousetrap.bind(key, _.bind(fn, self));
        });

    },
    nextDie: function() {
        var selected = this.game.sidebar.upgrade_pane.die();
        var pos = this.game.dice.indexOf(selected);
        pos = (pos + 1) % this.game.dice.length;
        this.game.sidebar.upgrade_pane.select_die(this.game.dice[pos]);
    },
    prevDie: function() {
        var selected = this.game.sidebar.upgrade_pane.die();
        var pos = this.game.dice.indexOf(selected);
        if(pos == -1) pos = 1;
        else if(pos === 0) pos = this.game.dice.length;

        pos = (pos - 1);

        this.game.sidebar.upgrade_pane.select_die(this.game.dice[pos]);
    },
    currentDie: function() {
        var pane = this.game.sidebar.upgrade_pane;
        pane.select_die(pane.die());
    },
    buy: function(what) {
        var pane = this.game.sidebar.upgrade_pane;
        if(!pane.die()) {
            return;
        }
        pane.upgrader['onBuy' + what[0].toUpperCase() + what.slice(1)]();
    },
    switchColor: function(color) {
        var pane = this.game.sidebar.upgrade_pane;
        if(!pane.die()) {
            return;
        }
        console.log("pretending to click for ", color);
        pane.upgrader.onColorClick(color);
    },
    roll: function() {
        var pane = this.game.sidebar.round_pane;
        this.game.sidebar.set_pane(pane);
        pane.$roll_button.click();
    }
});