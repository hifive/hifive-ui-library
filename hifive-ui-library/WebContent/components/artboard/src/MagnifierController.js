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
	/**
	 * デフォルトのMagnifier設定
	 *
	 * @private
	 */
	var DEFAULT_SETTINGS = {
		width: 200,
		height: 200,
		scale: 2
	};

	var CLASS_CANVAS_WRAPPER = 'h5-artboard-canvas-wrapper';
	var CLASS_LAYERS = 'h5-artboard-layers';
	var CLASS_BG_LAYER = 'background-layer';
	var CLASS_SVG_LAYER = 'svg-layer';
	var CLASS_MAGNIFIER = 'h5-artboard-magnifier';

	var ERR_MSG_DISPOSED = 'dispose()されたMagnifierクラスのメソッドは呼び出せません';
	var ERR_MSG_SIZE_OBJECT = 'setSize()に渡すサイズは、プロパティwidth,heightに数値を指定したオブジェクトを指定してください';
	var ERR_MSG_INVALID_SCALE = '拡大率は0より大きい数値を指定してください';

	//------------------------------------------------------------
	// Cache
	//------------------------------------------------------------
	var XMLNS = h5.ui.components.artboard.consts.XMLNS;
	var XLINKNS = h5.ui.components.artboard.consts.XLINKNS;

	//------------------------------------------------------------
	// Variable
	//------------------------------------------------------------

	//------------------------------------------------------------
	// Body
	//------------------------------------------------------------
	/**
	 * Magnifierクラス
	 * <p>
	 * アートボードの拡大表示を行うためのクラスです
	 * </p>
	 *
	 * @class
	 * @name Magnifier
	 * @param {DOM|jQuery} board 拡大表示対象になる元のお絵かきボード要素
	 * @param {Object} settings
	 * @param {number} settings.width 拡大表示する要素の幅
	 * @param {number} settings.height 拡大表示する要素の高さ
	 * @param {number} settings.scale 拡大率
	 */
	function Magnifier(board, settings) {
		var $board = $(board);
		var boardW = $board.width();
		var boardH = $board.height();
		var $orgLayers = $board.hasClass(CLASS_LAYERS) ? $board : $board.find('.' + CLASS_LAYERS);
		var $orgBg = $orgLayers.find('>.' + CLASS_BG_LAYER);
		var $orgSvg = $orgLayers.find('>.' + CLASS_SVG_LAYER);
		var viewBoxValues = $orgSvg[0].getAttribute('viewBox').split(' ');
		var orgViewBoxW = parseInt(viewBoxValues[2]);
		var orgViewBoxH = parseInt(viewBoxValues[3]);
		var orgScaleX = boardW / orgViewBoxW;
		var orgScaleY = boardH / orgViewBoxH;
		var $orgG = $orgSvg.find('>g');
		var orgGTransform = $orgG.attr('transform');
		var orgGTranslateX = 0;
		var orgGTranslateY = 0;
		var orgGScaleX = 1;
		var orgGScaleY = 1;
		if (orgGTransform) {
			var tmp = orgGTransform.match(/matrix\((.*)\)/);
			var transArgs = tmp[1].split(' ');
			orgGScaleX = parseFloat(transArgs[0]);
			orgGScaleY = parseFloat(transArgs[3]);
			orgGTranslateX = parseFloat(transArgs[4]);
			orgGTranslateY = parseFloat(transArgs[5]);
		}
		var scale = settings.scale;
		if (isNaN(scale) || scale <= 0) {
			throw new Error(ERR_MSG_INVALID_SCALE);
		}

		var $root = $('<div></div>').addClass(CLASS_MAGNIFIER);
		var $view = $('<div></div>').addClass(CLASS_CANVAS_WRAPPER);
		var $layerWrapper = $('<div></div>').addClass(CLASS_LAYERS);
		var $bg = $('<div></div>').addClass(CLASS_BG_LAYER);
		var $svg = $(document.createElementNS(XMLNS, 'svg')).attr('class', CLASS_SVG_LAYER); //svg要素はattr()でクラスを当てる必要あり
		$layerWrapper.append($bg);
		$layerWrapper.append($svg);
		$view.append($layerWrapper);
		$root.append($view);

		// useタグの生成
		var use = document.createElementNS(XMLNS, 'use');
		use.setAttributeNS(XMLNS, 'xlink', XMLNS);
		use.setAttributeNS(XLINKNS, 'href', '#' + $orgG.attr('id'));
		$svg.append(use);

		// インスタンスで操作する要素を覚えさせておく
		// Magnifier設定
		this._scale = scale;
		this._rootW = parseFloat(settings.width);
		this._rootH = parseFloat(settings.height);
		// 要素
		this._$root = $root;
		this._$svg = $svg;
		this._$bgElement = $bgElement;
		this._use = use;
		// 元のsvg,g要素のtranslate情報
		this._orgViewBoxW = orgViewBoxW;
		this._orgViewBoxH = orgViewBoxH;
		this._orgGTranslateX = orgGTranslateX;
		this._orgGTranslateY = orgGTranslateY;
		this._orgGScaleX = orgGScaleX;
		this._orgGScaleY = orgGScaleY;
		this._orgScaleRatioX = orgGScaleX / orgScaleX;
		this._orgScaleRatioY = orgGScaleY / orgScaleY;
		this._orgScaleRatioXY = Math.sqrt(this._orgScaleRatioX * this._orgScaleRatioY);
		// ボード情報
		this._boardW = boardW;
		this._boardH = boardH;

		// 背景情報
		// 背景画像がロードされていない場合はonloadで背景画像のスタイルを取得する
		var $orgBgElement = $orgBg.children();
		if ($orgBgElement.length) {
			var $bgElement = $orgBgElement.clone();
			var that = this;
			// 範囲外は表示しないようにclip

			function getBgElementInfo() {
				var orgTop = parseFloat($orgBgElement.css('top')) || 0;
				var orgLeft = parseFloat($orgBgElement.css('left')) || 0;
				var xMin = -orgLeft;
				var yMin = -orgTop;
				var xMax = boardW - orgLeft;
				var yMax = boardH - orgTop;
				var clipValue = h5.u.str.format('rect({0}px {1}px {2}px {3}px)', yMin, xMax, yMax,
						xMin);
				$bgElement.css({
					width: $orgBgElement.width(),
					height: $orgBgElement.height(),
					transformOrigin: '0 0',
					'-webkit-transform-origin': '0 0',
					clip: clipValue
				});
				$bg.append($bgElement);
				that._$bgElement = $bgElement;
				that._orgBgElementLeft = orgLeft;
				that._orgBgElementTop = orgTop;
				that._refresh();
			}

			if ($orgBgElement[0].complete) {
				getBgElementInfo();
			} else {
				var orgOnLoad = $orgBgElement[0].onload;
				$orgBgElement[0].onload = !orgOnLoad ? getBgElementInfo : function() {
					// 既にonlaodが指定されている(ArtboardViewerでロード待機中などの)場合、
					// 既存のonloadを実行した後にMagnifierの背景設定
					orgOnLoad();
					getBgElementInfo();
				};
			}
		}

		// 指定されたスケールとサイズを適用
		this._refresh();
	}

	$.extend(Magnifier.prototype, {
		/**
		 * 拡大表示要素を取得します
		 *
		 * @memberOf Magnifier
		 * @instance
		 * @returns {DOM}
		 */
		getElement: function() {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			return this._$root[0];
		},

		/**
		 * 拡大率を設定します
		 *
		 * @memberOf Magnifier
		 * @instance
		 * @param {number} scale 0より大きい数値
		 * @returns {DOM}
		 */
		setScale: function(scale) {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			scale = parseFloat(scale);
			if (isNaN(scale) || scale <= 0) {
				throw new Error(ERR_MSG_INVALID_SCALE);
			}
			this._scale = scale;
			this._refresh();
		},

		/**
		 * 拡大表示要素のサイズを設定します
		 *
		 * @memberOf Magnifier
		 * @instance
		 * @param {Object} size
		 * @param {number} size.width 幅
		 * @param {number} size.height 高さ
		 */
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

		/**
		 * 拡大表示箇所の座標を設定します
		 *
		 * @memberOf Magnifier
		 * @instance
		 * @param {number} x 拡大表示するx座標
		 * @param {number} y 拡大表示するy座標
		 */
		focus: function(x, y) {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			this._x = x;
			this._y = y;
			this._refresh();
		},

		/**
		 * 拡大表示要素の位置を指定します
		 *
		 * @memberOf Magnifier
		 * @instance
		 * @param {number} x 拡大表示するx座標
		 * @param {number} y 拡大表示するy座標
		 * @param {boolean} center 中央の座標指定かどうか(falseなら左上の座標)
		 */
		move: function(x, y, center) {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			if (center) {
				// outerWidth/Heightでやらないとボーダー分ずれる
				x -= this._$root.outerWidth() / 2;
				y -= this._$root.outerHeight() / 2;
			}
			this._$root.css({
				left: x,
				top: y
			});
		},

		/**
		 * 拡大表示要素を表示します
		 *
		 * @memberOf Magnifier
		 * @instance
		 * @param {number} x 拡大表示するx座標
		 * @param {number} y 拡大表示するy座標
		 * @param {boolean} center 中央の座標指定かどうか(falseなら左上の座標)
		 */
		show: function() {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			this._$root.css('display', 'block');
		},

		/**
		 * 拡大表示要素を非表示にします
		 *
		 * @memberOf Magnifier
		 * @instance
		 */
		hide: function() {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			this._$root.css('display', 'none');
		},

		/**
		 * このインスタンスがdisposeされた時に実行するハンドラを登録します
		 *
		 * @memberOf Magnifier
		 * @instance
		 * @param {Function} ハンドラ
		 */
		addDisposeHandler: function(handler) {
			this._disposeHandlers = this._disposeHandlers || [];
			this._disposeHandlers.push(handler);
		},

		/**
		 * このインスタンスを使用不可にします
		 *
		 * @memberOf Magnifier
		 * @instance
		 */
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

		/**
		 * 拡大表示を更新します
		 *
		 * @memberOf Magnifier
		 * @instance
		 * @private
		 */
		_refresh: function() {
			// 非表示なら何もしない
			if (this._$root.css('display') === 'none') {
				return;
			}

			// 表示位置設定
			var w = this._rootW;
			var h = this._rootH;
			// x,yはオリジナルのg要素上でどの場所かの値を使って計算する
			// g要素が拡縮されていてもg要素上の位置
			// (元のg要素が100px, g要素が2倍に拡大表示されていて200pxで表示されているとき、xは0～200の値を取る)
			var x = (this._x || 0) * this._orgScaleRatioX;
			var y = (this._y || 0) * this._orgScaleRatioY;
			// _scaleがnの時、オリジナルのg要素の見かけ上の大きさのn倍にする必要がある
			// オリジナルのg要素がすでにtransformで拡縮されて表示されていたら、その分を割ったscaleで計算する
			var scale = this._scale / this._orgScaleRatioXY;
			// svg
			var use = this._use;

			use.setAttribute('x', -x + w / 2 - this._orgGTranslateX);
			use.setAttribute('y', -y + h / 2 - this._orgGTranslateY);

			this._$root.css({
				width: this._rootW,
				height: this._rootH
			});

			var value = h5.u.str.format('matrix({0},0,0,{0},{1},{2})', scale, (1 - scale) * w / 2,
					(1 - scale) * h / 2);
			this._use.setAttribute('transform', value);


			// カンバス範囲外は表示しないようにclip
			// 全て表示する場合はrect(0 {w}px {h}px 0)
			// x,yの位置がカンバスをはみ出す位置にいる場合は削る
			var xMin = x > w / 2 / scale ? 0 : (w / 2 / scale - x) * scale;
			var yMin = y > h / 2 / scale ? 0 : (h / 2 / scale - y) * scale;
			var xMax = x + w / 2 / scale < this._orgViewBoxW * this._orgGScaleX ? w : w
					- (x + w / 2 / scale - this._orgViewBoxW * this._orgGScaleX) * scale;
			var yMax = y + h / 2 / scale < this._orgViewBoxH * this._orgGScaleY ? h : h
					- (y + h / 2 / scale - this._orgViewBoxH * this._orgGScaleY) * scale;
			var clipValue = h5.u.str
					.format('rect({0}px {1}px {2}px {3}px)', yMin, xMax, yMax, xMin);
			this._$svg.css('clip', clipValue);

			// 背景
			this._refreshBg();
		},

		/**
		 * 背景画像について拡大表示の更新します
		 *
		 * @memberOf Magnifier
		 * @instance
		 * @private
		 */
		_refreshBg: function() {
			if (!this._$bgElement) {
				return;
			}
			var w = this._rootW;
			var h = this._rootH;
			var scale = this._scale;
			var x = this._x;
			var y = this._y;
			var scaleValue = 'scale(' + scale + ')';
			var orgLeft = this._orgBgElementLeft;
			var orgTop = this._orgBgElementTop;
			this._$bgElement.css({
				left: orgLeft * scale - x * scale + w / 2,
				top: orgTop * scale - y * scale + h / 2,
				transform: scaleValue,
				'-webkit-transform': scaleValue
			});
		}
	});

	/**
	 * 拡大表示のマウスオーバー追従を行うコントローラ
	 * <p>
	 * このコントローラは[MagnifierController]{@link h5.ui.components.artboard.controller.MagnifierController}によって拡大対象のアートボードに動的にバインドされます
	 * </p>
	 *
	 * @class
	 * @name h5.ui.components.artboard.controller.MagnifierMouseoverController
	 */
	var mouseoverController = {
		/**
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 */
		__name: 'h5.ui.components.artboard.controller.MagnifierMouseoverController',

		/**
		 * Magnifierインスタンス
		 *
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 */
		_mag: null,

		/**
		 * 拡大表示対象となるボード要素
		 *
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 */
		_$board: null,

		/**
		 * mouseover時(及びh5track時)に拡大表示要素の位置を追従させるかどうか
		 *
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 */
		_mouseoverMove: null,

		/**
		 * mouseover時(及びh5track時)に拡大表示対象の座標を追従させるかどうか
		 *
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 */
		_mouseoverFocus: null,

		/**
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 */
		__construct: function(ctx) {
			var args = ctx.args;
			this._mag = args.mag;
			this._mag.hide();
			this._magElement = this._mag.getElement();
			this._$board = args.$board;
			this._mouseoverMove = args.mouseoverMove;
			this._mouseoverFocus = args.mouseoverFocus;
			this._mag.addDisposeHandler(this.own(function() {
				this.parentController.unmanageChild(this);
			}));
		},

		/**
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 */
		'{this._$board} h5trackstart': function(ctx, $el) {
			this._execute(ctx, $el);
		},

		/**
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 */
		'{this._$board} h5trackmove': function(ctx, $el) {
			this._execute(ctx, $el);
		},

		/**
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 */
		'{this._$board} h5trackend': function(ctx, $el) {
			this._execute(ctx, $el);
		},

		/**
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 */
		'{this._$board} mousemove': function(ctx, $el) {
			this._execute(ctx, $el);
		},

		/**
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 */
		'{this._magElement} h5trackstart': function(ctx, $el) {
			this._execute(ctx, $el, true);
		},

		/**
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 */
		'{this._magElement} h5trackmove': function(ctx, $el) {
			this._execute(ctx, $el, true);
		},

		/**
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 */
		'{this._magElement} h5trackend': function(ctx, $el) {
			this._execute(ctx, $el, true);
		},

		/**
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 */
		'{this._magElement} mousemove': function(ctx, $el) {
			this._execute(ctx, $el, true);
		},

		/**
		 * mousemove及びh5track*イベント時に実行するハンドラ
		 *
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 * @param ctx {Object} イベントコンテキスト
		 * @param $el {jQuery} イベントターゲット
		 * @param isOnMagElement {boolean} Magnifierエレメントならtrue、ボード要素ならfalse
		 */
		_execute: function(ctx, $el, isOnMagElement) {
			var event = ctx.event;
			var onBoard = true;
			if (isOnMagElement) {
				// Magnifier要素上のイベントの場合、いったんdisplay:noneにして、後ろにボードがあるかどうかチェックする
				$el.css('display', 'none');
				var scrollX = window.pageXOffset === undefined ? window.scrollX
						: window.pageXOffset;
				var scrollY = window.pageYOffset === undefined ? window.scrollY
						: window.pageYOffset;
				var target = document
						.elementFromPoint(event.pageX - scrollX, event.pageY - scrollY);
				$el.css('display', 'block');
				onBoard = !!this._$board.find(target).length;
			}
			if (this._mouseoverMove) {
				// Magnifier要素の追従移動
				if (onBoard) {
					this._move(event);
				} else {
					// 後ろにボードが無い場合はMagnifier要素を非表示
					this._mag.hide();
				}
			}
			if (this._mouseoverFocus) {
				// Magnifierで表示している座標の追従
				this._focus(event);

			}
		},

		/**
		 * Magnifierの移動
		 *
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 * @param event {jQuery.Event} イベントオブジェクト
		 */
		_move: function(event) {
			if (event.type === 'h5trackend') {
				this._mag.hide();
				return;
			}
			var x = event.pageX;
			var y = event.pageY;
			this._mag.show();
			this._mag.move(x, y, true);
		},

		/**
		 * Magnifierの表示座標の設定
		 *
		 * @private
		 * @memberOf h5.ui.components.artboard.controller.MagnifierMouseoverController
		 * @instance
		 * @param event {jQuery.Event} イベントオブジェクト
		 */
		_focus: function(event) {
			var boardOffset = this._$board.offset();
			var x = event.pageX - boardOffset.left;
			var y = event.pageY - boardOffset.top;
			this._mag.focus(x, y);
		}
	};


	/**
	 * Artboardを拡大表示するコントローラ
	 * <p>
	 * このコントローラの[createMagnifier]{@link h5.ui.components.artboard.controller.MagnifierController#createMagnifier}
	 * を呼ぶと拡大表示を行う{@link Magnifier}インスタンスが生成され、 拡大表示要素(Magnifier要素)がこのコントローラのルートエレメントに追加されます。
	 * </p>
	 * <p>
	 * このコントローラはMagnifier要素を追加したい要素をルートエレメントにしてバインドして使用します。
	 * </p>
	 *
	 * @class
	 * @name h5.ui.components.artboard.controller.MagnifierController
	 */
	var controller = {
		/**
		 * @memberOf h5.ui.components.artboard.controller.MagnifierController
		 * @instance
		 * @private
		 */
		__name: 'h5.ui.components.artboard.controller.MagnifierController',

		/**
		 * @memberOf h5.ui.components.artboard.controller.MagnifierController
		 * @instance
		 * @private
		 */
		_preSettigns: DEFAULT_SETTINGS,

		/**
		 * Magnifierの作成
		 * <p>
		 * {@link Magnifier}インスタンスを生成し、このコントローラのルートエレメントにMagnifier要素を追加します。
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.controller.MagnifierController
		 * @instance
		 * @param {DOM|jQuery} $board 拡大対象となるボード要素、またはボード要素を子に持つ要素。
		 * @param {Object} [settings={width:200,height:200,scale:2}]
		 *            設定オブジェクト。省略した場合はデフォルト、または前回createMagnifier呼び出し時の設定が適用されます
		 * @param {number} settings.width 生成するMagnifier要素の幅
		 * @param {number} settings.height 生成するMagnifier要素の高さ
		 * @param {number} settings.scale 拡大率(0以上の数値で指定)
		 * @param {boolean} [settings.mouseoverMove=false]
		 *            ボード上でマウス(タッチ)が起きた時にMagnifier要素の位置を追従をさせるかどうか
		 * @param {boolean} [settings.mouseoverFocus=false]
		 *            ボード上でマウス(タッチ)が起きた時にMagnifierが拡大するボードの座標位置を追従をさせるかどうか
		 * @param {boolean} [settings.mouseover=false]
		 *            mouseoverMove,mouseoverFocusの両フラグをtrueにする場合にtrueを設定
		 */
		createMagnifier: function(board, settings) {
			if (this._mag) {
				// 既に作成済みなら既存のものを破棄して新規に作成する
				this._mag.dispose && this._mag.dispose();
			}

			// レイヤを子に持つレイヤラッパー要素を取得
			$board = $(board);
			$board = $board.hasClass(CLASS_LAYERS) ? $board : $board.find('.' + CLASS_LAYERS);
			if ($board.length === 0) {
				throw new Error('createMagnifierの第1引数には' + CLASS_LAYERS
						+ 'クラス要素またはその要素を子に持つ要素を指定してください');
			} else if ($board.length > 1) {
				throw new Error(
						'createMagnifierの第1引数に指定された要素は複数のArtboardが含まれています。複数のArtboardを対象にはできません');
			}
			this._$board = $board;

			// 未指定の場合は前回設定値またはデフォルト
			settings = settings || this._preSettigns;
			this._preSettigns = settings;
			var mag = new Magnifier($board, {
				width: settings.width,
				height: settings.height,
				scale: settings.scale
			});
			this._mag = mag;
			var magElement = mag.getElement();
			$(this.rootElement).append(magElement);
			var mouseoverFocus = settings.mouseover || settings.mouseoverFocus;
			var mouseoverMove = settings.mouseover || settings.mouseoverMove;
			if (mouseoverFocus || mouseoverMove) {
				this._mouseoverController = h5.core.controller(this.rootElement,
						mouseoverController, {
							mag: mag,
							$board: $board,
							mouseoverFocus: mouseoverFocus,
							mouseoverMove: mouseoverMove
						});
				this.manageChild(this._mouseoverController);
			}
			return mag;
		}
	};

	//------------------------------------------------------------
	// expose
	//------------------------------------------------------------
	h5.core.expose(controller);
})(jQuery);