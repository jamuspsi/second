Spell = Ice.$extend('Spell', {
    __init__: function() {
        var self = this;

        this.$super();

        self.name = ko.observable('Unnamed spell');
        self.cost = ManaPool();

    },
    cast: function(caster, targeting) {

    }
});

SpellCast = Mech.$extend('SpellCast', {
    __init__: function(caster, spell, targeting) {
        var self = this;
        /*self.phases = [
            'pre',
            'spend_mana',
            'execute_spell',
            'post'
        ];*/
        this.$super('pre');

        self.targeting = ko.observable(targeting);
        self.spell = ko.observable(spell);
        self.caster = ko.observable(caster);
    },
    spend_mana: function() {

    }
});