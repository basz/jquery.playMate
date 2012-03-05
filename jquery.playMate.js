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
 * playMate v0.1 is a jquery plugin to animate an image sequence in various ways.
 * 
 * - 
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
        filename : '###.jpg',
        protect  : false,
        onLoaded: 'loaded.' + pluginName,
        onStarted: 'started.' + pluginName,
        onStopped: 'stopped.' + pluginName,
    };
    
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
    }


    Plugin.prototype._init = function () {
        var self = this;

        self.$images = [];
        self.currentImageIndex = null;
        self.isLoading = false;
        self.isReady = false;
        self.isPlaying = false;
        self.isPaused = false;
        
            
//        if (self.options.protect) {
//            self.$element.on("contextmenu", function (event) {
//                return false;
//            });
//        }
        
        self.$element.on(self.options.onLoaded, self._onLoadedHandler);


        self.currentImageIndex = null;

        self._createImages();
        
    };
    
    Plugin.prototype._removeImages = function() {
        while (this.$images.length) {
            this.$images.pop().remove();
        }
    };
    
    Plugin.prototype._createImages = function() {
        var self = this;
        
        var filenamePattern = this.options.filename;
        var r = new RegExp("#+", "g");
        var filenameLength = r.exec(filenamePattern)[0].length;

        var done = 0;
        for (var i = this.options.from; i < this.options.length + this.options.from; i++) {
            var src = this.options.path + filenamePattern.replace(r, this._strPad(i, filenameLength, '0'));

            var $im = $(new Image());
            $im.css({'position':'relative', 'display': 'none'});

            $im.one('load error', function(e) {
                done++;
                if (done == self.options.length) {
                    if (self.options.onLoaded) {
                        self.$element.trigger($.Event(self.options.onLoaded));
                    }
                }
            });

            self.$images.push($im);
            $(this.$element).append($im);
            
            self.isLoading = true;
            $im.attr('src', src);
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
    };
 
    Plugin.prototype.stop = function() {
        var self = this;
        
        if (!self.isReady || (!self.isPlaying && !self.isPaused))
            return false;

        if (self._requestedInterval)
            clearRequestInterval(self._requestedInterval);

        self.isPlaying = false;
        self.isPaused = false;

        // rewind
        self._setNextImage(true);
    };
        
    Plugin.prototype.pause = function() {
        var self = this;

        if (!self.isReady || !self.isPlaying)
            return false;

        if (!self.isPlaying) {
            self._requestedInterval = requestInterval(function() {
                self._setNextImage();
            }, 1000/self.options.fps);

            self.isPlaying = true;
            self.isPaused = false;
        } else {
            clearRequestInterval(self._requestedInterval);
            self.isPlaying = false;
            self.isPaused = true;
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
        this._removeImages();
        this._createImages();
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

        if (self.$images[self.currentImageIndex]) {
            self.$images[self.currentImageIndex].hide();
        }

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

        this.$images[self.currentImageIndex].show();
            
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

        self._setNextImage(true); // will set sequence to first image
                    
        if (self.options.autoPlay)
            self.play();
    }
    
    $.fn[pluginName] = function ( ) {
        
        var args = arguments;
    	
        return this.each(function () {
            var pluginInstance = $(this).data('plugin_' + pluginName);
    		
            if (!pluginInstance) {
                $(this).data('plugin_' + pluginName, new Plugin( this, args[0] ));
                
                return;
            }

            if (args[0]) {
                if (args[0].substring(0,1) != '_' && typeof pluginInstance[args[0]] == 'function') {
                    return pluginInstance[args[0]].apply(pluginInstance, Array.prototype.slice.call(args, 1));
                } else {
                    $.error( 'Method "' + args[0] + '" does not exist in plugin "'+pluginName+'"!');
                }
            }
            
            return;
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
    
        if( !window.requestAnimationFrame       && 
            !window.webkitRequestAnimationFrame && 
            !(window.mozRequestAnimationFrame && window.mozCancelRequestAnimationFrame) && // Firefox 5 ships without cancel support
            !window.oRequestAnimationFrame      && 
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