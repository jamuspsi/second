Observable notes because I forget:

obs.subChanged(callback, subscriber)
  Subscribe to the observable's changed event.

  Callback will be called in subscriber's context, with
  the observable's owner (specified when the observable is constructed) as the first parameter, and eargs as the second:

  function(obs_owner, eargs) {
      //this is the subscriber.
      //obs_owner is the observable's owner.

      //eargs.obs.holder === obs_holder
      //eargs.obs is the observable
      //eargs.val is the value
      //eargs.oldval is the old value.
  }

event.sub(callback, subscriber)
    Subscribe to the custom event.

    Callback will be called in subscriber's context.
    Parameters to the event call will be passed through,
    except that the event's owner will be prepended.

    function(ev_owner, *args) {
        //ev_owner is the event's owner (specified on construction)
        // further arguments are passed from the event call.
    }

Ice.evChanged.sub(callback, subscriber):
    // A special event that receives all an Ice object's
    // subChanged.
    // The first parameter will be the ice object.

    // observables only auto-subscribe to THEIR owner's evChanged.  So copying an observable from some other Ice object will not fire this event.

    function(ice_obj, eargs) {
        // eargs is as obs.subChanged.
        // eargs.obs is the observable that triggered it.
        // eargs.obs.holder === ice_obj

    }


Renderer.render(obj, eargs) {
    // essentially auto-subscribed to this.rendered().changed
    // when this.rendered() is set.

    //obj and eargs is passed through from evChanged.
    //obj === this.rendered()

    // eargs will be undefined when the rendered object
    // is first set and becomes attached to the dom, because
    // there is no changed event to pass.  (ie, when
    // the object is listened to.)

    // rendered will also be undefined if render() is manually
    // called.  use obj = obj || this.obj, basically.

    // when testing to see if a specific property needs
    // rendering, use if(!eargs || eargs.obs === obj.obs)
}