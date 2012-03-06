/**
 * MIT License
 * 
 * Copyright (c) 2011 Doug Jones, Kelly Meath, Marshal
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 *
 * playMate is a jquery plugin to animate an image sequence in various ways.
 * 
 * <div id="playMate"></div>
 * 
 * initialise with minimum configuration
 * $('#playMate').playMate({length: 12, path: 'images/');
 * 
 * will start playing a new sequence
 * $('#playMate').reset({path: 'images/some/other/sequence/');
 * 
 * - configuration options
 * 
 * autoPlay         : (boolean) false
 * autoMode         : (string) loop | pingpong
 * playDirection    : (string) forward | backward
 * fps              : (int) 25 - frame per seconds
 * from             : (int) 0 - the starting number of the sequence
 * length           : (int) null - the number of images in the sequence
 * path             : (string) null - required and must end with /
 * filename         : (string) '###.jpg' - numerical pattern to use for sequence names
 * 
 * Public methods
 * play();
 * stop();
 * pause();
 * toggleMode();
 * toggleDirection();
 * reset(options);
 * 
 * Events handling
 * 
 * type 'loaded.playMate' - all images are preloaded (or failed)
 * type 'started.playMate' - animation started
 * type 'stopped.playMate' - animation stopped
 * type 'paused.playMate' - animation paused
 * 
 * $('#playMate').on('loaded.playMate', function(e) {
 *      $(e.currentTarget).fadeIn('fast');
 * });
 * 
 * Characteristics
 * - You should set a width and height on the element, or you won't see anything.
 * - Preloads any images in the sequence, and displays an preloader image while loading.
 * - Creates a absolutely positioned div in the element
 * - Changes images by modifying the background-image url
 * - Container has its overflow set to hidden
 * - Images are centered by setting the background-position property
 * - Images are scaled up/down to fit with 'background-size' set to 'contain' (CSS3)
 * 
 * An instance of the plugin is stored in the element and can be retrieved like so;
 * 
 * var pluginInstance = $('#playMate').data('plugin_playMate');
 *  
 * Accessing public methods
 * 
 * $('#playMate').playMate('someMethod', arg...);
 * or
 * $('#playMate').data('plugin_playMate').someMethod(arg...);
 * 
 * 
 * 
 */




;(function ( $, window, document, undefined ) {
    
    
    var pluginName = 'playMate',
    defaults = {
        autoPlay : false,
        playMode : 'loop', /* loop | pingpong */
        playDirection : 'forward', /* forward | backward */
        fps      : 25,
        from     : 0,
        length   : null,
        path     : null,
        loader   : './images/loader.gif',
        filename : '###.jpg',
        onLoaded : 'loaded.' + pluginName,
        onStarted: 'started.' + pluginName,
        onStopped: 'stopped.' + pluginName,
        onPaused : 'paused.' + pluginName,
    };
    
    /**
    Represents a book.
    @constructor
    */
    function Plugin( element, options ) {
        this.element = element;
        this.$element = $(element);
        
        this.options = $.extend( {}, defaults, options, $(element).data());

        // remove illegal options 
        for (var i in this.options) {
            if (defaults[i] === undefined) {
                delete this.options[i];
            } 
        }
        
        this._defaults = defaults;
        this._name = pluginName;
        
        this._init();
    };

    Plugin.prototype._init = function () {
        var self = this;

        self.$images = [];
        self.currentImageIndex = null;
        self.isLoading = false;
        self.isReady = false;
        self.isPlaying = false;
        self.isPaused = false;

        self.$element.css({
            overflow:'hidden', 
            position: 'relative'
        });
        
        self.$imagesContainer = $('<div></div>');
        self.$element.append(self.$imagesContainer);
        self.$imagesContainer.css({
            position: 'absolute',
            width: '100%',
            height: '100%'            
        });

        // bind 
        self.$element.on(self.options.onLoaded, self._onLoadedHandler);

        if (this.options.path && this.options.length)
            self._setup();
    };
    
    Plugin.prototype._setup = function() {
        var self = this;
        
        var filenamePattern = this.options.filename;
        var r = new RegExp("#+", "g");
        var filenameLength = r.exec(filenamePattern)[0].length;

        var done = 0;
        
        for (var i = parseInt(this.options.from); i < parseInt(this.options.length) + parseInt(this.options.from); i++) {
            var src = this.options.path + filenamePattern.replace(r, this._strPad(i, filenameLength, '0'));

            var $im = $(new Image());
            $im.one('load error', function(e) {
                done++;
                if (done == self.options.length) {
                    if (self.options.onLoaded) {
                        self.$element.trigger($.Event(self.options.onLoaded));
                    }
                }
            }).attr('src', src);

            self.$images.push($im);

            self.isLoading = true;
        }
 
        if (self.isLoading && this.options.loader) {
            self.$imagesContainer.css({'background' : 'url(' + this.options.loader + ') no-repeat center center'});
        }
 
    };
     
     Plugin.prototype._teardown = function() {
        while (this.$images.length) {
            this.$images.pop().remove();
        }
    };
    
    /**
     * Public Methods
     */
    Plugin.prototype.play = function() {
        var self = this;

        if (!self.isReady || self.isPlaying)
            return;
        
        self._requestedInterval = requestInterval(function() {
            self._setNextImage();
        }, 1000/self.options.fps);

        self.isPlaying = true;
        self.$element.trigger($.Event(self.options.onStarted));
    };
 
    Plugin.prototype.stop = function() {
        var self = this;
        
        if (!self.isReady || (!self.isPlaying && !self.isPaused))
            return false;

        if (self._requestedInterval)
            clearRequestInterval(self._requestedInterval);

        self.isPlaying = false;
        self.isPaused = false;
        self.$element.trigger($.Event(self.options.onStopped));
        
        // rewind
        self._setNextImage(true);
        
    };
        
    Plugin.prototype.pause = function() {
        var self = this;

        if (!self.isReady || !self.isPlaying)
            return false;

        if (self._requestedInterval) {
            clearRequestInterval(self._requestedInterval);
            self.isPlaying = false;
            self.isPaused = true;
            self.$element.trigger($.Event(self.options.onPaused));
        }
    };

    Plugin.prototype.toggleMode = function() {
        this.options.playMode = (this.options.playMode == 'loop') ? 'pingpong' : 'loop';
    };

    Plugin.prototype.toggleDirection = function() {
        this.options.playDirection = (this.options.playDirection == 'forward') ? 'backward' : 'forward';
    };

    Plugin.prototype.reset = function(options) {
        this.options = $.extend( {}, this.options, options);

        // remove illegal options 
        for (var i in this.options) {
            if (this._defaults[i] === undefined) {
                delete this.options[i];
            } 
        }

        this.stop();
        this._teardown();
        this._setup();
    };

    Plugin.prototype.setFps = function(fps) {
        var self = this;
        
        if (self.options.fps != parseInt(fps)) {
            self.options.fps = parseInt(fps);
            
            if (self._requestedInterval)
                clearRequestInterval(self._requestedInterval);

            self._requestedInterval = requestInterval(function() {
                self._setNextImage();
            }, 1000/self.options.fps);
        }
    };
    
    Plugin.prototype._setNextImage = function(resetToFirst) {
        var self = this;

        if (!!resetToFirst)
            self.currentImageIndex = 0;
        else
            self.currentImageIndex += (self.options.playDirection == 'forward') ? 1 : -1;
                
        if (self.currentImageIndex < 0) {
            self.currentImageIndex = self.options.length - 1;
        }
                
        if (self.currentImageIndex > self.options.length - 1) {
            self.currentImageIndex = 0;
        }

        self.$imagesContainer.css({
            backgroundImage: 'url(' + self.$images[self.currentImageIndex].attr('src') + ')',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain' /* css3, keeps images inside box */
        });


        if (self.options.playMode == 'pingpong' && ((self.options.playDirection == 'backward' && self.currentImageIndex <= 0) || (self.options.playDirection == 'forward' && self.currentImageIndex >= self.options.length - 1))) {
            self.toggleDirection();
        }
    };

    /**
     * Private Methods
     */
    Plugin.prototype._strPad = function(i,l,s) {
        var o = i.toString();
        if (!s) {s = '0';}
        while (o.length < l) {
            o = s + o;
        }
        return o;
    };

    /**
     * Event Handlers
     */
    Plugin.prototype._onLoadedHandler = function(event) {
        var self = $(event.target).data('plugin_playMate');
        
        self.isReady = true;
        self.isLoading = false;

        if (self.options.loader) {
            self.$imagesContainer.css({'background' : ''});
        }

        self._setNextImage(true);
                    
        if (self.options.autoPlay)
            self.play();
    }
    
    $.fn[pluginName] = function ( ) {
        var args = arguments;
        return this.each(function () {
            var pluginInstance = $(this).data('plugin_' + pluginName);

            if (!pluginInstance) {
                $(this).data('plugin_' + pluginName, new Plugin( this, args[0] ));
            } else if (args[0] && typeof args[0] == 'string') {
                if (args[0].substring(0,1) != '_' && typeof pluginInstance[args[0]] == 'function') {
                    return pluginInstance[args[0]].apply(pluginInstance, Array.prototype.slice.call(args, 1));
                } else {
                    $.error( 'Method "' + args[0] + '" does not exist in plugin "'+pluginName+'"!');
                }
            }
        });
    }

    /**
     * requestAnimationFrame() shim by Paul Irish
     * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
     */
    window.requestAnimFrame = (function() {
        return window.requestAnimationFrame || 
        window.webkitRequestAnimationFrame || 
        window.mozRequestAnimationFrame || 
        window.oRequestAnimationFrame || 
        window.msRequestAnimationFrame || 
        function(/* function */ callback, /* DOMElement */ element){
            window.setTimeout(callback, 1000 / 60);
        };
    })();

    /**
     * Behaves the same as setInterval except uses requestAnimationFrame() where possible for better performance
     * @param {function} fn The callback function
     * @param {int} delay The delay in milliseconds
     */
    window.requestInterval = function(fn, delay) {
    
        if( !window.requestAnimationFrame && 
            !window.webkitRequestAnimationFrame && 
            !(window.mozRequestAnimationFrame && window.mozCancelRequestAnimationFrame) && // Firefox 5 ships without cancel support
            !window.oRequestAnimationFrame && 
            !window.msRequestAnimationFrame)
            return ( window.setInterval(fn, delay));

        var start = new Date().getTime(),
        handle = new Object();

        function loop() {
            var current = new Date().getTime(),
            delta = current - start;

            if(delta >= delay) {
                fn.call();
                start = new Date().getTime();
            }

            handle.value = requestAnimFrame(loop);
                
                   
        };

        handle.value = requestAnimFrame(loop);
        return handle;
    }

    /**
     * Behaves the same as clearInterval except uses cancelRequestAnimationFrame() where possible for better performance
     * @param {int|object} fn The callback function
     */
    window.clearRequestInterval = function(handle) {
        window.cancelAnimationFrame ? window.cancelAnimationFrame(handle.value) :
        window.webkitCancelAnimationFrame ? window.webkitCancelAnimationFrame(handle.value) :
        window.webkitCancelRequestAnimationFrame ? window.webkitCancelRequestAnimationFrame(handle.value) : /* Support for legacy API */
        window.mozCancelRequestAnimationFrame ? window.mozCancelRequestAnimationFrame(handle.value) :
        window.oCancelRequestAnimationFrame ? window.oCancelRequestAnimationFrame(handle.value) :
        window.msCancelRequestAnimationFrame ? window.msCancelRequestAnimationFrame(handle.value) :
        clearInterval(handle);
    };
})( jQuery, window, document );