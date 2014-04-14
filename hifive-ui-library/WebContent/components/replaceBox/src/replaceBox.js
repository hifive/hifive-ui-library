$(function(){

	var logger = h5.log.createLogger('ReplaceBoxController');

	var replaceBoxController = {

		__name: 'h5.ui.container.ReplaceBoxController',

		_easing : 'linear',

		_duration : 400,

		transitionName : 'slideLeft',

		_transition : {
			slideLeft : function(root, current, next, option){
				this._slide(root, current, next, option, 'left');
			},
			slideRight : function(root, current, next, option){
				this._slide(root, current, next, option, 'right');
			},
			slideUp : function(root, current, next, option){
				this._slide(root, current, next, option, 'up');
			},
			slideDown : function(root, current, next, option){
				this._slide(root, current, next, option, 'down');
			},
			pushLeft : function(root, current, next, option){
				this._slide(root, current, next, option, 'left', 'push');
			},
			pushRight : function(root, current, next, option){
				this._slide(root, current, next, option, 'right', 'push');
			},
			pushUp : function(root, current, next, option){
				this._slide(root, current, next, option, 'up', 'push');
			},
			pushDown : function(root, current, next, option){
				this._slide(root, current, next, option, 'down', 'push');
			},
			_slide : function(root, current, next, option, direction, style){
				var _option = this._wrapOption(root, current, next, option);
				var position = current.position();
				var left, top, pLeft, pTop;
				left = pLeft = position.left;
				top = pTop = position.top;
				switch(direction){
				case 'left':
					left += root.width();
					pLeft -= root.width();
					break;
				case 'right':
					left -= root.width();
					pLeft += root.width();
					break;
				case 'up':
					top += root.height();
					pTop -= root.height();
					break;
				case 'down':
					top -= root.height();
					pTop += root.height();
					break;
				}
				var zIndex = current.css('z-index');
				if(!zIndex || zIndex == 'auto') zIndex = 0;

				moveElement(next, {
					left : left,
					top : top,
					'z-index' : zIndex + 1,
					visibility:'visible'
				}, _option);

				moveElementWithAnimate(next, {
					left : position.left,
					top : position.top
				}, _option);
				if(style == 'push'){
					moveElementWithAnimate(current, {
						left : pLeft,
						top : pTop
					}, $.extend(true, _option, {complete:null}));
				}
			},
			openLeft : function(root, current, next, option){
				this._open(root, current, next, option, 'left');
			},
			openRight : function(root, current, next, option){
				this._open(root, current, next, option, 'right');
			},
			openUp : function(root, current, next, option){
				this._open(root, current, next, option, 'up');
			},
			openDown : function(root, current, next, option){
				this._open(root, current, next, option, 'down');
			},
			_open : function(root, current, next, option, direction, style){
				var _option = this._wrapOption(root, current, next, option);
				var zIndex = current.css('z-index');
				if(!zIndex || zIndex == 'auto') zIndex = 0;
				current.css({
					'z-index' : zIndex + 1
				});
				var position = current.position();
				moveElement(next, {
					left : position.left,
					top : position.top,
					'z-index' : zIndex,
					visibility:'visible'
				});
				var left = position.left, top = position.top;
				switch(direction){
				case 'left':
					left -= root.width();
					break;
				case 'right':
					left += root.width();
					break;
				case 'up':
					top -= root.height();
					break;
				case 'down':
					top += root.height();
					break;
				}
				moveElementWithAnimate(current, {
					left : left,
					top : top
				}, _option);
			},
			fade : function(root, current, next, option){
				var _option = this._wrapOption(root, current, next, option);
				var zIndex = current.css('z-index');
				if(!zIndex || zIndex == 'auto') zIndex = 0;
				current.css({
					'z-index' : zIndex + 1
				});
				var position = current.position();
				next.css({
					left : position.left,
					top : position.top,
					'z-index' : zIndex,
					visibility:'visible'
				});
				animate(current, {
					 opacity : 0
				}, _option);
			},
			_wrapOption : function(root, current, next, option){
				var _option = $.extend(true, {}, option || {});
				var zIndex = current.css('z-index');
				var position = current.css('position');
				var width = current[0].style.width;
				var height = current[0].style.height;
				var _complete = _option.completeCallback;
				var isTransform = _option.isTransform;
				_option.complete = function(){
					current.remove(); //イベントハンドラも消える。
					next.css('z-index', zIndex);
					if(!isTransform){
						next[0].style.width = width;
						next[0].style.height = height;
					}
					next.css('position', position);
					if(_complete) _complete(current, next);
					root.trigger('replaceBoxComplete', {
						old : current,
						current : next
					});
				};
				next.css({
					display: 'block',
					position : 'absolute',
					width : current.width(),
					height : current.height(),
					'margin-top' : current.css('margin-top'),
					'margin-right' : current.css('margin-right'),
					'margin-bottom' : current.css('margin-bottom'),
					'margin-left' : current.css('margin-left'),
					visivility : 'hidden'
				}).appendTo(root);
				// IEで対象要素が消える事象の対応
				if(h5.env.ua.isIE){
					var currentTop = current.css('top');
					if(!currentTop || currentTop == 'auto') current.css('top', '0px');
					var currentLeft = current.css('left');
					if(!currentLeft || currentLeft == 'auto') current.css('left', '0px');
				}
				this._relativize(current);
				return _option;
			},

			_relativize: function(jqelm){
				var position = jqelm.css('position');
				if (position == 'static' || !position) {
					jqelm.css('position', 'relative');
					if (h5.env.ua.isOpera) {
						jqelm.css({
							'top' : 0,
							'left' : 0
						});
					}
				}
			}
		},

		isTransition : null,

		//デフォルトはfalse。trueにした場合、対象要素の横幅は固定値に限定。%指定、無指定不可。
		//trueにして%指定、無指定の場合、置換後の要素は置換前要素の最後のサイズ固定になる。
		isTransform : false,

		__init: function(context){
			var root = $(this.rootElement);
			this._relativize(root);
			root.css({
				overflow:'hidden'
			});
		},

		__ready: function(){
			var root = $(this.rootElement);

			var isTransition = root.attr('data-istransition');
			if(isTransition != undefined){
				this.isTransition = !!isTransition;
			}

			var isTransform = root.attr('data-istransform');
			if(isTransform != undefined){
				this.isTransform = !!isTransform;
			}
		},

		replace : function(next, option){
			var _option = $.extend(true, {
				duration: this._duration,
				easing: this._easing,
				transition : this.transitionName,
				isTransition: this.isTransition,
				isTransform: this.isTransform
			}, option);
			next = $(next);
			var current = this.$find('> *').eq(0);
			var root = $(this.rootElement);
			if($.isFunction(_option.transition)){
				_option.transition(root, current, next, _option);
			}else{
				this._transition[_option.transition](root, current, next, _option);
			}
		},

		_relativize: function(jqelm){
			var position = jqelm.css('position');
			if (position == 'static' || !position) {
				jqelm.css('position', 'relative');
				if (h5.env.ua.isOpera) {
					jqelm.css({
						'top' : 0,
						'left' : 0
					});
				}
			}
		}
	};

	h5.core.expose(replaceBoxController);

});