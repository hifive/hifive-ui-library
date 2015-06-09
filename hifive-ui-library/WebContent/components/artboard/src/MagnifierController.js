/*
 * Copyright (C) 2014 NS Solutions Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

//----------------------------------------------------------------------------
// h5.ui.components.artboard.controller.MagnifierController
//----------------------------------------------------------------------------
(function($) {
	//------------------------------------------------------------
	// Const
	//------------------------------------------------------------
	var DEFAULT_SCALE = 2;

	var CLASS_CANVAS_WRAPPER = 'h5-artboard-canvas-wrapper';
	var CLASS_LAYERS = 'h5-artboard-layers';
	var CLASS_BG_LAYER = 'background-layer';
	var CLASS_SVG_LAYER = 'svg-layer';
	var CLASS_MAGNIFIER = 'h5-artboard-magnifier';

	var ERR_MSG_DISPOSED = 'dispose()されたMagnifierクラスのメソッドは呼び出せません';
	var ERR_MSG_SCALE_NOT_A_NUMBER = 'setScale()に渡す拡大率は数値で指定してください';
	var ERR_MSG_SIZE_OBJECT = 'setSize()に渡すサイズは、プロパティwidth,heightに数値を指定したオブジェクトを指定してください';

	//------------------------------------------------------------
	// Cache
	//------------------------------------------------------------
	var XMLNS = h5.ui.components.artboard.consts.XMLNS;
	var XLINKNS = h5.ui.components.artboard.consts.XLINKNS;

	//------------------------------------------------------------
	// Body
	//------------------------------------------------------------
	/**
	 * Magnifierクラス
	 *
	 * @param board {DOM|jQuery} 拡大表示対象になる元のお絵かきボード要素
	 * @param settings {Object}
	 * @class
	 */
	function Magnifier(board, settings) {
		settings = settings || {};
		var $board = $(board);
		this._$orgLayers = $board.hasClass(CLASS_LAYERS) ? $board : $board.find('.' + CLASS_LAYERS);
		this._$orgBg = this._$orgLayers.find('>.' + CLASS_BG_LAYER);
		this._$orgSvg = this._$orgLayers.find('>.' + CLASS_SVG_LAYER);
		this._$orgG = this._$orgSvg.find('>g');
		this._scale = settings.scale || DEFAULT_SCALE;

		this._rootW = settings.width;
		this._rootH = settings.height;

		this._$root = $('<div></div>').addClass(CLASS_MAGNIFIER);
		this._$view = $('<div></div>').addClass(CLASS_CANVAS_WRAPPER);
		this._$layerWrapper = $('<div></div>').addClass(CLASS_LAYERS);
		this._$bg = $('<div></div>').addClass(CLASS_BG_LAYER);
		this._$svg = $(document.createElementNS(XMLNS, 'svg')).attr('class', CLASS_SVG_LAYER); //svg要素はattr()でクラスを当てる必要あり
		this._$layerWrapper.append(this._$bg);
		this._$layerWrapper.append(this._$svg);
		this._$view.append(this._$layerWrapper);
		this._$root.append(this._$view);

		/** useタグの生成 * */
		this._use = document.createElementNS(XMLNS, 'use');
		this._use.setAttributeNS(XMLNS, 'xlink', XMLNS);
		this._use.setAttributeNS(XLINKNS, 'href', '#' + this._$orgG.attr('id'));
		this._$svg.append(this._use);

		/** 指定されたスケールを適用 */
		this._refresh();
	}

	$.extend(Magnifier.prototype, {
		getElement: function() {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			return this._$root;
		},
		setScale: function(scale) {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			scale = parseFloat(scale);
			if (isNaN(scale)) {
				throw new Error(ERR_MSG_SCALE_NOT_A_NUMBER);
			}
			this._scale = scale;
			this._refresh();
		},
		setSize: function(size) {
			if (!size) {
				throw new Error(ERR_MSG_SIZE_OBJECT);
			}
			var width = parseFloat(size.width);
			var height = parseFloat(size.height);
			if (isNaN(width) || isNaN(height)) {
				throw new Error(ERR_MSG_SIZE_OBJECT);
			}
			this._rootW = width;
			this._rootH = height;
		},
		focus: function(x, y) {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			this._refresh();
			var use = this._use;
			var scale = this._scale;
			use.setAttribute('x', -x + this._rootW / 2);
			use.setAttribute('y', -y + this._rootH / 2);
		},

		/**
		 * @param x
		 * @param y
		 * @param {boolean} center 中央の座標指定かどうか(falseなら左上の座標)
		 */
		move: function(x, y, center) {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			if (center) {
				x -= this._rootW / 2;
				y -= this._rootH / 2;
			}
			this._$root.css({
				left: x,
				top: y
			});
		},

		show: function() {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			this._$root.css('display', 'block');
		},

		hide: function() {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			this._$root.css('display', 'none');
		},
		addDisposeHandler: function(handler) {
			this._disposeHandlers = this._disposeHandlers || [];
			this._disposeHandlers.push(handler);
		},

		dispose: function() {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			this._$root.remove();

			if (this._disposeHandlers) {
				for (var i = 0, l = this._disposeHandlers.length; i < l; i++) {
					this._disposeHandlers[i](this);
				}
			}
			for ( var p in this) {
				this[p] = null;
			}

			this._disposed = true;
		},
		_refresh: function() {
			this._$root.css({
				width: this._rootW,
				height: this._rootH
			});
			var scaleVal = 'scale(' + this._scale + ')';
			this._$svg.css({
				'-webkit-transform': scaleVal,
				transform: scaleVal
			});
		}
	});

	/**
	 * Artboardを拡大表示するコントローラ
	 *
	 * @class
	 * @name h5.ui.components.artboard.controller.MagnifierController
	 */
	var controller = {
		/**
		 * @memberOf h5.ui.components.artboard.controller.MagnifierController
		 * @private
		 */
		__name: 'h5.ui.components.artboard.controller.MagnifierController',

		/**
		 * @memberOf h5.ui.components.artboard.controller.MagnifierController
		 * @private
		 */
		__init: function() {
		// 表示エリアの作成

		},

		/**
		 * @memberOf h5.ui.components.artboard.controller.MagnifierController
		 * @private
		 */
		_scale: null,

		/**
		 * Magnifierの作成
		 *
		 * @param $board
		 */
		createMagnifier: function($board, settings) {
			if (this._mag) {
				// 既に作成済みなら既存のものを破棄して新規に作成する
				this._mag.dispose();
			}

			// レイヤを子に持つレイヤラッパー要素を取得
			$board = $board.hasClass(CLASS_LAYERS) ? $board : $board.find('.' + CLASS_LAYERS);
			if ($board.length === 0) {
				throw new Error('createMagnifierの第1引数には' + CLASS_LAYERS
						+ 'クラス要素またはその要素を子に持つ要素を指定してください');
			} else if ($board.length > 1) {
				throw new Error(
						'createMagnifierの第1引数に指定された要素は複数のArtboardが含まれています。複数のArtboardを対象にはできません');
			}
			this._$board = $board;

			var opt = $.extend({}, settings);
			opt.scale = opt.scale || this._scale;
			var mag = new Magnifier($board, opt);
			this._mag = mag;
			var magElement = mag.getElement();
			$(this.rootElement).append(magElement);
			var mouseoverFocus = settings.mouseover || settings.mouseoverFocus;
			var mouseoverMove = settings.mouseover || settings.mouseoverMove;
			if (mouseoverFocus) {
				// mousemoveイベントで表示するハンドラをバインドする
				this.on($board, 'mousemove h5trackstart h5trackmove', this._mouseoverFocusHandler);
				// magElement上のマウス操作でも後ろがボードなら反応するようにする
				this.on(magElement, 'mousemove h5trackstart h5trackmove',
						this._overMagEventFocusHandler);
				mag.addDisposeHandler(this.own(this._removeMouseoverFocusHandler));
			}
			if (mouseoverMove) {
				// mousemoveイベントで表示するハンドラをバインドする
				this.on($board, 'mousemove h5trackstart h5trackmove', this._mouseoverMoveHandler);
				this.on(magElement, 'mousemove h5trackstart h5trackmove',
						this._overMagEventMoveHandler);
				mag.addDisposeHandler(this.own(this._removeMouseoverMoveHandler));
				// マウスに追従する場合、税所は非表示にしておく
				mag.hide();
			}
			var rootPosition = $(this.rootElement).position();
			this._rootOffset = {
				left: rootPosition.left,
				top: rootPosition.top
			};
			return mag;
		},

		_mouseoverFocusHandler: function(ctx, $board) {
			var event = ctx.event;
			var x = event.pageX - this._rootOffset.left;
			var y = event.pageY - this._rootOffset.top;
			this._mag.focus(x, y);
		},

		_mouseoverMoveHandler: function(ctx) {
			var event = ctx.event;
			var x = event.pageX;
			var y = event.pageY;
			this._mag.show();
			this._mag.move(x, y, true);
		},
		_overMagEventFocusHandler: function(ctx, $el) {
			var event = ctx.event;
			$el.css('display', 'none');
			var target = document.elementFromPoint(event.pageX, event.pageY);
			$el.css('display', 'block');
			if (this._$board.find(target).length) {
				this._mouseoverFocusHandler(ctx, $el);
			}
		},

		_overMagEventMoveHandler: function(ctx, $el) {
			var event = ctx.event;
			$el.css('display', 'none');
			var target = document.elementFromPoint(event.pageX, event.pageY);
			$el.css('display', 'block');
			if (this._$board.find(target).length) {
				this._mouseoverMoveHandler(ctx, $el);
			} else {
				this._mag.hide();
			}
		},

		_removeMouseoverFocusHandler: function() {
			this.off(this._$board, 'mousemove h5trackstart h5trackmove',
					this._mouseoverFocusHandler);
			this.off(magElement, 'mousemove h5trackstart h5trackmove',
					this._overMagEventFocusHandler);
		},

		_removeMouseoverMoveHandler: function() {
			this
					.off(this._$board, 'mousemove h5trackstart h5trackmove',
							this._mouseoverMoveHandler);
			this.off(magElement, 'mousemove h5trackstart h5trackmove',
					this._overMagEventMoveHandler);
		}
	};

	//------------------------------------------------------------
	// expose
	//------------------------------------------------------------
	h5.core.expose(controller);
})(jQuery);