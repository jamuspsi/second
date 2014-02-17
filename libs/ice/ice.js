// Not exactly deep voodoo, but voodoo.
window.Ice = Ice = Class.$extend({
    __init__: function() {
        this.evChanged = IceEvent(this);
        if(Ice.INSTANCE_COUNTERS[this.$class.$classname] === undefined) {
            Ice.INSTANCE_COUNTERS[this.$class.$classname] = 0;
        }
        this.ICEID = ++Ice.INSTANCE_COUNTERS[this.$class.$classname];
    },
    isa: function(kls) {
      var walk = this.$class;
      while(walk !== undefined) {
        if(kls === walk){
          return true;
        }
        walk = walk.$superclass;
      }
      return false;

    },
    attrs: function() {
        var attrs = {};
        _.each(this, function(v,i,l) {
            if(v && v.constructor === IceObservable){
                attrs[i] = v();
            } else if(typeof(v) !== 'function') {
                attrs[i] = v;
            }
        }, this);
        return attrs;

    },
    pretty: function() {
        return [this.$class.$classname, this.ICEID, this.attrs()];
    },
    unsub: function(unsub) {
        _.each(this, function(v,i,l) {
            if(!v) {
                return;
            }
            if(v.constructor === IceObservable) {
                v.unsub(unsub);
            } else if(v.constructor === IceEvent) {
                v.unsub(unsub);
            }
            /* This becomes recursive, let's not.
            if(Ice.isIce(v)) {
                v.unsub(this);
            }*/
        });
    }
});
Ice.INSTANCE_COUNTERS = {};
Ice.isIce = function(obj) {
    return obj && obj.constructor === Class && obj.isa && obj.isa(Ice);
};
Ice.isa = function(o, kls) {
    return Ice.isIce(o) && o.isa(kls);
};

function IceObservable(holder, initial_val) {
    var obs = function() {
        var obs = arguments.callee;
        if(arguments.length !== 0) {
            //console.log(arguments);
            var changed = (obs.val != arguments[0]);
            //console.log(changed);
            var oldval = obs.val;
            obs.val = arguments[0];
            var eargs = {
                obs: obs,
                holder: obs.holder,
                changed: changed,
                val: obs.val,
                oldval: oldval,
                eventname: 'Set',
            };
            var event_firer = function() {
                obs.fire(eargs);
                if(changed) {
                    eargs.eventname = 'Changed';
                    //console.log("Gonna fire changed, ", eargs);

                    obs.fire(eargs);
                }
                return obs.val;
            };
            if(arguments[1]) {
                // Defer the event firing.
                return event_firer;
            }
            return event_firer();
            //obs._onSet(changed, oldval);
        }
        return obs.val;
    };
    obs.constructor = arguments.callee;

    obs.subscriptions = {}; // ->eventname:[ss, ...]
    obs.holder = holder;
    obs.val = initial_val;
    obs.events = [];
    _.extend(obs, ObservableMethods);

    //prehook the holder's onChanged to this's, if the holder is an Ice.
    //console.log("prehook: holder ", holder, " holder.isa ", !!holder.isa, "typeof(holder.isa)", typeof(holder.isa), holder.isa(Ice));
    if(holder.isa && typeof(holder.isa) === 'function' && holder.isa(Ice)) {
        //console.log("prehooking");
        //Obs is subscribing to its own holder, which will call its onChanged with (obs, eargs)
        //This might be useful by checking obs===this.whateverobservable.  No names required!
        obs.subChanged(function(holder, eargs) {
            //console.log(holder.pretty());
            //console.log('Autohook is going to fire with eargs ', eargs);
            holder.evChanged(eargs);
        }, holder);
    }

    return obs;
}

ObservableMethods = {
    fire: function(eargs) {
        var self = this;
        if(typeof(eargs) === 'string') {
            eargs = {
                holder: this.holder,
                obs: this,
                eventname: eargs
            };
        }
        var subscriptions = this.subscriptions[eargs.eventname];
        _.each(subscriptions, function(ss) {
            ss.callback.apply(ss.subscriber, [self.holder, eargs]);
        });
    },
    subSet: function(callback, subscriber) {
        return this.sub('Set', callback, subscriber);
    },
    subChanged: function(callback, subscriber) {
        return this.sub('Changed', callback, subscriber);
    },
    sub: function(eventname, callback, subscriber) {
        if(!callback) {
            throw 'Observable subscribe with a falsey callback';
        }
        var ss = {eventname: eventname, callback: callback, subscriber:subscriber};
        var ss_by_event = this.subscriptions[eventname];
        if(!ss_by_event) {
            ss_by_event = this.subscriptions[eventname] = [];
        }
        ss_by_event.push(ss);
    },
    unsub: function(unsub) {
        _.each(this.subscriptions, function(sublist, eventname){
            for(var x = 0; x<sublist.length; x++) {
                var ss = sublist[x];
                if(!unsub || ss.subscriber === unsub || ss.callback === unsub || ss.eventname === unsub) {
                    sublist.splice(x, 1);
                    x--;
                }
            }
        });
    },
    inc: function(amt) {
        this(this() + amt);
    },
    dec: function(amt) {
        this(this() - amt);
    },
    higher: function(val) {
        if(val > this()) {
            this(val);
        }
    },
    smaller: function(val) {
        if(val < this()) {
            this(val);
        }
    }

};

//when an observable fires, it calls callback(obs.holder, eargs)
//When holder is ice, it ALSO automatically calls:
//obs.holder.onChanged(eargs), which will call callback(obs.holder.onChanged.holder, eargs)
//where, because onChanged is an event on Ice, obs.holder.onChanged.holder === obs.holder

function IceEvent(holder) {
    var ev = function() {
        var ev = arguments.callee;
        var args = Array.prototype.slice.call(arguments);
        args.unshift( ev.holder);
        _.each(ev.subscriptions, function(ss) {
            //console.log('an event is firing with args ', args, ' before unshift with ', ev.holder);
            //console.log(ss);

            ss.callback.apply(ss.subscriber, args);
        });
    };
    ev.constructor = arguments.callee;
    ev.holder = holder;
    ev.subscriptions = [];
    ev.sub = function(callback, subscriber) {
        if(!callback ){
            throw 'Event subscribe with a falsey callback';
        }
        var ss = {callback: callback, subscriber: subscriber};
        ev.subscriptions.push(ss);
    };
    ev.unsub = function(unsub) {
        for(var x=0;x<ev.subscriptions.length;x++) {
            var ss = ev.subscriptions[x];
            if(!unsub || ss.subscriber === unsub || ss.callback == unsub) {
                ev.subscriptions.splice(x, 1);
                x--;
            }
        }
    };
    return ev;
}

// event args pattern: {holder: h, obs: o, val: v, oldval: v}