(function() {

	/**
	 * 画像IDを保持するデータ属性名
	 */
	var DATA_DRAWING_IMAGE_ID = sample.consts.DATA_DRAWING_IMAGE_ID;

	/**
	 * ToolController
	 *
	 * @name sample.PageController
	 */
	var controller = {

		/**
		 * コントローラ名
		 *
		 * @memberOf sample.PageController
		 */
		__name: 'sample.PageController',

		/**
		 * テンプレート
		 *
		 * @memberOf sample.PageController
		 */
		__templates: ['../src/drawing.ejs', 'src/sample.ejs'],

		/**
		 * 子コントローラ設定
		 * <p>
		 * ルートエレメントは__initで設定
		 * </p>
		 */
		__meta: {
			_artboardController: {
				rootElement: null
			},
			_toolbarController: {
				rootElement: null
			}
		},

		/**
		 * SVGCanvasController
		 *
		 * @memberOf sample.PageController
		 */

		_artboardController: h5.ui.components.drawing.controller.ArtboardController,

		/**
		 * ToolbarController
		 *
		 * @memberOf sample.PageController
		 */
		_toolbarController: sample.ToolbarController,

		/**
		 * 描画領域
		 */
		_$canvasWrapper: null,

		/**
		 * ツールバー領域
		 */
		_$toolbar: null,

		/**
		 * 保存した画像の表示領域
		 */
		_$savedImgWrapper: null,

		/**
		 * 選択されている図形があるかどうか
		 */
		_existSelectedShape: false,

		/**
		 * セーブデータ
		 */
		_saveDataMap: {},

		/**
		 * セーブデータの採番用シーケンス
		 */
		_saveDataSequence: h5.core.data.createSequence(),

		/**
		 * __initイベント
		 *
		 * @memberOf sample.PageController
		 * @private
		 * @param {Object} context コンテキスト
		 */
		__init: function(context) {
			// カンバスのサイズ
			var size = context.args.canvasSize;

			// カンバス(svg,canvas)の配置
			this.view.append(this.rootElement, 'h5drawing-canvas-wrapper', size);
			this._$canvasWrapper = this.$find('.h5drawing-canvas-wrapper');

			// ラッパーのサイズ指定
			this._$canvasWrapper.css(size);

			// Toolbarの配置
			this.view.append(this.rootElement, 'toolbar', {
				colors: ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#00FFFF',
						'#FF00FF', '#FFFF00', '#86153D', '#006F62', '#B3A100', '#41466F',
						'#006638', '#7F114F', '#E6855E', '#6CBAD8', '#CFE283', '#C97FB4',
						'#F9DB57', '#6A8CC7']
			});
			this._$toolbar = this.$find('.drawing-toolbar');

			// 保存画像表示領域の配置
			this.view.append(this.rootElement, 'saved-img-wrapper');
			this._$savedImgWrapper = this.$find('.saved-img-wrapper');

			// 子コントローラのメタ設定
			this.__meta._artboardController.rootElement = this._$canvasWrapper;
			this.__meta._toolbarController.rootElement = this._$toolbar;

			// ArtboardControllerの設定
			// デフォルトはフリーハンド描画モード
			this._artboardController.setMode(this._artboardController.MODE_PEN);
			this._artboardController.setStrokeWidth(5);
		},

		/**
		 * __readyイベント
		 *
		 * @memberOf sample.PageController
		 * @private
		 * @param {Object} context コンテキスト
		 */
		__ready: function() {
			// 画像にIDを振り、ソースファイルとの対応付けを行う
			// (子コントローラのビューの準備(画像の配置)が終わった後に実行したいので__initではなく__readyで行う)
			var srcMap = this._artboardController.getImageSourceMap();
			var seq = h5.core.data.createSequence();
			this.$find('.drawing-image').each(function() {
				var id = seq.next();
				var $this = $(this);
				// data()で設定するとcloneした要素にはコピーされないため、属性(attr)で設定
				$this.attr('data-' + DATA_DRAWING_IMAGE_ID, id);
				srcMap[id] = $this.attr('src');
			});

			// ツールバーコントローラにArtboardControllerを持たせる
			// (スタンプの配置、背景画像、背景色の設定ははToolbarから直接行うため)
			this._toolbarController.targetArtboard = this._artboardController;
		},

		//---------------------------------------------------------------
		// キー操作
		//---------------------------------------------------------------
		'{window} keydown': function(context) {
			var event = context.event;
			var keyCode = event.keyCode;
			var ctrlKey = event.ctrlKey;
			switch (keyCode) {
			case 46: // deleteKey
				// 選択された要素の削除
				this._removeSelectedShape();
				break;
			case 65: //a
				if (ctrlKey) { // ctrl + a
					// すべて選択
					this._selectAll();
					event.preventDefault();
				}
				break;
			}
		},

		//-------------------------------------------------------------------------------
		// ツールバーの上げるイベント
		//-------------------------------------------------------------------------------
		'{this._$toolbar} shape-select': function() {
			this._artboardController.unselectAll();
			this._artboardController.setMode(this._artboardController.MODE_SELECT);
		},

		'{this._$toolbar} tool-select': function(context) {
			this._artboardController.unselectAll();
			var toolName = context.evArg;
			switch (toolName) {
			case 'pen':
				this._artboardController.setMode(this._artboardController.MODE_PEN);
				break;
			case 'line':
				this._artboardController.setMode(this._artboardController.MODE_LINE);
				break;
			case 'rect':
				this._artboardController.setMode(this._artboardController.MODE_RECT);
				break;
			case 'fillrect':
				this._artboardController.setMode(this._artboardController.MODE_FILL_RECT);
				break;
			case 'circle':
				this._artboardController.setMode(this._artboardController.MODE_CIRCLE);
				break;
			case 'fillcircle':
				this._artboardController.setMode(this._artboardController.MODE_FILL_CIRCLE);
				break;
			case 'stamp':
				this._artboardController.setMode(this._artboardController.MODE_NODRAW);
				break;
			}
		},

		'{this._$toolbar} stroke-change': function(context) {
			var val = context.evArg;
			var artboadCtrl = this._artboardController;
			if (!this._existSelectedShape) {
				this._artboardController.setStrokeColor(val);
				return;
			}
			var shapes = artboadCtrl.getSelectedShapes();
			if (!shapes.length) {
				return;
			}
			artboadCtrl.beginUpdate();
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.strokeColor !== undefined) {
					shape.strokeColor = val;
				}
			}
			artboadCtrl.endUpdate();
		},

		'{this._$toolbar} stroke-opacity-change': function(context) {
			var val = context.evArg;
			var artboadCtrl = this._artboardController;
			if (!this._existSelectedShape) {
				artboadCtrl.setStrokeOpacity(val);
				return;
			}
			var shapes = artboadCtrl.getSelectedShapes();
			if (!shapes.length) {
				return;
			}
			artboadCtrl.beginUpdate();
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.strokeOpacity !== undefined) {
					shape.strokeOpacity = val;
				}
			}
			artboadCtrl.endUpdate();
		},

		'{this._$toolbar} fill-change': function(context) {
			var val = context.evArg;
			var artboadCtrl = this._artboardController;
			if (!this._existSelectedShape) {
				artboadCtrl.setFillColor(val);
				return;
			}
			var shapes = artboadCtrl.getSelectedShapes();
			if (!shapes.length) {
				return;
			}
			artboadCtrl.beginUpdate();
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.fillColor !== undefined) {
					shape.fillColor = val;
				}
			}
			artboadCtrl.endUpdate();
		},

		'{this._$toolbar} fill-opacity-change': function(context) {
			var val = context.evArg;
			var artboadCtrl = this._artboardController;
			if (!this._existSelectedShape) {
				artboadCtrl.setFillOpacity(val);
				return;
			}
			var shapes = artboadCtrl.getSelectedShapes();
			if (!shapes.length) {
				return;
			}
			artboadCtrl.beginUpdate();
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.fillOpacity !== undefined) {
					shape.fillOpacity = val;
				}
			}
			artboadCtrl.endUpdate();
		},

		'{this._$toolbar} stroke-width-change': function(context) {
			var val = context.evArg;
			var artboadCtrl = this._artboardController;
			if (!this._existSelectedShape) {
				artboadCtrl.setStrokeWidth(val);
				return;
			}
			var shapes = artboadCtrl.getSelectedShapes();
			if (!shapes.length) {
				return;
			}
			artboadCtrl.beginUpdate();
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.strokeWidth !== undefined) {
					shape.strokeWidth = val;
				}
			}
			artboadCtrl.endUpdate();
		},

		/**
		 * 選択中の図形を消去
		 *
		 * @memberOf sample.PageController
		 */
		'{this._$toolbar} remove-selected-shape': function() {
			this._removeSelectedShape();
		},
		_removeSelectedShape: function() {
			var artboadCtrl = this._artboardController;
			var selectedShapes = artboadCtrl.getSelectedShapes();
			if (!selectedShapes.length) {
				return;
			}
			artboadCtrl.beginUpdate();
			for (var i = 0, l = selectedShapes.length; i < l; i++) {
				selectedShapes[i].remove();
			}
			artboadCtrl.unselectAll();
			artboadCtrl.endUpdate();
		},

		/**
		 * img要素に画像としてエクスポート
		 *
		 * @memberOf sample.PageController
		 */
		'{this._$toolbar} export': function() {
			this._artboardController.getImage().done(
					this.own(function(dataUrl) {
						this._$savedImgWrapper
								.prepend('<div><label>' + sample.util.dateFormat(new Date())
										+ '</label><br><img class="saved-img" src="' + dataUrl
										+ '"></div>');
					}));
		},

		/**
		 * セーブ
		 *
		 * @memberOf sample.PageController
		 */
		'{this._$toolbar} save': function() {
			this._artboardController.unselectAll();
			var artboardSaveData = this._artboardController.save();
			var saveNo = this._saveDataSequence.next();
			this._saveDataMap[saveNo] = artboardSaveData;
			this._saveDataMap = h5.u.obj.serialize(this._saveDataMap);
			this._saveDataMap = h5.u.obj.deserialize(this._saveDataMap);
			this._toolbarController.appendSaveDataList(saveNo);
		},

		/**
		 * ロード
		 *
		 * @memberOf sample.PageController
		 * @param context.evArg saveNo
		 */
		'{this._$toolbar} load': function(context) {
			this._artboardController.unselectAll();
			var saveNo = context.evArg;
			var artboardSaveData = this._saveDataMap[saveNo];
			this._artboardController.load(artboardSaveData);
		},

		/**
		 * 全ての図形を削除
		 *
		 * @memberOf sample.PageController
		 */
		'{this._$toolbar} remove-all': function() {
			if (!confirm('描画されている図形をすべて削除します')) {
				return;
			}
			var artboadCtrl = this._artboardController;
			var shapes = artboadCtrl.getAllShapes(true);
			if (!shapes.length) {
				return;
			}
			// アップデートセッション内で削除(undo/redoで実行される操作を一つにまとめるため)
			artboadCtrl.beginUpdate();
			for (var i = 0, l = shapes.length; i < l; i++) {
				shapes[i].remove();
			}
			artboadCtrl.endUpdate();
			artboadCtrl.unselectAll();
		},

		/**
		 * 全ての図形を選択
		 */
		'{this._$toolbar} select-all': function() {
			this._selectAll();
		},

		/**
		 * 全ての図形の選択を解除
		 */
		'{this._$toolbar} unselect-all': function() {
			this._artboardController.unselectAll();
		},

		'{this._$canvasWrapper} enable-undo': function() {
			this.$find('.undo').removeClass('disabled');
		},
		'{this._$canvasWrapper} disable-undo': function() {
			this.$find('.undo').addClass('disabled');
		},
		'{this._$canvasWrapper} enable-redo': function() {
			this.$find('.redo').removeClass('disabled');

		},
		'{this._$canvasWrapper} disable-redo': function() {
			this.$find('.redo').addClass('disabled');
		},
		'{this._$canvasWrapper} drawstart': function() {
			this._toolbarController.hideOptionView();
		},
		'{this._$canvasWrapper} drawend': function() {
		// 何もしない
		},
		'{this._$canvasWrapper} select-shape': function(context) {
			this._setToolbarForSelectedShape();
		},
		'{this._$canvasWrapper} unselect-shape': function(context) {
			var shapes = this._artboardController.getSelectedShapes();
			if (shapes.length) {
				this._setToolbarForSelectedShape();
				return;
			}
			var toolCtrl = this._toolbarController;
			toolCtrl.enableFillColor();
			toolCtrl.enableStrokeColor();
			toolCtrl.enableStrokeWidth();
			toolCtrl.restoreSettings();
			toolCtrl.disableRemove();
			this._existSelectedShape = false;
		},

		_setToolbarForSelectedShape: function() {
			var shapes = this._artboardController.getSelectedShapes();
			var toolCtrl = this._toolbarController;
			// 未選択状態から何かを選択した時、現在のツールパレットを一時保存(図形選択解除時に元に戻す)
			if (!this._existSelectedShape) {
				toolCtrl.saveSettings();
			}
			// 削除ボタンを有効
			toolCtrl.enableRemove();

			// shapeには図形によってstrokeColorやfillColorを設定できる
			// 選択された図形(複数)のtypeをみて判定し、一つでも設定できるものがあれば有効にする
			var isFillShape = false;
			var isStrokeShape = false;
			var firstFillShape = null;
			var firstStrokeShape = null;
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.fillColor !== undefined) {
					isFillShape = true;
					firstFillShape = shape;
				}
				if (shape.strokeColor !== undefined) {
					isStrokeShape = true;
					firstStrokeShape = shape;
				}
			}
			// Fillの設定
			if (isFillShape) {
				// 最初にヒットしたfillShapeの色をパレットに適用する
				toolCtrl.setFillColor(firstFillShape.fillColor, firstFillShape.fillOpacity);
				toolCtrl.enableFillColor();
			} else {
				// Fill設定不可
				toolCtrl.setFillColor('#fff', 0);
				toolCtrl.disableFillColor();
			}
			// Strokeの設定
			if (isStrokeShape) {
				// 最初にヒットしたstrokeShapeの色、幅をパレットに適用する
				toolCtrl.setStrokeColor(firstStrokeShape.strokeColor,
						firstStrokeShape.strokeOpacity);
				toolCtrl.setStrokeWidth(firstStrokeShape.strokeWidth);
				toolCtrl.enableStrokeColor();
			} else {
				// Stroke設定不可
				toolCtrl.setStrokeColor('#fff', 0);
				toolCtrl.disableStrokeColor();
				toolCtrl.disableStrokeWidth();
				toolCtrl.enableStrokeWidth();
			}
			this._existSelectedShape = true;
		},

		/**
		 * 全ての図形を選択
		 */
		_selectAll: function() {
			this._artboardController.selectAll();
			this._artboardController.setMode(this._artboardController.MODE_SELECT);
		},
	};
	h5.core.expose(controller);
})();