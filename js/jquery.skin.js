// jQuery.skin.js
// 
// 0.9.6
// 
// Stephen Band

(function( jQuery, undefined ){
	
	var debug = false; //(window.console && console.log && console.log.apply);
	
	// VAR
	
	var plugin = 'skin',
			
			options = {
				map: 'linear',
				decimals: 2
			},
			
			doc = jQuery(document),
			win = jQuery(window),
			
			testMaxCss = { width: '100%', height: '100%' },
			testMinCss = { width: '0%', height: '0%' },
			
			pi = Math.PI,
			pi2 = 2*pi,
			sin = Math.sin,
			cos = Math.cos;
	
	var controllers = {
		value: {
			events: 'change valuechange',
			read: function( fn ){
				var ratio = calcRatio( this.source.val(), this.min, this.max );
				return fn( ratio );
			},
			write: function( ratio, fn ){
				var val = this.min + ratio * (this.max - this.min),
						parsedVal;
				
				// Force the value to stay within min and max (if the field has
				// defaulted to type text, it won't respect min and max).
				val = val < this.min ? this.min : val > this.max ? this.max : val ;
				
				// Force the value to conform to step (if the field has
				// defaulted to type text, it won't respect step).
				if ( this.step ) { val = Math.round( val / this.step ) * this.step; }
				
				// And truncate to a sensible number of decimal places.
				if ( this.truncate ) {
					parsedVal = /^[-?\d*](\.[\d*])$/.exec( val );
					val = parsedVal[1] + '.' + parsedVal[2].slice(0, this.decimals);
				}
				
				// Set the value on the source.	 Directly, as we don't
				// want our hacked .val() method triggering a redraw.
				// We're about to send a change event, after all...
				jQuery.fn.val.originalMethod.call( this.source, val );
				
				// When you set a value in js, a change
				// event is not triggered. Do it now.
				this.source.trigger({ type: 'change' });
				
				fn && fn( val );
			},
//			init: function(){},
			update: function(){
				this.min = parseFloat( this.source.attr('min') );
				this.max = parseFloat( this.source.attr('max') );
				this.step = parseFloat( this.source.attr('step') );
			}
		},
		scrollLeft: {
			events: 'scroll scrollleftchange',
			read: function( fn ){
				var ratio = calcRatio( this.source.scrollLeft(), 0, this.max );
				return fn( ratio );
			},
			write: function( ratio, fn ){
				var val = ratio * this.max;
				
				// Set the value to the scroll position
				this.source.scrollLeft( val );
				fn && fn( val );
			},
			update: function(){
				var scroll = this.source.scrollLeft();
				this.max = this.source.scrollLeft(999999).scrollLeft();
				this.source.scrollLeft( scroll );
			}
		},
		scrollTop: {
			events: 'scroll scrolltopchange',
			read: function( fn ){
				var ratio = calcRatio( this.source.scrollTop(), 0, this.max );
				return fn( ratio );
			},
			write: function( ratio, fn ){
				var val = ratio * this.max;
				
				// Set the value to the scroll position
				this.source.scrollTop( val );
				fn && fn( val );
			},
			update: function(){
				var scroll = this.source.scrollTop();
				this.max = this.source.scrollTop(999999).scrollTop();
				this.source.scrollTop( scroll );
			}
		},
		scrollWidth: {
			events: 'scrollwidthchange',
			read: function( fn ){
				var outerWidth = this.source.outerWidth(),
						ratio = calcRatio( outerWidth, 0, this.max + outerWidth );
				return fn( ratio );
			},
			update: function(){
				var scroll = this.source.scrollLeft();
				this.max = this.source.scrollLeft(999999).scrollLeft();
				this.source.scrollLeft( scroll );
			}
		},
		scrollHeight: {
			events: 'scrollheightchange',
			read: function( fn ){
				var outerHeight = this.source.outerHeight(),
						ratio = calcRatio( outerHeight, 0, this.max + outerHeight );
				return fn( ratio );
			},
			update: function(){
				var scroll = this.source.scrollTop();
				this.max = this.source.scrollTop(999999).scrollTop();
				this.source.scrollTop( scroll );
			}
		}
	};
	
	var responders = {
		x: {
			dragstart: function( properties, coords, fn ){
				return fn({
					travel: properties.travel
				});
			},
			dragmove: function( start, startCoords, moveCoords, fn ){
				return fn( (moveCoords.x - startCoords.x) / start.travel );
			}
		},
		y: {
			dragstart: function( properties, coords, fn ){
				return fn({
					travel: properties.travel
				});
			},
			dragmove: function( start, startCoords, moveCoords, fn ){
				return fn( (moveCoords.y - startCoords.y) / start.travel );
			}
		}
//		distance: {
//			dragstart: function( coords, module, options, skin ){
//				var diff;
//				
//				this.coords = {
//					x: skin.offset().left + skin.width()/2,
//					y: skin.offset().top + skin.height()/2
//				};
//				
//				diff = { x: coords.x - this.coords.x, y: coords.y - this.coords.y };
//				this.distance = toPolar(diff)[0];
//				this.ratio = module.ratio;
//				this.travel = options.travel || module.travel;
//			},
//			dragmove :function( coords, fn ){
//			  var diff = { x: coords.x - this.coords.x, y: coords.y - this.coords.y },
//			  		nowDistance = toPolar(diff)[0],
//			  		factor = nowDistance / this.distance - 1,
//			  		ratio = this.ratio * ( 1 + factor );
//			  
//			  return fn( ratio < 0 ? 0 : ratio > 1 ? 1 : ratio );
//			}
//		}
	}
	
	var modules = {
		x: {
			options: {
				response: 'x'
			},
			css: function( ratio, data, fn ){
				var width = data.width !== undefined ?
							data.width :
							data.update(function( obj ){
								return ( obj.width / obj.maxWidth ) || 0;
							}) ;
				
				data.x = ratio;
				
				return fn({ left: ratio * ( 1 - width ) * 100 + '%' });
			},
			measure: function( skin, data, fn ){
				return data.update(function( obj ){
					return fn({
						travel: obj.maxWidth - obj.width,
						ratio: data.x
					})
				});
			}
		},
		y: {
			options: {
				response: 'y'
			},
			css: function( ratio, data, fn ){
				var height = data.height !== undefined ?
							data.height :
							data.update(function( obj ){
								return ( obj.height / obj.maxHeight ) || 0;
							}) ;
				
				data.y = ratio;
				
				return fn({ top: ratio * ( 1 - height ) * 100 + '%' });
			},
			measure: function( skin, data, fn ){
				return data.update(function( obj ){
					return fn({
						travel: obj.maxHeight - obj.height,
						ratio: data.y
					})
				});
			}
		},
		width: {
			options: {
				response: 'x'
			},
			css: function( ratio, data, fn ){
				var width = ratio * 100 + '%';
				
				data.width = ratio;
				
				// If x exists change its css too
				return data.x ? modules.x.css( data.x, data, function( css ){
						css.width = width;
						return fn( css );
					}) : fn({
						width: width
					}) ;
			},
			measure: function( skin, data, fn ){
				return data.update(function( obj ){
					return fn({
						travel: obj.maxWidth - obj.minWidth,
						ratio: data.width
					})
				});
			}
		},
		height: {
			options: {
				response: 'y'
			},
			css: function( ratio, data, fn ){
				var height = ratio * 100 + '%';
				
				data.height = ratio;
				
				// If y exists change its css too
				return data.y ? modules.y.css( data.y, data, function( css ){
						css.height = height;
						return fn( css );
					}) : fn({
						height: height
					}) ;
			},
			measure: function( skin, data, fn ){
				return data.update(function( obj ){
					return fn({
						travel: obj.maxHeight - obj.minHeight,
						ratio: data.height
					})
				});
			}
		},
		rotate: {
			options: {
				response: 'y'
			},
			css: function( ratio, data, fn ){
				var rotate = 'rotate(' + ( ratio * 360 ) + 'deg)';
				
				data.rotate = ratio;
				return fn({
					WebkitTransform: rotate,
					MozTransform: rotate,
					OTransform: rotate,
					transform: rotate
				});
			},
			measure: function( skin, data, fn ){
				return fn({
					travel: 200,
					ratio: data.rotate
				});
			}
		}
	};
	
	var maps = {
		linear: {
			read: function( r ){ return r; },
			write: function( r ){ return r; }
		},
		invert: {
			read: function( r ){ return 1 - r; },
			write: function( r ){ return 1 - r; }
		},
		quadratic: {
			read: function( r ){ return r*r; },
			write: function( r ){ return Math.sqrt(r) || 0; }
		}
	};
	
	// FUNCTIONS
	
	function dataObject( skin ){
		var data = skin.data( plugin );
		
		// If there is no data object, construct a new one
		// and attach it to the element.
		
		if (!data) {
			data = new Data( skin );
			skin.data( plugin, data );
			
			// Binding this inside data gaurantees that it only
			// happens once per skin
			win
			.bind('resize', function(e){
				skin.trigger({ type: 'redraw' });
			})
		}
		
		return data;
	};
	
	function toPolar(cart) {
		var x = cart.x,
				y = cart.y;
		
		// Detect quadrant and work out vector
		if (y === 0) 	{ return x === 0 ? [0, 0] : x > 0 ? [x, 0.5 * pi] : [-x, 1.5 * pi] ; }
		if (y < 0) 		{ return x === 0 ? [-y, pi] : [Math.sqrt(x*x + y*y), Math.atan(x/y) + pi] ; }
		if (y > 0) 		{ return x === 0 ? [y, 0] : [Math.sqrt(x*x + y*y), (x > 0) ? Math.atan(x/y) : pi2 + Math.atan(x/y)] ; }
	};
	
	function calcRatio( val, min, max ) {
		return (val-min) / (max-min);
	}
	
	function dragstop(e) {
		doc.unbind('mousemove.skin mouseup.skin');
	}
	
	// CONSTRUCTORS
	
	function measureSkin( skin, fn ){
		var style = skin.attr('style'),
		  	obj = {};
		
		skin
		.addClass( 'no_transition' )
		.css( testMinCss );
		
		obj.minWidth = skin.width();
		obj.minHeight = skin.height();
		
		skin
		.addClass( 'no_transition' )
		.css( testMaxCss );
		
		obj.maxWidth = skin.width();
		obj.maxHeight = skin.height();
		 
		skin
		.attr('style', style || '')
		.removeClass('no_transition');
		
		obj.width = skin.width();
		obj.height = skin.height();
		
		return fn( obj );
	}
	
	function Data(skin){
		var self = this,
				update = function( fn ){
					return measureSkin( skin, function( obj ){
						// Curry the answer for next time...
						self.update = function( fn ){
							return fn( obj );
						}
						// ...but this time, just send the answer.
						return fn( obj );
					});
				};
		
		this.css = {};
		this.update = update;
		
		// Above, the update function is curried so that
		// it is only measures the skin once, but if we
		// want to measure stuff again we'll have to reset
		// it to the uncurried version:
		this.reset = function(){
			self.update = update;
		};
	}
	
	function Controller( key, source ){
		var Constructor = function(){
			this.source = source;
		};
		
		Constructor.prototype = controllers[key];
		
		return new Constructor();
	}
	
	// The meat and potatoes
	
	function setupSkin( skin, module, o, data ){
		var options = jQuery.extend({}, jQuery.fn.skin.options, module.options, o),
				source = typeof options.source === 'string' ? jQuery(options.source) : options.source ,
				controller = Controller( options.property, source ),
				responder = responders[options.response],
				map = typeof options.map === 'string' ? maps[options.map] : options.map ,
				controllerEvents = controller.events.split(' ').join('.skin ') + '.skin',
				container = skin.parent(),
				flagClass;
		
		controller.decimals = options.decimals;
		
		// Listen to source property
		source.bind( controllerEvents, function(e){
			controller.read(function( ratio ){
				// Store mapped ratio
				var mappedRatio = map.read( ratio );
				
				if ( options.classes ) {
					flagClass && container.removeClass( flagClass );
					flagClass = options.classes[ratio];
					flagClass && container.addClass( flagClass );
				}
				
				// Get module to construct CSS
				return module.css( mappedRatio, data, function( cssObj ){
					skin.css(cssObj);
				});
			});
		});
		
		// Listen for redraw instructions, useful when the
		// skin has just shown and we need to draw it correctly
		skin
		.bind('redraw.skin', function(e){
			data.reset();
			controller.update();

// TODO: This code block repeats the code block above
// used for the value change binding. Gotta factor it
// out somehow.
			
			controller.read(function( ratio ){
				// Store mapped ratio
				var mappedRatio = map.read( ratio );
				
				if ( options.classes ) {
					flagClass && container.removeClass( flagClass );
					flagClass = options.classes[ratio];
					flagClass && container.addClass( flagClass );
				}
				
				// Get module to construct CSS
				return module.css( mappedRatio, data, function( cssObj ){
					skin.css(cssObj);
				});
			});
		});
		
		// Bind to skin, but only if the controller is
		// writeable, or there's no point.
		
		if ( options.response && controller.write ) {
			// Respond to mouse
			skin
			.bind('mousedown.skin', function(e){
				var startCoords = { x: e.pageX, y: e.pageY };
				
				module.measure( skin, data, function( properties ){
					responder.dragstart( properties, startCoords, function( startData ){
						var diffRatioPrev;
						
						doc
						.bind('mousemove.skin', function(e){
							var moveCoords = { x: e.pageX, y: e.pageY };
							
							responder.dragmove( startData, startCoords, moveCoords, function( diffRatio ){
								var ratio;
								
								// I see no pressing need to carry on if the ratio
								// has not changed.
								if ( diffRatio === diffRatioPrev ) { return; }
								
								diffRatioPrev = diffRatio;
								ratio = map.write( properties.ratio + ( options.reverse ? - diffRatio : diffRatio ) );
								
								return controller.write( ratio );
							});
			 				
							// Stop browsery things like text selection
							e.preventDefault();
						})
						.bind('mouseup.skin', function(){
							data.reset();
						});
						
						win
						.bind('mouseup.skin', dragstop);
					});
				});
				
//				win
//				.unbind('mousemove.skin')
//				.bind('mousemove.skin', function(e){
//				
//					// Apply cached css to skin
//					skin.css( data.css );
//					data.css = {};
//				})
//				.bind('mouseup.skin', dragstop);
				
				// Stop text getting selected
				e.preventDefault();
			});
			
			// Add a class during the drag
			if ( options.classes && options.classes.drag ) {
				skin
				.bind('mousedown.skin', function(e){
					skin.addClass( options.classes.drag );
					
					doc.bind('mouseup.skin', function(e){
						skin.removeClass( options.classes.drag )
					});
				});
			}
			
			if (options.clickableParent) {
			 container
			 .bind('mousedown.skin', function(e){
			 	var coords = { x: e.pageX, y: e.pageY },
			 			ratio = data[key];
			 	
			 	responder.click( coords, ratio, skin );
			 });
			}
		};
		
		// Initialise module data
		skin.trigger('redraw');
	}
	
	
	// PLUGIN
	
	jQuery.fn.skin = function( options ){
		return this.each(function(){
			var skin = jQuery(this),
					data = dataObject(skin),
					key;
			
			// Loop through modules in options and
			// setup skin with it
			for ( key in options ) {
				setupSkin( skin, modules[key], options[key], data )
			};
		});
	};
	
	// EXPOSE
	
	function moduleHelper( key ){
		return function( source, property, opts ){
			var options = opts || {},
					obj = {};
			options.source = source;
			options.property = property;
			obj[key] = options;
			return this.skin(obj);
		};
	}
	
	jQuery.fn.skinX = moduleHelper('x');
	jQuery.fn.skinY = moduleHelper('y');
	jQuery.fn.skinWidth = moduleHelper('width');
	jQuery.fn.skinHeight = moduleHelper('height');
	jQuery.fn.skinRotate = moduleHelper('rotate');
	
	jQuery.fn.skin.options = options;
	jQuery.fn.skin.modules = modules;
	
	// DEBUG
	
	if (debug) {
		function eventLog(e) {
			var type = e.type,
					target = e.target,
					space = '            ';
			
			return ['[EVENT]', e, type + space.slice(0, 12 - type.length),
				target.tagName ? target.tagName.toLowerCase() + (target.id ? '#'+target.id : '') + (target.className && typeof target.className === 'string' ? '.' + target.className.split(' ').join('.') : '') :
					target === window ? 'window' : target === document ? 'document' : 'impossible'
			];
		}
		
		doc.bind("resize change click scroll", function(e){
			var events = jQuery(e.target).data('events');
			if ( events && events[e.type] ) { console.log.apply( console, eventLog(e) ); }
		});
	}
	
})( jQuery );

// TODO: Define valuechange, scrollchange and redraw events as being jQuery internal

// Redefine jQuery().val() to send valuechange events whenever
// an input value is changed. This could be a dumb approach,
// but lets try it. It's got to be better than polling the
// input for it's value all the time.

(function( jQuery, undefined ){
	var val = jQuery.fn.val;
	
	jQuery.fn.val = function( n ){
		var oldValue = val.apply( this );
		var result = val.apply( this, arguments );
		
		if ( oldValue !== val.apply( this ) ) {
			this.trigger({ type: 'valuechange' });
		}
		
		return result;
	};
	
	jQuery.fn.val.originalMethod = val;
})( jQuery );