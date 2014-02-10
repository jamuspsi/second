
Renderer = Ice.$extend('Renderer', {
    __init__: function(chain_obs) {
        this.$super();
        this.$el = null;
        this.bound = null;

        this.paused = IceObservable(this, false);
        this.on_dom = IceObservable(this, false);

        //Constructing a renderer always constructs its el.
        //However, a renderer can be 'slept' to unsubscribe it temporarily.
        if(chain_obs) {
            this.rendered = chain_obs;
        } else {
            this.rendered = IceObservable(this, null);
        }

        this.setup_el();

        this.rendered.subChanged(this.onRenderedChanged, this);
        this.paused.subChanged(this.listen_or_unlisten, this);
        this.on_dom.subChanged(this.listen_or_unlisten, this);

    },
    setup_el: function() {
        var self = this;
        var html = this.template_html();
        if(html) {
            this.$el = TemplateManager.clone_from_html(html, this);
            //console.log("Cloned from html, got $el=", this.$el);
            //console.log("$el[0]=", $(this.$el)[0]);
        } else {
            this.template_name = this.template_name || this.$class.$classname;
            this.template_manager = this.template_manager || TEMPLATES;
            this.$el = this.template_manager.clone(this.template_name, this);
        }

        /*
        function handleMutate(mutations) {
            console.log("Got mutations on ", self.pretty());
            mutations.forEach(function(mutation) {
                console.log(mutation.addedNodes[0]);
                if(mutation.addedNodes[0] === self.$el[0]) {
                    console.log("Looks like I got added.");
                }
                console.log(mutation);
            });
        }
        var config = {
            attributes: true, childList: true, characterData: true
        };
        this.mobs = new MutationObserver(handleMutate);
        this.mobs.observe(this.$el[0], config);
        this.$el.bind('DOMNodeInsertedIntoDocument', _.bind(function(e) {

            if(e.target === this.$el[0] ) {
                this.on_dom(true);
                self.onAttach();
            }
        }, this));
        this.$el.bind('DOMNodeRemovedFromDocument', _.bind(function(e) {
            if(e.target === this.$el[0]) {
                this.on_dom(false);
                self.onDetach();
            }
        }, this));
        */
    },
    appendTo: function($parent) {
        var self = this;
        $parent.append(this.$el);
        //this.post_append();
        _.defer(_.bind(this.post_append, this), 0);
    },
    prependTo: function($parent) {
        $parent.prepend(this.$el);
        //this.post_append();
        _.defer(_.bind(this.post_append, this), 0);
    },
    post_append: function() {
        this.on_dom(this.$el.closest('html').length !== 0);
        if(this.on_dom()) {
            this.onAttach();
        }
    },
    detach: function() {
        this.$el.detach();
        this.$on_dom(this.$el.closest('html').length !== 0);
        if(!this.on_dom()) {
            this.onDetach();
        }
    },
    template_html: function(){},
    onRenderedChanged: function(self, eargs) {
        if(eargs.oldval && this.bound) {
            // If I had an old value and I was bound to it,
            // then unbind from it.
            this._unlisten(this.bound);
        }
        this.listen_or_unlisten();
    },
    listen_or_unlisten: function() {
        var should_bind = this.on_dom() && !this.paused() && this.rendered();

        if(!this.bound && should_bind) {
            // If I'm not bound, bind if I should.
            this._listen(this.rendered());
        }
        if(this.bound && !should_bind) {
            this._unlisten(this.bound);
        }
    },
    _unlisten: function(obj) {
        this.bound = null;
        this.unlisten(obj);
    },
    unlisten: function(obj) {
        obj.unsub(this);
    },
    _listen: function(obj) {
        this.listen(obj);
        this.bound = obj;
        this.render();
    },
    listen: function(obj) {
        obj.evChanged.sub(this.onMutate, this);
    },
    onMutate: function(die, obs, eargs) {
        //console.log("OnMutate, self=", this.pretty());
        if(this.bound) {
            this.render(die, obs, eargs);
        }
    },
    render: function() {
        //console.log("Base render", this.pretty());
    },
    pause: function() {
        this.paused(true);
    },
    unpause: function() {
        this.paused(false);
    },
    onAttach: function() {
        //console.log("OnAttach ", this.pretty())
        _.each(this, function(v, i, l) {
            if(Ice.isa(v, Renderer) && !v.on_dom()) {
                v.on_dom(true);
                v.onAttach();
            }
        });
    },
    onDetach: function() {

    },
    subClick: function($clicked, method) {
        $clicked = $clicked || this.$el;

        if(!$clicked || !method) {
            return;
        }

        $clicked.click(_.bind(method, this));

    },
    flash: function(color, $subelement) {
        $subelement = $subelement || this.$el;
        $subelement.stop(true, true);
        $subelement.effect({
            effect: 'highlight',
            color: color
        });

    }
});
