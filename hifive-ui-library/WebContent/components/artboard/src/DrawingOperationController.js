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
// h5.ui.components.SelectionLogic
//----------------------------------------------------------------------------
(function() {
	/**
	 * セレクションロジック
	 *
	 * @name h5.ui.components.SelectionLogic
	 */
	var logic = {
		/**
		 * @memberOf h5.ui.components.SelectionLogic
		 * @private
		 */
		__name: 'h5.ui.components.SelectionLogic',

		/**
		 * 選択されているオブジェクトの配列
		 *
		 * @memberOf h5.ui.components.SelectionLogic
		 * @private
		 */
		_selected: [],

		/**
		 * フォーカスされているオブジェクト
		 *
		 * @memberOf h5.ui.components.SelectionLogic
		 * @private
		 */
		_focused: null,

		/**
		 * 引数に渡されたオブジェクトが選択状態かどうか判定して返す
		 *
		 * @memberOf h5.ui.components.SelectionLogic
		 * @param {Any} obj
		 * @returns {Boolean}
		 */
		isSelected: function(obj) {
			return $.inArray(obj, this._selected) !== -1;
		},

		/**
		 * 選択されているオブジェクトのリストを返す
		 *
		 * @memberOf h5.ui.components.SelectionLogic
		 * @returns {Any[]}
		 */
		getSelected: function() {
			return this._selected;
		},

		/**
		 * フォーカスされているオブジェクトを返す
		 *
		 * @memberOf h5.ui.components.SelectionLogic
		 * @returns {Any}
		 */
		getFocusElement: function() {
			return this._focused;
		},

		/**
		 * オブジェクトをフォーカス状態にする
		 *
		 * @memberOf h5.ui.components.SelectionLogic
		 * @private
		 */
		focus: function(obj) {
			if (!this.isSelected(obj)) {
				//非選択状態であれば自動的に選択状態に(追加)する
				this.select(obj);
			}

			this._focused = obj;
		},

		/**
		 * フォーカス状態のオブジェクトを非フォーカス状態にする
		 *
		 * @memberOf h5.ui.components.SelectionLogic
		 * @param {Boolean} [withUnselect=true] trueの場合はunselectも実行する(デフォルトtrue)
		 */
		unfocus: function(withUnselect) {
			var focused = this._focused;
			this._focused = null;
			if (withUnselect !== false) {
				this.unselect(focused);
			}
		},

		/**
		 * 引数に渡されたオブジェクトを選択状態にする
		 * <p>
		 * 既に選択状態であるオブジェクトは無視します
		 * </p>
		 *
		 * @memberOf h5.ui.components.SelectionLogic
		 * @param {Any|Any[]} objs 配列で渡された場合はその中身を選択対象として扱います
		 * @param {Boolean} isExclusive trueが指定された場合、現在選択されているものを全て解除して、引数に渡されたものだけを選択状態にする
		 * @returns {Any[]} 実際に選択されたオブジェクトの配列を返す(既に選択済みだったものは除く)
		 */
		select: function(objs, isExclusive) {
			if (isExclusive) {
				this.unselectAll();
			}
			var objs = $.isArray(objs) ? objs : [objs];

			// デフォルトで、先頭のものをfocus状態にする
			var shouldRefocus = this._selected.length === 0;

			var actuals = [];

			for (var i = 0, l = objs.length; i < l; i++) {
				var obj = objs[i];
				if (this.isSelected(obj)) {
					// 選択済みなら何もしない
					continue;
				}

				this._selected.push(obj);
				actuals.push(obj);
			}
			if (actuals.length && shouldRefocus) {
				// フォーカスされているものが無ければ、今回追加したものの先頭をフォーカスする
				this.focus(actuals[0]);
			}
			return actuals;
		},

		/**
		 * 引数に渡されたオブジェクトの選択状態を解除する
		 * <p>
		 * 選択状態ではないオブジェクトは無視します
		 * </p>
		 *
		 * @memberOf h5.ui.components.SelectionLogic
		 * @param {Any|Any[]} objs 配列で渡された場合はその中身を選択解除する対象として扱います
		 * @returns {Any[]} 実際に選択の解除されたオブジェクトの配列を返す(既に選択状態ではなかったものは除く)
		 */
		unselect: function(objs) {
			var objs = $.isArray(objs) ? objs : [objs];
			var actuals = [];
			for (var i = 0, l = objs.length; i < l; i++) {
				var obj = objs[i];
				if (this.isSelected(obj)) {
					var idx = $.inArray(obj, this._selected);
					if (idx === -1) {
						continue;
					}
					// 選択状態を解除
					var spliced = this._selected.splice(idx, 1);
					actuals.push(spliced[0]);
					if (this._focus === obj) {
						// フォーカス状態ならフォーカスも解除
						this._focus = null;
					}
				}
			}
			return actuals;
		},

		/**
		 * 全ての選択状態のオブジェクトについて選択状態を解除する
		 *
		 * @memberOf h5.ui.components.SelectionLogic
		 * @returns {Any[]} 実際に選択の解除されたオブジェクトの配列を返す
		 */
		unselectAll: function() {
			var actuals = this._selected.splice(0);
			this.unfocus();
			return actuals;
		}
	};
	h5.core.expose(logic);
})();

//----------------------------------------------------------------------------
// ui.components.drawing.controller.DrawingOperationController
//----------------------------------------------------------------------------
(function() {
	//------------------------------------------------------------
	// Const
	//------------------------------------------------------------

	//------------------------------------------------------------
	// Body
	//------------------------------------------------------------
	/**
	 * DrawingControllerを使って描画を行うコントローラ
	 *
	 * @class
	 * @name h5.ui.components.drawing.controller.DrawingOperationController
	 */
	var controller = {
		/**
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		__name: 'h5.ui.components.drawing.controller.DrawingOperationController',

		/**
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @type h5.ui.components.drawing.controller.DrawingController
		 */
		drawingController: h5.ui.components.drawing.controller.DrawingController,

		/**
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @type h5.ui.components.SelectionLogic
		 */
		selectionLogic: h5.ui.components.SelectionLogic,

		/**
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		__meta: {
			drawingController: {
				rootElement: null
			}
		},

		/**
		 * 描画モード(定数)
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		MODE_DISABLE: 0,
		MODE_PEN: 'pen',
		MODE_LINE: 'line',
		MODE_RECT: 'rect',
		MODE_FILL_RECT: 'fillrect',
		MODE_CIRCLE: 'circle',
		MODE_FILL_CIRCLE: 'fillcircle',
		MODE_SELECT: 'select',

		/**
		 * canvas要素(__initで設定)
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		_canvas: null,

		/**
		 * 描画レイヤ要素
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		_layers: null,

		/**
		 * トラック操作中に保持するデータ
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		_trackingData: null,

		/**
		 * トラックして範囲選択するときに表示する要素(__initで設定)
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		_$selectionScopeRectangle: null,

		//------------------------------------------
		// 設定項目
		//------------------------------------------
		/**
		 * 線の色
		 * <p>
		 * デフォルト#000
		 * </p>
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		_strokeColor: '#000',

		/**
		 * 塗りつぶし色
		 * <p>
		 * デフォルト#fff
		 * </p>
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		_fillColor: '#fff',

		/**
		 * 線の太さ
		 * <p>
		 * デフォルト5
		 * </p>
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		_strokeWidth: 5,

		/**
		 * 線のopacity
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		_strokeOpacity: '1',

		/**
		 * 塗りつぶしのopacity
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		_fillOpacity: '1',

		/**
		 * ストロークの塗りつぶし色
		 * <p>
		 * デフォルト'none'
		 * </p>
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		_strokeFill: 'none',

		/**
		 * ストロークされる際の継ぎ目に利用される形状
		 * <p>
		 * 'miter','round','bevel'のいずれか。(デフォルト'round')
		 * </p>
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		_strokeLinejoin: 'round',

		/**
		 * ストロークの際に，開いた部分パスの両端に利用される形状
		 * <p>
		 * 'butt','round','square'のいずれか。(デフォルト'round')
		 * </p>
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		_strokeLinecap: 'round',

		/**
		 * 多角形の継ぎ目に利用される形状(デフォルト'miter')
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		_polygonLinejoin: 'miter',

		/**
		 * 描画モードの設定
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param mode
		 */
		setMode: function(mode) {
			if (mode === this.MODE_SELECT || mode === this.MODE_DISABLE) {
				// セレクトモード時は、canvasを隠す
				$(this._canvas).css('display', 'none');
			} else {
				// 描画時は、canvasを表示
				$(this._canvas).css('display', 'block');
			}
			this._mode = mode;
		},

		/**
		 * 線の色の設定
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param color
		 */
		setStrokeColor: function(color) {
			this._strokeColor = color;
		},

		/**
		 * 塗りつぶしの色の設定
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param color
		 */
		setFillColor: function(color) {
			this._fillColor = color;
		},

		/**
		 * 線のopacity設定
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param opacity
		 */
		setStrokeOpacity: function(opacity) {
			this._strokeOpacity = opacity.toString();
		},
		/**
		 * 塗りつぶしのopacity設定
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param opacity
		 */
		setFillOpacity: function(opacity) {
			this._fillOpacity = opacity.toString();
		},

		/**
		 * 線の太さ設定
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param lineWidth
		 */
		setStrokeWidth: function(lineWidth) {
			this._strokeWidth = lineWidth;
		},

		//		/**
		//		 * ストロークの塗りつぶし色(無しの場合は'none')
		//		 * @param strokeFill
		//		 */
		//		setStrokeFill: function(strokeFill) {
		//			this._strokeFill = strokeFill;
		//		},

		/**
		 * ストロークされる際の継ぎ目に利用される形状(bevel,round,miterの何れか)
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param strokeLinejoin
		 */
		setStrokeLinejoin: function(strokeLinejoin) {
			this._strokeLinejoin = strokeLinejoin;
		},

		/**
		 * ストロークの両端に利用される形状(butt, round, squareの何れか)
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param strokeLinecap
		 */
		setStrokeLinecap: function(strokeLinecap) {
			this._strokeLinecap = strokeLinecap;
		},

		/**
		 * 多角形の継ぎ目に利用される形状(bevel,round,miterの何れか)
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param polygonLinejoin
		 */
		setPolygonLinejoin: function(polygonLinejoin) {
			this._polygonLinejoin = polygonLinejoin;
		},

		/**
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 */
		__init: function() {
			// canvas要素を取得
			this._canvas = this.$find('canvas')[0];
			// レイヤ領域を取得
			this._layers = this.$find('.h5drawing-layers')[0];
			// drawingControllerのルートエレメントはレイヤ領域
			this.drawingController.rootElement = this._layers;
			// 選択ドラッグ中に表示する要素を作成
			this._$selectionScopeRectangle = $('<div class="selection-scope-rectangle"></div>');
			$(this.rootElement).append(this._$selectionScopeRectangle);
		},

		/**
		 * canvasをクリア
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 */
		clearCanvas: function() {
			var ctx = this._canvas.getContext('2d');
			var w = this._canvas.getAttribute('width');
			var h = this._canvas.getAttribute('height');
			ctx.clearRect(0, 0, w, h);
		},

		//----------------------------
		// トラックイベント
		//----------------------------
		/**
		 * canvas要素のトラックイベント
		 * <p>
		 * canvasにイベントが来るのは描画モードの場合のみ
		 * </p>
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param context
		 */
		'{this._canvas} h5trackstart': function(context) {
			// トラックデータの作成
			var event = context.event;
			event.stopPropagation();
			var layersOffset = $(this._layers).offset();
			var x = event.pageX - layersOffset.left;
			var y = event.pageY - layersOffset.top;
			this._trackingData = {
				start: {
					x: x,
					y: y
				},
				moved: false
			};
			this.trigger('drawstart');
			var startFunctionName = '_' + this._mode + 'DrawStart';
			this[startFunctionName] && this[startFunctionName](context);
		},
		/**
		 * canvas要素のトラックイベント
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param context
		 */
		'{this._canvas} h5trackmove': function(context) {
			var event = context.event;
			event.stopPropagation();
			this._trackingData.moved = true;
			var moveFunctionName = '_' + this._mode + 'DrawMove';
			this[moveFunctionName] && this[moveFunctionName](context);
		},
		/**
		 * canvas要素のトラックイベント
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param context
		 */
		'{this._canvas} h5trackend': function(context) {
			var event = context.event;
			event.stopPropagation();
			var endFunctionName = '_' + this._mode + 'DrawEnd';
			this[endFunctionName] && this[endFunctionName](context);
			this.trigger('drawend');
			this._trackingData = null;
		},

		/**
		 * 選択モード(canvasが無い)時のトラック操作のハンドラ
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param context
		 */
		'{rootElement} h5trackstart': function(context) {
			if (this._mode !== this.MODE_SELECT) {
				return;
			}
			// 座標をlayer位置基準にする
			var event = context.event;
			var layersOffset = $(this._layers).offset();
			var x = event.pageX - layersOffset.left;
			var y = event.pageY - layersOffset.top;
			this._trackingData = {
				start: {
					x: x,
					y: y
				},
				moved: false
			};
			this._selectTrackstart(context);
			// トラックスタート時に図形が新しく選択されたら、図形の移動のトラックに切り替える
			if (this._trackingData.selectedWhenTrackstart) {
				this._trackstartSelectedShape(event, this.$find('.selection-rectangle'));
			}
		},

		/**
		 * 選択モード時のトラック操作のハンドラ
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param context
		 */
		'{rootElement} h5trackmove': function(context) {
			context.event.preventDefault();
			if (this._mode !== this.MODE_SELECT) {
				return;
			}
			if (this._trackingData.selectedWhenTrackstart) {
				// トラックスタート時に図形が新しく選択されたら、図形の移動のトラック
				this._trackmoveSelectedShape(event, this.$find('.selection-rectangle'));
				return;
			}
			this._selectTrackmove(context);
		},

		/**
		 * 選択モード時のトラック操作のハンドラ
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param context
		 */
		'{rootElement} h5trackend': function(context) {
			if (this._mode !== this.MODE_SELECT) {
				return;
			}
			if (this._trackingData.selectedWhenTrackstart) {
				// トラックスタート時に図形が新しく選択されたら、図形の移動のトラック
				this._trackendSelectedShape(event, this.$find('.selection-rectangle'));
				return;
			}
			this._selectTrackend(context);
		},

		'{this._layers} mousemove': function(context) {
			if (this._mode !== this.MODE_SELECT) {
				return;
			}
			// カーソルの箇所に図形がどうかあるかを判定
			// 図形があればマウスカーソルをall-scrollにする
			var event = context.event;
			var layersOffset = $(this._layers).offset();
			var x = event.pageX - layersOffset.left;
			var y = event.pageY - layersOffset.top;
			// x,yの位置にあるshapeを取得
			var isHit = false;
			var shapes = this.drawingController.getAllShapes();
			for (var i = 0, l = shapes.length; i < l; i++) {
				if (shapes[i].isHitAt(x, y)) {
					isHit = true;
					break;
				}
			}
			// カーソルの設定
			$(this._layers).css('cursor', isHit ? 'all-scroll' : '');
		},

		//--------------------------------------------------------------
		// ペン描画
		//--------------------------------------------------------------
		/**
		 * ペン描画開始
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 * @param context
		 */
		_penDrawStart: function(context) {
			var start = this._trackingData.start;
			this._trackingData.d = 'M ' + start.x + ' ' + start.y + ' l';
		},

		/**
		 * ペン描画移動
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 * @param context
		 */
		_penDrawMove: function(context) {
			// canvasに描画
			var event = context.event;
			var layersOffset = $(this._layers).offset();
			var x = event.pageX - layersOffset.left;
			var y = event.pageY - layersOffset.top;
			var dx = event.dx;
			var dy = event.dy;
			var ctx = this._canvas.getContext('2d');
			ctx.globalAlpha = this._strokeOpacity;
			ctx.strokeStyle = this._strokeColor;
			ctx.lineWidth = this._strokeWidth;
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(x - dx, y - dy);
			ctx.lineTo(x, y);
			ctx.stroke();
			ctx.closePath();

			// pathデータを更新
			this._trackingData.d += ' ' + dx + ' ' + dy;
		},

		/**
		 * ペン描画終了
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 * @param context
		 */
		_penDrawEnd: function(context) {
			if (!this._trackingData.moved) {
				// 動いていないなら描画しない
				return;
			}
			// 確定
			this.drawingController.drawPath({
				pathData: this._trackingData.d,
				style: {
					stroke: this._strokeColor,
					strokeOpacity: this._strokeOpacity,
					strokeWidth: this._strokeWidth,
					fill: this._strokeFill,
					fillOpacity: this._strokefillOpacity,
					strokeLinejoin: this._strokeLinejoin,
					strokeLinecap: this._strokeLinecap
				}
			});
			// カンバスのクリア
			// (ちらつき防止のためtimeoutで削除)
			setTimeout(this.own(function() {
				// カンバスをクリア
				this.clearCanvas();
			}), 0);

			// リセット
			this._drawingPath = null;
		},

		//--------------------------------------------------------------
		// ライン描画
		//--------------------------------------------------------------
		/**
		 * ライン描画移動
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 * @param context
		 */
		_lineDrawMove: function(context) {
			// canvasに描画
			// ラインを引く前に削除
			this.clearCanvas();
			var event = context.event;
			var layersOffset = $(this._layers).offset();
			var x = event.pageX - layersOffset.left;
			var y = event.pageY - layersOffset.top;
			var start = this._trackingData.start;
			var ctx = this._canvas.getContext('2d');
			ctx.strokeStyle = this._strokeColor;
			ctx.globalAlpha = this._strokeOpacity;
			ctx.lineWidth = this._strokeWidth;
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(start.x, start.y);
			ctx.lineTo(x, y);
			ctx.stroke();
			ctx.closePath();
		},

		/**
		 * ライン描画終了
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 * @param context
		 */
		_lineDrawEnd: function(context) {
			if (!this._trackingData.moved) {
				// 動いていないなら描画しない
				return;
			}

			var event = context.event;
			var start = this._trackingData.start;
			var startX = start.x;
			var startY = start.y;
			var endX = event.offsetX;
			var endY = event.offsetY;

			// 確定
			this.drawingController.drawPath({
				pathData: h5.u.str.format('M {0} {1} l {2} {3}', startX, startY, endX - startX,
						endY - startY),
				style: {
					stroke: this._strokeColor,
					strokeOpacity: this._strokeOpacity,
					strokeWidth: this._strokeWidth,
					strokeLinecap: this._strokeLinecap
				}
			});
			// カンバスのクリア
			// (ちらつき防止のためtimeoutで削除)
			setTimeout(this.own(function() {
				// カンバスをクリア
				this.clearCanvas();
			}), 0);

			// リセット
			this._drawingPath = null;
		},

		//--------------------------------------------------------------
		// 矩形描画
		//--------------------------------------------------------------
		/**
		 * 矩形描画移動
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 * @param context
		 */
		_rectDrawMove: function(context, isFill) {
			// canvasに描画
			// 矩形を引く前に削除
			this.clearCanvas();
			var event = context.event;
			var layersOffset = $(this._layers).offset();
			var x = event.pageX - layersOffset.left;
			var y = event.pageY - layersOffset.top;
			var startX = this._trackingData.start.x;
			var startY = this._trackingData.start.y;
			var ctx = this._canvas.getContext('2d');
			ctx.strokeStyle = this._strokeColor;
			ctx.lineWidth = this._strokeWidth;
			ctx.lineJoin = this._polygonLinejoin;
			if (isFill) {
				ctx.save();
				ctx.globalAlpha = this._fillOpacity;
				ctx.fillStyle = this._fillColor;
				var fillMargin = this._strokeWidth / 2;
				ctx.fillRect(startX, startY, x - startX + fillMargin / 8 - 1, y - startY
						+ fillMargin / 8 - 1);
				ctx.restore();
			}
			ctx.globalAlpha = this._strokeOpacity;
			ctx.strokeRect(startX, startY, x - startX, y - startY);
		},

		/**
		 * 矩形描画終了
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 * @param context
		 */
		_rectDrawEnd: function(context, isFill) {
			if (!this._trackingData.moved) {
				// 動いていないなら描画しない
				this._trackingData = null;
				return;
			}

			var event = context.event;
			var start = this._trackingData.start;
			var startX = start.x;
			var startY = start.y;
			var width = event.offsetX - startX;
			var height = event.offsetY - startY;
			if (width === 0 || height === 0) {
				// 幅または高さが0なら何もしない
				this._trackingData = null;
				return;
			}
			if (width < 0) {
				startX += width;
				width = -width;
			}
			if (height < 0) {
				startY += height;
				height = -height;
			}

			// 確定
			this.drawingController.drawRect(startX, startY, width, height, {
				stroke: this._strokeColor,
				strokeOpacity: this._strokeOpacity,
				strokeWidth: this._strokeWidth,
				fill: isFill ? this._fillColor : 'none',
				fillOpacity: isFill ? this._fillOpacity : '1',
				polygonLinejoin: this._polygonLinejoin
			});

			// カンバスのクリア
			// (ちらつき防止のためtimeoutで削除)
			setTimeout(this.own(function() {
				// カンバスをクリア
				this.clearCanvas();
			}), 0);

			// リセット
			this._trackingData = null;
		},

		//--------------------------------------------------------------
		// 矩形描画(塗りつぶしあり)
		//--------------------------------------------------------------
		_fillrectDrawMove: function(context) {
			this._rectDrawMove(context, true);
		},
		_fillrectDrawEnd: function(context) {
			this._rectDrawEnd(context, true);
		},

		//--------------------------------------------------------------
		// 円描画
		//--------------------------------------------------------------
		/**
		 * 円描画移動
		 *
		 * @param context
		 * @param isFill 塗りつぶすかどうか
		 */
		_circleDrawMove: function(context, isFill) {
			// canvasに描画
			// 円を引く前に削除
			this.clearCanvas();
			var event = context.event;
			var layersOffset = $(this._layers).offset();
			var x = event.pageX - layersOffset.left;
			var y = event.pageY - layersOffset.top;
			var start = this._trackingData.start;
			var startX = start.x;
			var startY = start.y;

			var cx = (startX + x) * 0.5;
			var cy = (startY + y) * 0.5;
			var rx = x > cx ? x - cx : cx - x;
			var ry = y > cy ? y - cy : cy - y;

			if (rx === 0 || ry === 0) {
				// 半径0なら何もしない
				return;
			}
			var ctx = this._canvas.getContext('2d');
			ctx.strokeStyle = this._strokeColor;
			ctx.lineWidth = this._strokeWidth;
			var sx = rx > ry ? rx / ry : 1;
			var sy = rx > ry ? 1 : ry / rx;
			ctx.translate(cx, cy);
			ctx.scale(sx, sy);
			if (isFill) {
				ctx.beginPath();
				ctx.globalAlpha = this._fillOpacity;
				ctx.fillStyle = this._fillColor;
				ctx.arc(0, 0, rx > ry ? ry : rx, 0, Math.PI * 2, true);
				ctx.fill();
			}
			ctx.beginPath();
			ctx.arc(0, 0, rx > ry ? ry : rx, 0, Math.PI * 2, true);
			//			ctx.translate(-cx + rx, -cy + ry);
			ctx.scale(1 / sx, 1 / sy);
			ctx.translate(-cx, -cy);
			ctx.globalAlpha = this._strokeOpacity;
			ctx.stroke();
		},

		/**
		 * 円描画終了
		 *
		 * @param context
		 * @param isFill 塗りつぶすかどうか
		 */
		_circleDrawEnd: function(context, isFill) {
			if (!this._trackingData.moved) {
				// 動いていないなら描画しない
				this._trackingData = null;
				return;
			}
			var event = context.event;
			var x = event.offsetX;
			var y = event.offsetY;
			var start = this._trackingData.start;
			var startX = start.x;
			var startY = start.y;
			var cx = (startX + x) * 0.5;
			var cy = (startY + y) * 0.5;
			var rx = x > cx ? x - cx : cx - x;
			var ry = y > cy ? y - cy : cy - y;
			if (rx === 0 || ry === 0) {
				// 半径0なら何もしない
				return;
			}
			this.drawingController.drawEllipse(cx, cy, rx, ry, {
				stroke: this._strokeColor,
				strokeOpacity: this._strokeOpacity,
				strokeWidth: this._strokeWidth,
				fill: isFill ? this._fillColor : 'none',
				fillOpacity: isFill ? this._fillOpacity : '1'
			});

			// カンバスのクリア
			// (ちらつき防止のためtimeoutで削除)
			setTimeout(this.own(function() {
				// カンバスをクリア
				this.clearCanvas();
			}), 0);

			// リセット
			this._trackingData = null;
		},

		//--------------------------------------------------------------
		// 円描画(塗りつぶしあり)
		//--------------------------------------------------------------
		_fillcircleDrawMove: function(context) {
			this._circleDrawMove(context, true);
		},
		_fillcircleDrawEnd: function(context) {
			this._circleDrawEnd(context, true);
		},

		//--------------------------------------------------------------
		// 図形の選択
		//--------------------------------------------------------------
		//--------------------------------
		// 選択された図形をドラッグで移動
		//--------------------------------
		/**
		 * 選択された図形の操作
		 */
		'.selection-rectangle h5trackstart': function(context, $el) {
			this._trackstartSelectedShape(context.event, $el);
		},

		'.selection-rectangle h5trackmove': function(context, $el) {
			this._trackmoveSelectedShape(context.event, $el);
		},

		'.selection-rectangle h5trackend': function(context, $el) {
			this._trackendSelectedShape(context.event, $el);
		},

		_trackstartSelectedShape: function(event, $el) {
			event.stopPropagation();
			var selectedShapes = this.selectionLogic.getSelected();
			if (selectedShapes.length === 0) {
				return;
			}

			// ドラッグセッションの開始
			var sessions = [];
			for (var i = 0, l = selectedShapes.length; i < l; i++) {
				var shape = selectedShapes[i];
				sessions.push(shape.beginDrag());
				var id = this.drawingController.getShapeID(shape);
			}

			// ドラッグ開始時の選択範囲表示要素の位置
			var selectionRectPositions = [];
			var $selectionRectangles = $('.selection-rectangle');
			$selectionRectangles.each(function() {
				var $rect = $(this);
				selectionRectPositions.push({
					left: parseInt($rect.css('left')),
					top: parseInt($rect.css('top'))
				});
			});

			this._trackingData = {
				// ドラッグ開始位置
				start: {
					pageX: event.pageX,
					pageY: event.pageY,
					selectionRectPositions: selectionRectPositions,
					$selectionRectangles: $selectionRectangles
				},
				sessions: sessions,
				moved: false,
				// 選択してすぐにトラックするモードになったかどうか
				selectedWhenTrackstart: this._trackingData
						&& this._trackingData.selectedWhenTrackstart
			};
		},

		_trackmoveSelectedShape: function(event, $el) {
			event.stopPropagation();
			var trackingData = this._trackingData;
			var start = trackingData.start;
			var tx = event.pageX - start.pageX;
			var ty = event.pageY - start.pageY;

			trackingData.moved = true;

			// 選択範囲表示の移動
			var selectionRectPositions = start.selectionRectPositions;
			start.$selectionRectangles.each(function(index) {
				$(this).css({
					left: selectionRectPositions[index].left + tx,
					top: selectionRectPositions[index].top + ty
				});
			});

			// 図形の移動
			var sessions = this._trackingData.sessions;
			for (var i = 0, l = sessions.length; i < l; i++) {
				sessions[i].move(tx, ty);
			}
		},

		_trackendSelectedShape: function(event, $el) {
			event.stopPropagation();
			var trackingData = this._trackingData;
			if (!trackingData.moved) {
				// 動いていないなら何もしない
				return;
			}
			var sessions = trackingData.sessions;
			// 図形の位置を確定
			// アップデートセッション内で行う
			this.drawingController.beginUpdate();
			for (var i = 0, l = sessions.length; i < l; i++) {
				sessions[i].end();
			}
			this.drawingController.endUpdate();
			this._trackingData = null;
		},

		/**
		 * 図形の選択
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param {Shape|Shape[]} shapes
		 * @param {Boolean} isExclusive trueの場合は既に選択状態の図形について選択状態を解除する
		 */
		select: function(shapes, isExclusive) {
			var selectionLogic = this.selectionLogic;
			if (isExclusive) {
				selectionLogic.unselectAll();
			}
			var selected = selectionLogic.select(shapes);
			// 選択した図形を示すための要素を作成
			for (var i = 0, l = selected.length; i < l; i++) {
				var shape = selected[i];
				this._addSelectionRectangle(shape);
			}
			// 選択された図形のリストをイベントであげる
			if (selected.length) {
				this.trigger('select-shape', selected);
			}
		},

		/**
		 * 図形の選択状態を解除
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @param {Shape|Shape[]} shapes
		 */
		unselect: function(shapes) {
			var selectionLogic = this.selectionLogic;
			var unselected = selectionLogic.unselect(shapes);
			for (var i = 0, l = unselected.length; i < l; i++) {
				var shape = unselected[i];
				this._removeSelectionRectangle(shape);
			}
			if (unselected.length) {
				this.trigger('unselect-shape', unselected);
			}
		},

		/**
		 * 全ての描画されている図形を選択状態にする
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 */
		selectAll: function() {
			var shapes = this.drawingController.getAllShapes();
			var appendedShapes = [];
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.isAppending()) {
					appendedShapes.push(shape);
				}
			}
			this.select(appendedShapes);
		},

		/**
		 * 全ての選択状態である図形について選択状態を解除
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 */
		unselectAll: function(Shapes) {
			var selectionLogic = this.selectionLogic;
			var unselected = selectionLogic.unselectAll();
			for (var i = 0, l = unselected.length; i < l; i++) {
				this._removeSelectionRectangle(unselected[i]);
			}
			if (unselected.length) {
				this.trigger('unselect-shape', unselected);
			}
		},

		/**
		 * 選択されている図形リストを取得
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @returns {Shapes[]}
		 */
		getSelectedShapes: function() {
			return this.selectionLogic.getSelected();
		},
		/**
		 * セレクトモード時の選択操作
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 * @param context
		 */
		_selectTrackstart: function(context) {
			var event = context.event;
			if (!event.ctrlKey) {
				// PC限定：ctrlキーが押されていればunselectしない
				this.unselectAll();
			}
			var trackingData = this._trackingData;
			var x = trackingData.start.x;
			var y = trackingData.start.y;
			// x,yの位置にあるshapeを取得
			var shapes = this.drawingController.getAllShapes();
			var selectedShapes = [];
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.isHitAt(x, y)) {
					selectedShapes.push(shape);
				}
			}
			if (selectedShapes.length) {
				// shapeがある場所の操作なら、その場所の一番前の要素を選択して終了
				this.select(selectedShapes[selectedShapes.length - 1]);
				this._trackingData.selectedWhenTrackstart = true;
				return;
			}
			// shapeが無い場所からの選択操作なら、ドラッグして選択させるようにする
			// 範囲選択用の要素を作成
			this._$selectionScopeRectangle.css({
				top: x,
				left: y,
				width: 0,
				height: 0
			});
			this._trackingData = {
				start: {
					x: x,
					y: y
				},
				trackingRect: {
					x: x,
					y: y,
					w: 0,
					h: 0
				}
			};
		},

		/**
		 * セレクトモード時のドラッグ選択操作
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 * @param context
		 */
		_selectTrackmove: function(context) {
			var event = context.event;
			var trackingData = this._trackingData;
			var start = trackingData.start;
			var x = start.x;
			var y = start.y;
			var layersOffset = $(this._layers).offset();
			// 選択ドラッグ中はsvg要素がトップに来ているため、このイベントはsvg要素(又はその子要素)からのイベント
			// svg要素のイベントはブラウザによってはoffsetが取れないので、pageX/pageYから計算している
			var w = event.pageX - layersOffset.left - x;
			var h = event.pageY - layersOffset.top - y;
			if (w < 0) {
				w = -w;
				x = x - w;
			}
			if (h < 0) {
				h = -h;
				y = y - h;
			}
			var rect = trackingData.trackingRect;
			rect.x = x;
			rect.y = y;
			rect.w = w;
			rect.h = h;
			this._$selectionScopeRectangle.css({
				display: 'block',
				left: x,
				top: y,
				width: w,
				height: h
			});
		},

		/**
		 * セレクトモード時のドラッグ選択操作
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 * @param context
		 */
		_selectTrackend: function(context) {
			this._$selectionScopeRectangle.css({
				display: 'none'
			});
			// 選択範囲にある図形を列挙
			var trackingData = this._trackingData;
			var rect = trackingData.trackingRect;
			var x = rect.x;
			var y = rect.y;
			var w = rect.w;
			var h = rect.h;
			var shapes = this.drawingController.getAllShapes();
			var containedShapes = [];
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.isInRect(x, y, w, h)) {
					containedShapes.push(shape);
				}
			}
			this.select(containedShapes);
		},

		/**
		 * 指定された図形について、選択範囲表示を削除する
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 * @param shape
		 */
		_removeSelectionRectangle: function(shape) {
			var id = this.drawingController.getShapeID(shape);
			$('.selection-rectangle[data-target-shape-id=' + id + ']').remove();
		},

		/**
		 * 指定された図形について、選択範囲表示を表示する
		 *
		 * @memberOf h5.ui.components.drawing.controller.DrawingOperationController
		 * @private
		 * @param shape
		 */
		_addSelectionRectangle: function(shape) {
			var id = this.drawingController.getShapeID(shape);
			var $selectionRectangle = $('<div class="selection-rectangle" data-target-shape-id="'
					+ id + '"></div>');
			$(this.rootElement).append($selectionRectangle);
			var bBox = shape.getBBox();
			$selectionRectangle.css({
				display: 'block',
				left: bBox.x,
				top: bBox.y,
				width: bBox.width,
				height: bBox.height
			});
		}
	};

	//------------------------------------------------------------
	// expose
	//------------------------------------------------------------
	h5.core.expose(controller);
})();