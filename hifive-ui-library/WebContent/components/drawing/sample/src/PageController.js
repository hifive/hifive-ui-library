(function() {

	/**
	 * 画像IDを保持するデータ属性名
	 */
	var DATA_DRAWING_IMAGE_ID = 'drawing-image-id';

	/**
	 * rgbカラーにopacityを追加してrgbaカラーにする
	 *
	 * @param color rgb()またはrgba()形式の色指定文字列
	 * @param opacity
	 * @returns {String}
	 */
	function rgbToRgba(color, opacity) {
		opacity = parseFloat(opacity);
		if (opacity === 1) {
			// opacityが1ならそのままcolorを返す
			return color;
		}
		if (/^rgb\(/.test(color)) {
			// rgb()形式の場合は後ろにopacityを追加して返す
			return color.replace(')', ', ' + opacity + ')').replace(/^rgb/, 'rgba');
		}

		// rgba()形式の場合はcolorに指定されている色にopacityを掛ける
		var parse = color.match(/^(rgba\(.*,.*,.*,)(.*)(\))/);
		parse[2] = parseFloat(parse[2]) * opacity;
		return parse[1] + parse[2] + parse[3];
	}

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
			_drawingOperationController: {
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

		_drawingOperationController: h5.ui.components.drawing.controller.DrawingOperationController,

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
			this.__meta._drawingOperationController.rootElement = this._$canvasWrapper;
			this.__meta._toolbarController.rootElement = this._$toolbar;

			// DrawingOperationControllerの設定
			// デフォルトはフリーハンド描画モード
			this._drawingOperationController.setMode(this._drawingOperationController.MODE_PEN);
			this._drawingOperationController.setStrokeWidth(5);
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
			var srcMap = this._drawingOperationController.drawingController.imageSourceMap;
			var seq = h5.core.data.createSequence();
			this.$find('.drawing-image').each(function() {
				var id = seq.next();
				var $this = $(this);
				// data()で設定するとcloneした要素にはコピーされないため、属性(attr)で設定
				$this.attr('data-' + DATA_DRAWING_IMAGE_ID, id);
				srcMap[id] = $this.attr('src');
			});
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
					this._drawingOperationController.selectAll();
					this._drawingOperationController
							.setMode(this._drawingOperationController.MODE_SELECT);
					event.preventDefault();
				}
				break;
			}
		},

		//-------------------------------------------------------------------------------
		// ツールバーの上げるイベント
		// (TODO ツールバーにdrawingControllerを渡して直接操作できるものはそうする)
		//-------------------------------------------------------------------------------
		'{this._$toolbar} undo': function() {
			this._drawingOperationController.unselectAll();
			this._drawingOperationController.drawingController.undo();
		},

		'{this._$toolbar} redo': function() {
			this._drawingOperationController.unselectAll();
			this._drawingOperationController.drawingController.redo();
		},

		'{this._$toolbar} shape-select': function() {
			this._drawingOperationController.unselectAll();
			this._drawingOperationController.setMode(this._drawingOperationController.MODE_SELECT);
		},

		'{this._$toolbar} tool-select': function(context) {
			this._drawingOperationController.unselectAll();
			var toolName = context.evArg;
			switch (toolName) {
			case 'pen':
				this._drawingOperationController.setMode(this._drawingOperationController.MODE_PEN);
				break;
			case 'line':
				this._drawingOperationController
						.setMode(this._drawingOperationController.MODE_LINE);
				break;
			case 'rect':
				this._drawingOperationController
						.setMode(this._drawingOperationController.MODE_RECT);
				break;
			case 'fillrect':
				this._drawingOperationController
						.setMode(this._drawingOperationController.MODE_FILL_RECT);
				break;
			case 'circle':
				this._drawingOperationController
						.setMode(this._drawingOperationController.MODE_CIRCLE);
				break;
			case 'fillcircle':
				this._drawingOperationController
						.setMode(this._drawingOperationController.MODE_FILL_CIRCLE);
				break;
			case 'stamp':
				this._drawingOperationController
						.setMode(this._drawingOperationController.MODE_NODRAW);
				break;
			}
		},

		'{this._$toolbar} stroke-change': function(context) {
			var val = context.evArg;
			if (!this._existSelectedShape) {
				this._drawingOperationController.setStrokeColor(val);
			} else {
				var operationCtrl = this._drawingOperationController;
				var shapes = operationCtrl.getSelectedShapes();
				if (!shapes.length) {
					return;
				}
				var drawingCtrl = operationCtrl.drawingController;
				drawingCtrl.beginUpdate();
				for (var i = 0, l = shapes.length; i < l; i++) {
					var shape = shapes[i];
					if (shape.strokeColor !== undefined) {
						shape.strokeColor = val;
					}
				}
				drawingCtrl.endUpdate();
			}
		},

		'{this._$toolbar} stroke-opacity-change': function(context) {
			var val = context.evArg;
			if (!this._existSelectedShape) {
				this._drawingOperationController.setStrokeOpacity(val);
			} else {
				var operationCtrl = this._drawingOperationController;
				var shapes = operationCtrl.getSelectedShapes();
				if (!shapes.length) {
					return;
				}
				var drawingCtrl = operationCtrl.drawingController;
				drawingCtrl.beginUpdate();
				for (var i = 0, l = shapes.length; i < l; i++) {
					var shape = shapes[i];
					if (shape.strokeOpacity !== undefined) {
						shape.strokeOpacity = val;
					}
				}
				drawingCtrl.endUpdate();
			}
		},

		'{this._$toolbar} fill-change': function(context) {
			var val = context.evArg;
			if (!this._existSelectedShape) {
				this._drawingOperationController.setFillColor(val);
			} else {
				var operationCtrl = this._drawingOperationController;
				var shapes = operationCtrl.getSelectedShapes();
				if (!shapes.length) {
					return;
				}
				var drawingCtrl = operationCtrl.drawingController;
				drawingCtrl.beginUpdate();
				for (var i = 0, l = shapes.length; i < l; i++) {
					var shape = shapes[i];
					if (shape.fillColor !== undefined) {
						shape.fillColor = val;
					}
				}
				drawingCtrl.endUpdate();
			}
		},

		'{this._$toolbar} fill-opacity-change': function(context) {
			var val = context.evArg;
			if (!this._existSelectedShape) {
				this._drawingOperationController.setFillOpacity(val);
			} else {
				var operationCtrl = this._drawingOperationController;
				var shapes = operationCtrl.getSelectedShapes();
				if (!shapes.length) {
					return;
				}
				var drawingCtrl = operationCtrl.drawingController;
				drawingCtrl.beginUpdate();
				for (var i = 0, l = shapes.length; i < l; i++) {
					var shape = shapes[i];
					if (shape.fillOpacity !== undefined) {
						shape.fillOpacity = val;
					}
				}
				drawingCtrl.endUpdate();
			}
		},

		'{this._$toolbar} stroke-width-change': function(context) {
			var val = context.evArg;
			if (!this._existSelectedShape) {
				this._drawingOperationController.setStrokeWidth(val);
			} else {
				var operationCtrl = this._drawingOperationController;
				var shapes = operationCtrl.getSelectedShapes();
				if (!shapes.length) {
					return;
				}
				var drawingCtrl = operationCtrl.drawingController;
				drawingCtrl.beginUpdate();
				for (var i = 0, l = shapes.length; i < l; i++) {
					var shape = shapes[i];
					if (shape.strokeWidth !== undefined) {
						shape.strokeWidth = val;
					}
				}
				drawingCtrl.endUpdate();
			}
		},

		'{this._$toolbar} dropstamp': function(context) {
			var arg = context.evArg;
			var $stamp = $(arg.img);
			var drawingCtrl = this._drawingOperationController.drawingController;
			var offset = $(drawingCtrl.rootElement).offset();
			var x = arg.x - offset.left;
			var y = arg.y - offset.top;
			var width = $stamp.width();
			var height = $stamp.height();
			if (x + width < 0 || y + height < 0 || x > $(this._$canvasWrapper).innerWidth()
					|| y > $(this._$canvasWrapper).innerHeight()) {
				// 範囲外なら何もしない
				return;
			}

			drawingCtrl.drawImage({
				id: $stamp.data(DATA_DRAWING_IMAGE_ID),
				x: x,
				y: y,
				width: width,
				height: height
			});
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
			var operationCtrl = this._drawingOperationController;
			var selectedShapes = operationCtrl.getSelectedShapes();
			if (!selectedShapes.length) {
				return;
			}
			var drawingCtrl = operationCtrl.drawingController;
			drawingCtrl.beginUpdate();
			for (var i = 0, l = selectedShapes.length; i < l; i++) {
				selectedShapes[i].remove();
			}
			operationCtrl.unselectAll();
			drawingCtrl.endUpdate();
		},

		/**
		 * 背景画像の設定
		 *
		 * @memberOf sample.PageController
		 * @param context
		 */
		'{this._$toolbar} set-background': function(context) {
			var arg = context.evArg;
			var drawingCtrl = this._drawingOperationController.drawingController;

			if (!arg) {
				// イベント引数なしなら背景画像クリア
				drawingCtrl.clearBackgroundImage();
				return;
			}

			// 背景画像と背景色の設定
			drawingCtrl.beginUpdate();
			if (arg.element) {
				// 背景画像
				var id = $(arg.element).data(DATA_DRAWING_IMAGE_ID);

				var fillMode = arg.fillMode;
				var x,y;
				if (fillMode === 'none-center') {
					// 中央配置
					$(arg.element).css('display', 'block');
					var w = $(arg.element).width();
					var h = $(arg.element).height();
					$(arg.element).css('display', '');
					fillMode = 'none';
					x = (this._$canvasWrapper.innerWidth() - w) / 2;
					y = (this._$canvasWrapper.innerHeight() - h) / 2;
				}
				drawingCtrl.setBackgroundImage({
					id: id,
					fillMode: fillMode,
					x: x,
					y: y
				});
			}
			if (arg.color) {
				// 背景色の設定
				// rgba()に変換
				var rgbaColor = rgbToRgba(arg.color, arg.opacity);
				drawingCtrl.setBackgroundColor(rgbaColor);
			}
			drawingCtrl.endUpdate();
		},

		/**
		 * img要素に画像としてエクスポート
		 *
		 * @memberOf sample.PageController
		 */
		'{this._$toolbar} export-img': function() {
			this._drawingOperationController.drawingController.getImage().done(
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
			this._drawingOperationController.unselectAll();
			var drawingSaveData = this._drawingOperationController.drawingController.save();
			var saveNo = this._saveDataSequence.next();
			this._saveDataMap[saveNo] = drawingSaveData;
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
			this._drawingOperationController.unselectAll();
			var saveNo = context.evArg;
			var drawingSaveData = this._saveDataMap[saveNo];
			this._drawingOperationController.drawingController.load(drawingSaveData);
		},

		/**
		 * 全ての図形を削除
		 *
		 * @memberOf sample.PageController
		 */
		'{this._$toolbar} remove-all-shape': function() {
			if (!confirm('描画されている図形をすべて削除します')) {
				return;
			}
			var drawingCtrl = this._drawingOperationController.drawingController;
			var shapes = drawingCtrl.getAllShapes();
			if (!shapes.length) {
				return;
			}
			// アップデートセッション内で削除(undo/redoで実行される操作を一つにまとめるため)
			drawingCtrl.beginUpdate();
			for (var i = 0, l = shapes.length; i < l; i++) {
				shapes[i].remove();
			}
			drawingCtrl.endUpdate();
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
			var shapes = this._drawingOperationController.getSelectedShapes();
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
			var shapes = this._drawingOperationController.getSelectedShapes();
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
		}
	};
	h5.core.expose(controller);
})();