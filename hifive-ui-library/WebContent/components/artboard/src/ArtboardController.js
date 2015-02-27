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
// h5.ui.components.artboard.logic.ArtboadCommandLogic
//----------------------------------------------------------------------------
(function() {
	/**
	 * ArtboadCommandLogic
	 * <p>
	 * ArtboadCommandLogicは{@link h5.ui.components.artboard.logic.ArtboadCommandLogic}によって生成されたコマンドのトランザクション管理を行います。
	 * </p>
	 *
	 * @class
	 * @name h5.ui.components.artboard.logic.ArtboadCommandLogic
	 */
	var artboadCommandLogic = {
		/**
		 * @memberOf h5.ui.components.artboard.logic.ArtboadCommandLogic
		 * @type String
		 */
		__name: 'h5.ui.components.artboard.logic.ArtboadCommandLogic',

		/**
		 * @memberOf h5.ui.components.artboard.logic.ArtboadCommandLogic
		 * @type CommandManager
		 */
		_commandManager: null,

		/**
		 * transactionIdとコマンドのマップ
		 *
		 * @private
		 */
		_transactionMap: {},

		/**
		 * appendCommandを使ってcommandManagerに追加した最後のコマンド
		 *
		 * @private
		 */
		_lastAppendedCommand: null,


		/**
		 * transactionIdを生成するシーケンス
		 *
		 * @private
		 */
		_transactionIdSeq: h5.core.data.createSequence(),

		/**
		 * 初期化
		 *
		 * @param {CommandManager}
		 */
		init: function(commandManager) {
			// CommandManagerの設定
			this._commandManager = commandManager;
		},

		/**
		 * コマンドを実行して登録する
		 * <p>
		 * noExecuteがtrueの場合はコマンドを実行せずに登録します。
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.logic.ArtboadCommandLogic
		 * @param {Command} command コマンド
		 * @param {Integer} transactionId トランザクションID
		 * @param {boolean} noExecute 実行しない場合はtrueを指定
		 */
		appendCommand: function(command, transactionId, noExecute) {
			if (!noExecute) {
				command.execute();
			}
			transactionId = transactionId || this._updateTransactionId;
			if (transactionId) {
				// transactionの指定がある場合、Command配列に追加する
				var commands = this._transactionMap[transactionId].push(command);
				return;
			}
			this._commandManager.append(command);
			this._lastAppendedCommand = command;
		},

		/**
		 * アップデートセッションを開始します
		 * <p>
		 * アップデートセッショントランザクションを作成し、アップデートセッション中は、
		 * appendCommandでtransactionIdを指定しないでコマンドが追加されたとき、アップデートセッショントランザクションに登録されます。
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.logic.ArtboadCommandLogic
		 */
		beginUpdate: function() {
			if (this._updateTransactionId) {
				return this._updateTransactionId;
			}
			var transactionId = this.createTransaction();
			this._updateTransactionId = transactionId;
		},

		/**
		 * アップデートセッションを終了します
		 *
		 * @memberOf h5.ui.components.artboard.logic.ArtboadCommandLogic
		 * @param {boolean} noExecute 実行しない場合はtrueを指定
		 */
		endUpdate: function() {
			if (!this._updateTransactionId) {
				return;
			}
			var transactionId = this._updateTransactionId;
			this._updateTransactionId = null;
			// コミット
			this.commitTransaction(transactionId);
		},

		/**
		 * トランザクションを生成し、トランザクションIDを返します
		 *
		 * @memberOf h5.ui.components.artboard.logic.ArtboadCommandLogic
		 * @returns {Integer} トランザクションID
		 */
		createTransaction: function() {
			var transactionId = this._transactionIdSeq.next();
			this._transactionMap[transactionId] = [];
			return transactionId;
		},

		/**
		 * トランザクションのコミット
		 *
		 * @memberOf h5.ui.components.artboard.logic.ArtboadCommandLogic
		 * @param transactionId トランザクションID
		 * @param {boolean} noExecute 実行しない場合はtrueを指定
		 */
		commitTransaction: function(transactionId, noExecute) {
			var commands = this._transactionMap[transactionId];
			if (!commands.length) {
				return;
			}
			var command = commands.length === 1 ? commands[0]
					: new h5.ui.components.artboard.SequenceCommand(commands);
			delete this._transactionMap[transactionId];
			this.appendCommand(command, null, noExecute);
		},

		/**
		 * トランザクションの中断
		 *
		 * @memberOf h5.ui.components.artboard.logic.ArtboadCommandLogic
		 * @param transactionId
		 */
		abortTransaction: function(transactionId) {
			var sequenceCommand = this._transactionMap[transactionId];
			delete this._transactionMap[transactionId];
			new h5.ui.components.artboard.SequenceCommand(sequenceCommand).undo();
		},

		/**
		 * 取り消し
		 *
		 * @memberOf h5.ui.components.artboard.logic.ArtboadCommandLogic
		 */
		undo: function() {
			this._commandManager.undo();
		},

		/**
		 * やり直し
		 *
		 * @memberOf h5.ui.components.artboard.logic.ArtboadCommandLogic
		 */
		redo: function() {
			this._commandManager.redo();
		},

		/**
		 * 履歴をすべて削除
		 *
		 * @memberOf h5.ui.components.artboard.logic.ArtboadCommandLogic
		 */
		clearAll: function() {
			this.abortTransaction();
			this._commandManager.clearAll();
		}
	};
	h5.core.expose(artboadCommandLogic);
})();

//----------------------------------------------------------------------------
// h5.ui.components.artboard.controller.ArtboardController
//----------------------------------------------------------------------------
(function() {
	//------------------------------------------------------------
	// Cache
	//------------------------------------------------------------
	// CommandManagerが上げるイベント名
	/** undoができるようになった時に上がるイベント名 */
	var EVENT_ENABLE_UNDO = h5.ui.components.artboard.consts.EVENT_ENABLE_UNDO;

	/** redoができるようになった時に上がるイベント名 */
	var EVENT_ENABLE_REDO = h5.ui.components.artboard.consts.EVENT_ENABLE_REDO;

	/** undoができなくなった時に上がるイベント名 */
	var EVENT_DISABLE_UNDO = h5.ui.components.artboard.consts.EVENT_DISABLE_UNDO;

	/** redoが出来なくなったときに上がるイベント名 */
	var EVENT_DISABLE_REDO = h5.ui.components.artboard.consts.EVENT_DISABLE_REDO;

	// ArtboardControllerが上げるイベント名
	/** 描画操作を開始した時に上がるイベント名 */
	var EVENT_DRAWSTART = h5.ui.components.artboard.consts.EVENT_DRAWSTART;

	/** 描画操作を終了した時に上がるイベント名 */
	var EVENT_DRAWEND = h5.ui.components.artboard.consts.EVENT_DRAWEND;

	/** 図形を選択した時に上がるイベント名 */
	var EVENT_SELECT_SHAPE = h5.ui.components.artboard.consts.EVENT_SELECT_SHAPE;

	/** 図形の選択を解除した時に上がるイベント名 */
	var EVENT_UNSELECT_SHAPE = h5.ui.components.artboard.consts.EVENT_UNSELECT_SHAPE;

	//------------------------------------------------------------
	// Body
	//------------------------------------------------------------
	/**
	 * DrawingLogicを使って描画を行うコントローラ
	 *
	 * @class
	 * @name h5.ui.components.artboard.controller.ArtboardController
	 */
	var controller = {
		/**
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		__name: 'h5.ui.components.artboard.controller.ArtboardController',

		/**
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @type h5.ui.components.SelectionLogic
		 */
		selectionLogic: h5.ui.components.SelectionLogic,

		/**
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @type h5.ui.components.artboard.logic.DrawingLogic
		 */
		drawingLogic: h5.ui.components.artboard.logic.DrawingLogic,

		/**
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 */
		artboadCommandLogic: h5.ui.components.artboard.logic.ArtboadCommandLogic,

		/**
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 */
		imageSourceMap: {},

		/**
		 * 描画モード(定数)
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		MODE_DISABLE: 0,
		MODE_PEN: 'pen',
		MODE_LINE: 'line',
		MODE_RECT: 'rect',
		MODE_FILL_RECT: 'fillrect',
		MODE_CIRCLE: 'circle',
		MODE_FILL_CIRCLE: 'fillcircle',
		MODE_TEXT: 'text',
		MODE_SELECT: 'select',

		/**
		 * canvas要素(__initで設定)
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		_canvas: null,

		/**
		 * canvas要素のcontext(__initで設定)
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		_canvasContext: null,

		/**
		 * 描画レイヤ要素
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		_layers: null,

		/**
		 * トラック操作中に保持するデータ
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		_trackingData: null,

		/**
		 * トラックして範囲選択するときに表示する要素(__initで設定)
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		_strokeColor: '#000',

		/**
		 * 塗りつぶし色
		 * <p>
		 * デフォルト#fff
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		_fillColor: '#fff',

		/**
		 * 線の太さ
		 * <p>
		 * デフォルト5
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		_strokeWidth: 5,

		/**
		 * 線のopacity
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		_strokeOpacity: '1',

		/**
		 * 塗りつぶしのopacity
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		_fillOpacity: '1',

		/**
		 * ストロークの塗りつぶし色
		 * <p>
		 * デフォルト'none'
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		_strokeFill: 'none',

		/**
		 * ストロークされる際の継ぎ目に利用される形状
		 * <p>
		 * 'miter','round','bevel'のいずれか。(デフォルト'round')
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		_strokeLinejoin: 'round',

		/**
		 * ストロークの際に，開いた部分パスの両端に利用される形状
		 * <p>
		 * 'butt','round','square'のいずれか。(デフォルト'round')
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		_strokeLinecap: 'round',

		/**
		 * 多角形の継ぎ目に利用される形状(デフォルト'miter')
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		_polygonLinejoin: 'miter',

		/**
		 * 描画モードの設定
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param mode
		 */
		setMode: function(mode) {
			if (mode === this.MODE_SELECT || mode === this.MODE_DISABLE || mode === this.MODE_TEXT) {
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
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param color
		 */
		setStrokeColor: function(color) {
			this._strokeColor = color;
		},

		/**
		 * 塗りつぶしの色の設定
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param color
		 */
		setFillColor: function(color) {
			this._fillColor = color;
		},

		/**
		 * 線のopacity設定
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param opacity
		 */
		setStrokeOpacity: function(opacity) {
			this._strokeOpacity = opacity.toString();
		},
		/**
		 * 塗りつぶしのopacity設定
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param opacity
		 */
		setFillOpacity: function(opacity) {
			this._fillOpacity = opacity.toString();
		},

		/**
		 * 線の太さ設定
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param strokeLinejoin
		 */
		setStrokeLinejoin: function(strokeLinejoin) {
			this._strokeLinejoin = strokeLinejoin;
		},

		/**
		 * ストロークの両端に利用される形状(butt, round, squareの何れか)
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param strokeLinecap
		 */
		setStrokeLinecap: function(strokeLinecap) {
			this._strokeLinecap = strokeLinecap;
		},

		/**
		 * 多角形の継ぎ目に利用される形状(bevel,round,miterの何れか)
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param polygonLinejoin
		 */
		setPolygonLinejoin: function(polygonLinejoin) {
			this._polygonLinejoin = polygonLinejoin;
		},

		/**
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 */
		__init: function() {
			// canvas要素を取得
			this._canvas = this.$find('canvas')[0];
			this._canvasContext = this._canvas.getContext('2d');

			// 選択ドラッグ中に表示する要素を作成
			this._$selectionScopeRectangle = $('<div class="selection-scope-rectangle"></div>');
			$(this.rootElement).append(this._$selectionScopeRectangle);

			// drawingLogicのセットアップ
			// レイヤ領域を取得
			var $layers = this.$find('.h5drawing-layers');
			this._layers = $layers[0];
			var svgLayerElement = $layers.find('.svg-layer')[0];
			var backgroundLayerElement = $layers.find('.background-layer')[0];

			// ロジックの初期化
			var commandManager = new h5.ui.components.artboard.CommandManager();
			this.artboadCommandLogic.init(commandManager);
			this.drawingLogic.init(svgLayerElement, backgroundLayerElement,
					this.artboadCommandLogic);
			this.drawingLogic.imageSourceMap = this.imageSourceMap;

			// スクロールされないようにタッチのあるブラウザでtouchmoveのpreventDefaultを設定
			// (SVG要素にはtouch-action:noneが効かないため、preventDefault()で制御する)
			if (document.ontouchstart !== undefined) {
				$(svgLayerElement).addClass('touchmove-cancel');
				this.on('{.touchmove-cancel}', 'touchmove', function(context) {
					context.event.preventDefault();
				});
			}
			// CommandManagerにイベントをバインドする
			// undo/redoが可能/不可能になった時にルートエレメントからイベントをあげる
			var events = [EVENT_ENABLE_UNDO, EVENT_ENABLE_REDO, EVENT_DISABLE_UNDO,
					EVENT_DISABLE_REDO];
			for (var i = 0, l = events.length; i < l; i++) {
				this.on(commandManager, events[i], function(context) {
					this.trigger(context.event.type);
				});
			}
		},

		/**
		 * canvasをクリア
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 */
		clearCanvas: function() {
			var ctx = this._canvasContext;
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
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
			this.trigger(EVENT_DRAWSTART);
			var startFunctionName = '_' + this._mode + 'DrawStart';
			this[startFunctionName] && this[startFunctionName](context);
		},
		/**
		 * canvas要素のトラックイベント
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param context
		 */
		'{this._canvas} h5trackend': function(context) {
			var event = context.event;
			event.stopPropagation();
			var endFunctionName = '_' + this._mode + 'DrawEnd';
			this[endFunctionName] && this[endFunctionName](context);
			this.trigger(EVENT_DRAWEND);
			this._trackingData = null;
		},

		/**
		 * 選択モード(canvasが無い)時のトラック操作のハンドラ
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param context
		 */
		'{rootElement} h5trackmove': function(context) {
			context.event.preventDefault();
			if (this._mode !== this.MODE_SELECT) {
				return;
			}
			if (this._trackingData.selectedWhenTrackstart) {
				// トラックスタート時に図形が新しく選択されたら、図形の移動のトラック
				this._trackmoveSelectedShape(context.event, this.$find('.selection-rectangle'));
				return;
			}
			this._selectTrackmove(context);
		},

		/**
		 * 選択モード時のトラック操作のハンドラ
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param context
		 */
		'{rootElement} h5trackend': function(context) {
			if (this._mode !== this.MODE_SELECT) {
				return;
			}
			if (this._trackingData.selectedWhenTrackstart) {
				// トラックスタート時に図形が新しく選択されたら、図形の移動のトラック
				this._trackendSelectedShape(context.event, this.$find('.selection-rectangle'));
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
			var shapes = this.getAllShapes(true);
			for (var i = 0, l = shapes.length; i < l; i++) {
				if (shapes[i].hitTest(x, y)) {
					isHit = true;
					break;
				}
			}
			// カーソルの設定
			$(this._layers).css('cursor', isHit ? 'all-scroll' : '');
		},

		//--------------------------------------------------------------
		// DrawingLogicの操作
		//--------------------------------------------------------------
		//
		/**
		 * 描画されている図形からセーブデータを作成します
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @returns {DrawingSaveData}
		 */
		save: function() {
			return this.drawingLogic.save();
		},

		/**
		 * セーブデータををロードして描画します
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {DrawingSaveData}
		 */
		load: function(artboardSaveData) {
			this.drawingLogic.load(artboardSaveData);
		},

		/**
		 * 操作の取り消し
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 */
		undo: function() {
			this.drawingLogic.undo();
		},

		/**
		 * 操作のやり直し
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 */
		redo: function() {
			this.drawingLogic.redo();
		},

		/**
		 * アップデートセッションの開始
		 * <p>
		 * このメソッドを呼ぶと、次に<a href="#endUpdate">endUpdate()</a>を呼ぶまで、undoデータは作られません。
		 * </p>
		 * <p>
		 * 描画や既存の図形の変更などの操作を複数回行った結果を１つのundoデータにしたい場合はこのメソッドを使用してください
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 */
		beginUpdate: function() {
			this.artboadCommandLogic.beginUpdate();
		},

		/**
		 * アップデートセッションの終了
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {boolean} shouldMerge 直前の同一トランザクションのコマンドとマージできる場合にマージするかどうか
		 */
		endUpdate: function(shouldMerge) {
			this.artboadCommandLogic.endUpdate(shouldMerge);
		},

		/**
		 * 描画されている図形を画像データにして返します
		 * <p>
		 * このメソッドはプロミスを返し、非同期で画像のデータURLを返します。画像が使用されている場合は非同期になる場合があります。
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {String} [returnType="image/png"] imgage/png, image/jpeg, image/svg+xml のいずれか
		 * @param {Object} [processParameter]
		 * @returns {Promise} doneハンドラに'data:'で始まる画像データURLを渡します
		 */
		getImage: function(returnType, processParameter) {
			return this.drawingLogic.getImage(returnType, processParameter);
		},

		/**
		 * 管理下にある図形を全て取得します
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {Boolean} exceptAlone trueの場合描画されている図形のみ
		 * @returns {DRShape[]}
		 */
		getAllShapes: function(exceptAlone) {
			return this.drawingLogic.getAllShapes(exceptAlone);
		},

		/**
		 * 渡された図形のIDを返します
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {DRShape} shape
		 * @returns {String}
		 */
		getShapeID: function(shape) {
			return this.drawingLogic.getShapeID(shape);
		},

		//--------------------------------------------------------------
		// 図形の描画関数
		//--------------------------------------------------------------
		/**
		 * 矩形を描画する
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {Integer} x 左上のx座標
		 * @param {Integer} y 左上のy座標
		 * @param {Integer} width 正方形の幅
		 * @param {Integer} height 正方形の高さ
		 * @param {Boolean} isFill 塗りつぶすかどうか
		 * @returns {DRRect}
		 */
		drawRect: function(x, y, width, height, isFill) {
			return this.drawingLogic.drawRect(x, y, width, height, {
				stroke: this._strokeColor,
				strokeOpacity: this._strokeOpacity,
				strokeWidth: this._strokeWidth,
				fill: isFill ? this._fillColor : 'none',
				fillOpacity: isFill ? this._fillOpacity : '1',
				polygonLinejoin: this._polygonLinejoin
			});
		},

		/**
		 * 楕円を描画する
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {Integer} cx 楕円の中心位置のx座標
		 * @param {Integer} cy 楕円の中心位置のy座標
		 * @param {Integer} rx 楕円の水平方向の半径
		 * @param {Integer} ry 楕円の垂直方向の半径
		 * @param {Boolean} isFill 塗りつぶすかどうか
		 * @returns {DREllipse}
		 */
		drawEllipse: function(cx, cy, rx, ry, isFill) {
			return this.drawingLogic.drawEllipse(cx, cy, rx, ry, {
				stroke: this._strokeColor,
				strokeOpacity: this._strokeOpacity,
				strokeWidth: this._strokeWidth,
				fill: isFill ? this._fillColor : 'none',
				fillOpacity: isFill ? this._fillOpacity : '1'
			});
		},

		/**
		 * パスを描画する
		 * <p>
		 * SVGのpath要素のd属性の記述方法でパスを指定します
		 * </p>
		 *
		 * <pre class="sh_javascript">
		 * // 例：(100px,200px)の位置から(x,y)方向に(10px,20px)移動し、その後その場所から(-10px,-10px)移動するようなデータの場合
		 * 'M 100 200 l 10 20 -10 -10'
		 * </pre>
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {String} pathData
		 * @returns {DRPath}
		 */
		drawPath: function(pathData) {
			return this.drawingLogic.drawPath({
				pathData: pathData,
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
		},

		/**
		 * 画像の配置
		 * <p>
		 * クローンしてdivレイヤに配置します
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {Object} data
		 *
		 * <pre class="sh_javascript">
		 * {
		 * 	x: x座標,
		 * 	y: y座標,
		 * 	width: 幅,
		 * 	height: 高さ,
		 * 	id: 画像ID。idが指定された場合、imageSrcMapから描画する画像パスを探します
		 * 	// src: 画像パス。IDが指定されている場合はsrcの指定は無効です。
		 * }
		 * </pre>
		 *
		 * @returns {DRImage}
		 */
		drawImage: function(data) {
			return this.drawingLogic.drawImage(data);
		},

		/**
		 * テキストの配置
		 * <p>
		 * svgレイヤに配置します
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {String} text
		 * @param {Integer} x
		 * @param {Integer} y
		 * @param {Object} data
		 *
		 * <pre>
		 * {
		 *  x: 左上のx座標,
		 *  y: 左上のy座標
		 *  text: 入力文字列,
		 * 	font: フォント,
		 * 	fontSize: フォントサイズ
		 * }
		 * </pre>
		 *
		 * @returns {DRImage}
		 */
		drawText: function(data) {
			// strokeの色でテキストを描画
			return this.drawingLogic.drawText({
				text: data.text,
				x: data.x,
				y: data.y,
				fill: this._strokeColor,
				opacity: this._strokeOpacity,
				font: data && data.font,
				fontSize: data && data.fontSize,
				fontFamily: data && data.fontFamily,
				style: data && data.style
			});
		},

		/**
		 * 背景色と背景画像の設定
		 * <p>
		 * 背景色と背景画像の設定を行います。
		 * </p>
		 * <p>
		 * 背景色と背景画像を同じアップデートセッションで設定します。個別に設定する場合は<a href="#setBackgroundColor">setBackgroundColor</a>と<a
		 * href="#setBackgroundImage">setBackgroundImage</a>を使用してください
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {String} color 指定無しの場合は背景色は変更しません
		 * @param {Object} backgroundImageData 指定無しの場合は背景画像は変更しません
		 */
		setBackground: function(color, backgroundImageData) {
			this.beginUpdate();
			if (color !== null) {
				this.setBackgroundColor(color);
			}
			if (backgroundImageData) {
				this.setBackgroundImage(backgroundImageData);
			} else {
				this.clearBackgroundImage();
			}
			this.endUpdate();
		},

		/**
		 * 背景色の設定
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {String} color 色
		 */
		setBackgroundColor: function(color) {
			this.drawingLogic.setBackgroundColor(color);
		},

		/**
		 * 背景画像をクリアします
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 */
		clearBackgroundImage: function() {
			this.drawingLogic.clearBackgroundImage();
		},

		/**
		 * 背景画像の設定
		 * <p>
		 * 画像IDまたはファイルパスと、画像の配置モードを指定したオブジェクトを渡してください
		 * </p>
		 * <p>
		 * 画像の配置モード(fillMode)は以下のいずれかを文字列で指定します
		 * </p>
		 * <ul>
		 * <li>none : 左上を原点として画像のサイズを変更せずに描画
		 * <li>contain : アスペクト比を保持して、全体が見えるように描画（描画領域と画像のアスペクト比が異なる場合は隙間ができます）
		 * <li>cover : アスペクト比を保持して、隙間が出ないように描画（描画領域と画像のアスペクト比が異なる場合は画像が描画領域をはみ出します）
		 * <li>stretch : アスペクト比を無視して、描画領域を埋めるように描画
		 * </ul>
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {Object} data
		 *
		 * <pre>
		 * {
		 * 	id: 画像ID。idが指定された場合、imageSrcMapから描画する画像パスを探します
		 * 	// src: 画像パス。IDが指定されている場合はsrcの指定は無効です。
		 * 	fillMode: 画像の配置モード('none'|'contain'|'cover'|'stretch') 指定のない場合は'none'で描画します,
		 * 	x: 背景画像の開始位置のx座標(fillModeがnoneの場合のみ有効。デフォルト:0),
		 * 	y: 背景画像の開始位置のy座標(fillModeがnoneの場合のみ有効。デフォルト:0)
		 * }
		 * </pre>
		 */
		setBackgroundImage: function(data) {
			this.drawingLogic.setBackgroundImage(data);
		},

		/**
		 * 図形の追加
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {DRShape} shape
		 */
		append: function(shape) {
			this.drawingLogic.append(shape);
		},

		/**
		 * 図形の削除
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @param {DRShape} shape
		 */
		remove: function(shape) {
			this.drawingLogic.remove(shape);
		},

		//------------------------------------------------------------------------
		//
		// 描画操作
		//
		//------------------------------------------------------------------------
		//--------------------------------------------------------------
		// ペン描画操作
		//--------------------------------------------------------------
		/**
		 * ペン描画開始
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
			var ctx = this._canvasContext;
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
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 * @param context
		 */
		_penDrawEnd: function(context) {
			if (!this._trackingData.moved) {
				// 動いていないなら描画しない
				return;
			}
			// 確定
			this.drawPath(this._trackingData.d);
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
		// ライン描画操作
		//--------------------------------------------------------------
		/**
		 * ライン描画移動
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
			var ctx = this._canvasContext;
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
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
			this.drawPath(h5.u.str.format('M {0} {1} l {2} {3}', startX, startY, endX - startX,
					endY - startY));
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
		// 矩形描画操作
		//--------------------------------------------------------------
		/**
		 * 矩形描画移動
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
			var ctx = this._canvasContext;
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
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
			this.drawRect(startX, startY, width, height, isFill);

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
		// 矩形描画操作(塗りつぶしあり)
		//--------------------------------------------------------------
		_fillrectDrawMove: function(context) {
			this._rectDrawMove(context, true);
		},
		_fillrectDrawEnd: function(context) {
			this._rectDrawEnd(context, true);
		},

		//--------------------------------------------------------------
		// 楕円描画操作
		//--------------------------------------------------------------
		/**
		 * 楕円描画移動
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
			var ctx = this._canvasContext;
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
		 * 楕円描画終了
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
			this.drawEllipse(cx, cy, rx, ry, isFill);

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
		// 楕円描画操作(塗りつぶしあり)
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
			// トラック操作による図形の移動はそれで一つのアップデートセッションを作成する
			this.beginUpdate();
			this._trackendSelectedShape(context.event, $el);
			this.endUpdate();
			// 図形選択中なので新たなアップデートセッションを開始しておく
			this.beginUpdate();
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
				var id = this.getShapeID(shape);
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
			for (var i = 0, l = sessions.length; i < l; i++) {
				sessions[i].end();
			}
			this._trackingData = null;
		},

		/**
		 * 図形の選択
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
				this.trigger(EVENT_SELECT_SHAPE, selected);
			}
			// アップデートセッションを開始する
			this.endUpdate();
			this.beginUpdate();
		},

		/**
		 * 図形の選択状態を解除
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
				this.trigger(EVENT_UNSELECT_SHAPE, unselected);
			}
			// アップデートセッションを終了する
			this.endUpdate();
		},

		/**
		 * 全ての描画されている図形を選択状態にする
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 */
		selectAll: function() {
			this.select(this.getAllShapes(true));
		},

		/**
		 * 全ての選択状態である図形について選択状態を解除
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 */
		unselectAll: function(Shapes) {
			var selectionLogic = this.selectionLogic;
			var unselected = selectionLogic.unselectAll();
			for (var i = 0, l = unselected.length; i < l; i++) {
				this._removeSelectionRectangle(unselected[i]);
			}
			if (unselected.length) {
				this.trigger(EVENT_UNSELECT_SHAPE, unselected);
			}
			// アップデートセッションを終了する
			this.endUpdate();
		},

		/**
		 * 選択されている図形リストを取得
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @returns {Shapes[]}
		 */
		getSelectedShapes: function() {
			return this.selectionLogic.getSelected();
		},
		/**
		 * セレクトモード時の選択操作
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
			var shapes = this.getAllShapes(true);
			var selectedShapes = [];
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.hitTest(x, y)) {
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
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
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
			var shapes = this.getAllShapes(true);
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
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 * @param shape
		 */
		_removeSelectionRectangle: function(shape) {
			var id = this.getShapeID(shape);
			$('.selection-rectangle[data-target-shape-id=' + id + ']').remove();
		},

		/**
		 * 指定された図形について、選択範囲表示を表示する
		 *
		 * @memberOf h5.ui.components.artboard.controller.ArtboardController
		 * @private
		 * @param shape
		 */
		_addSelectionRectangle: function(shape) {
			var id = this.getShapeID(shape);
			var $selectionRectangle = $('<div class="selection-rectangle" data-target-shape-id="'
					+ id + '"></div>');
			$(this.rootElement).append($selectionRectangle);
			var bounds = shape.getBounds();
			$selectionRectangle.css({
				display: 'block',
				left: bounds.x,
				top: bounds.y,
				width: bounds.width,
				height: bounds.height
			});
		}
	};

	//------------------------------------------------------------
	// expose
	//------------------------------------------------------------
	h5.core.expose(controller);
})();