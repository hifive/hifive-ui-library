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
		__templates: ['../src/artboard.ejs', 'src/sample.ejs'],

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
		 * ArtboardController
		 *
		 * @memberOf sample.PageController
		 */
		_artboardController: h5.ui.components.artboard.controller.ArtboardController,

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
		 * イメージマップの採番用シーケンス
		 */
		_imageSourceMapSeq: h5.core.data.createSequence(),

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
			this.view.append('.artboard', 'h5-artboard-canvas-wrapper', size);
			this._$canvasWrapper = this.$find('.h5-artboard-canvas-wrapper');

			// Toolbarの配置
			this.view.append(this.rootElement, 'toolbar', {
				colors: ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#00FFFF',
						'#FF00FF', '#FFFF00', '#86153D', '#006F62', '#B3A100', '#41466F',
						'#006638', '#7F114F', '#E6855E', '#6CBAD8', '#CFE283', '#C97FB4',
						'#F9DB57', '#6A8CC7']
			});
			this._$toolbar = this.$find('.drawing-toolbar');

			// ツール下部分の配置
			this.view.append(this._$toolbar, 'tool-footer');

			// 保存画像表示領域の配置
			this.view.append(this._$toolbar, 'saved-img-wrapper');
			this._$savedImgWrapper = this.$find('.saved-img-wrapper');

			// 子コントローラのメタ設定
			this.__meta._artboardController.rootElement = this._$canvasWrapper;
			this.__meta._toolbarController.rootElement = this._$toolbar;

			// ArtboardControllerの設定
			// デフォルトはフリーハンド描画モード
			this._artboardController.setMode(this._artboardController.MODE_PEN);
			this._artboardController.setStrokeWidth(5);

			// ツールバーコントローラにArtboardControllerを持たせる
			// (スタンプの配置、背景画像、背景色の設定ははToolbarから直接行うため)
			this._toolbarController.targetArtboard = this._artboardController;
		},

		/**
		 * __readyイベント
		 *
		 * @memberOf sample.PageController
		 * @private
		 * @param {Object} context コンテキスト
		 */
		__ready: function() {
			// imageSourceMapにdrawing-imageクラス要素の画像を登録
			// ページ全体のdrawing-imageを扱うため、this.$findではなく$()を使用している
			this._registImageSourceMap($('.drawing-image'));
		},

		//---------------------------------------------------------------
		// キー操作
		//---------------------------------------------------------------
		'{window} keydown': function(context) {
			var event = context.event;
			if (event.target.tagName.toLowerCase() === 'input') {
				// input要素のキーイベントなら何もしない
				return;
			}
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
		'{this._$toolbar} selectMode': function() {
			this._artboardController.unselectAll();
			this._artboardController.setMode(this._artboardController.MODE_SELECT);
		},

		'{this._$toolbar} magnifierMode': function() {
			this._artboardController.unselectAll();
			this._artboardController.setMode(this._artboardController.MODE_DISABLE);
		},

		'{this._$toolbar} drawMode': function(context) {
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
			case 'text':
				this._artboardController.setMode(this._artboardController.MODE_TEXT);
				break;
			}
		},

		'{this._$toolbar} strokeChange': function(context) {
			var val = context.evArg;
			var artboardCtrl = this._artboardController;
			if (!this._existSelectedShape) {
				this._artboardController.setStrokeColor(val);
				return;
			}
			var shapes = artboardCtrl.getSelectedShapes();
			if (!shapes.length) {
				return;
			}
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.strokeColor !== undefined) {
					shape.strokeColor = val;
				} else if (shape.textColor !== undefined) {
					// strokeColor設定時にtextColorも変更する
					shape.textColor = val;
				}
			}
		},

		'{this._$toolbar} strokeOpacityChange': function(context) {
			var val = context.evArg;
			var artboardCtrl = this._artboardController;
			if (!this._existSelectedShape) {
				artboardCtrl.setStrokeOpacity(val);
				return;
			}
			var shapes = artboardCtrl.getSelectedShapes();
			if (!shapes.length) {
				return;
			}
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.strokeOpacity !== undefined) {
					shape.strokeOpacity = val;
				} else if (shape.textColor !== undefined) {
					// strokeOpacity設定時にtextOpacityも変更する
					shape.textOpacity = val;
				}
			}
		},

		'{this._$toolbar} fillChange': function(context) {
			var val = context.evArg;
			var artboardCtrl = this._artboardController;
			if (!this._existSelectedShape) {
				artboardCtrl.setFillColor(val);
				return;
			}
			var shapes = artboardCtrl.getSelectedShapes();
			if (!shapes.length) {
				return;
			}
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.fillColor !== undefined) {
					shape.fillColor = val;
				}
			}
		},

		'{this._$toolbar} fillOpacityChange': function(context) {
			var val = context.evArg;
			var artboardCtrl = this._artboardController;
			if (!this._existSelectedShape) {
				artboardCtrl.setFillOpacity(val);
				return;
			}
			var shapes = artboardCtrl.getSelectedShapes();
			if (!shapes.length) {
				return;
			}
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.fillOpacity !== undefined) {
					shape.fillOpacity = val;
				}
			}
		},

		'{this._$toolbar} strokeWidthChange': function(context) {
			var val = context.evArg;
			var artboardCtrl = this._artboardController;
			if (!this._existSelectedShape) {
				artboardCtrl.setStrokeWidth(val);
				return;
			}
			var shapes = artboardCtrl.getSelectedShapes();
			if (!shapes.length) {
				return;
			}
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.strokeWidth !== undefined) {
					shape.strokeWidth = val;
				}
			}
		},

		'{this._$toolbar} textSettingsChange': function(context) {
			var textSettings = context.evArg;
			var shapes = this._artboardController.getSelectedShapes();
			if (!shapes.length) {
				return;
			}
			var fontSize = textSettings.fontSize;
			var fontStyle = textSettings.fontStyle;
			var fontFamily = textSettings.fontFamily;
			var textContent = textSettings.textContent;
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (shape.textContent === undefined) {
					continue;
				}
				shape.fontSize = fontSize;
				shape.textContent = textContent;
				shape.fontStyle = fontStyle;
				shape.fontFamily = fontFamily;
			}
		},

		/**
		 * 選択中の図形を消去
		 *
		 * @memberOf sample.PageController
		 */
		'{this._$toolbar} removeSelectedShape': function() {
			this._removeSelectedShape();
		},
		_removeSelectedShape: function() {
			var artboardCtrl = this._artboardController;
			var selectedShapes = artboardCtrl.getSelectedShapes();
			if (!selectedShapes.length) {
				return;
			}
			for (var i = 0, l = selectedShapes.length; i < l; i++) {
				artboardCtrl.remove(selectedShapes[i]);
			}
			artboardCtrl.unselectAll();
		},

		/**
		 * カンバスサイズ変更
		 *
		 * @memberOf sample.PageController
		 */
		'{this._$toolbar} setSize': function(ctx) {
			var size = ctx.evArg;
			this._artboardController.setSize(size.width, size.height);
		},

		/**
		 * 保存
		 * <p>
		 * 作業内容を保存してかつimgとして出力も行う
		 * </p>
		 *
		 * @memberOf sample.PageController
		 */
		'{this._$toolbar} save': function(ctx) {
			var option = ctx.evArg;
			// 保存
			this._artboardController.unselectAll();
			var artboardSaveData = this._artboardController.save(true);
			var saveNo = this._saveDataSequence.next();
			this._saveDataMap[saveNo] = artboardSaveData;

			// imgとしてエクスポート
			var label = sample.util.dateFormat(new Date());
			this._artboardController.getImage('imgage/png', option).done(
					this.own(function(dataUrl) {
						this.view.prepend(this._$savedImgWrapper, 'saved-img', {
							dateStr: label,
							dataUrl: dataUrl,
							saveNo: saveNo
						});
					}));
		},

		/**
		 * 全ての図形を削除
		 *
		 * @memberOf sample.PageController
		 */
		'{this._$toolbar} removeAll': function() {
			if (!confirm('描画されている図形をすべて削除します')) {
				return;
			}
			var artboardCtrl = this._artboardController;
			var shapes = artboardCtrl.getAllShapes(true);
			if (!shapes.length) {
				return;
			}
			// アップデートセッション内で削除(undo/redoで実行される操作を一つにまとめるため)
			for (var i = 0, l = shapes.length; i < l; i++) {
				artboardCtrl.remove(shapes[i]);
			}
			artboardCtrl.unselectAll();
		},

		/**
		 * 全ての図形を選択
		 */
		'{this._$toolbar} selectAll': function() {
			this._selectAll();
		},

		/**
		 * 全ての図形の選択を解除
		 */
		'{this._$toolbar} unselectAll': function() {
			this._artboardController.unselectAll();
		},

		/**
		 * セーブデータを表示
		 */
		'{this._$toolbar} showSaveData': function(ctx) {
			var index = ctx.evArg;
			var saveData = this._saveDataMap[index];
			var $saveDataText = $('.saveDataText');
			$saveDataText.val(h5.u.obj.serialize(saveData));
			setTimeout(function() {
				$saveDataText.focus().select();
			}, 0);
		},

		/**
		 * テキストエリアのキー操作が有効になるようにする
		 */
		'{.saveDataText} keydown': function(ctx) {
			ctx.event.stopPropagation();
		},

		/**
		 * ロードボタン
		 *
		 * @memberOf sample.PageController
		 * @param context.evArg saveNo
		 */
		'.saved-img-wrapper .load-btn click': function(ctx, $el) {
			if (!confirm('ボードに保存したデータを読み込みます')) {
				return;
			}
			this._artboardController.unselectAll();
			var saveNo = $el.data('save-no');
			this._load(saveNo);
		},

		'{this._$canvasWrapper} enableUndo': function() {
			this.$find('.undo').removeClass('disabled');
		},
		'{this._$canvasWrapper} disableUndo': function() {
			this.$find('.undo').addClass('disabled');
		},
		'{this._$canvasWrapper} enableRedo': function() {
			this.$find('.redo').removeClass('disabled');

		},
		'{this._$canvasWrapper} disableRedo': function() {
			this.$find('.redo').addClass('disabled');
		},
		'{this._$canvasWrapper} drawstart': function() {
			this._toolbarController.hideOptionView();
		},
		'{this._$canvasWrapper} drawEnd': function() {
		// 何もしない
		},
		'{this._$canvasWrapper} selectShape': function(context) {
			this._setToolbarForSelectedShape();
		},
		'{this._$canvasWrapper} unselectShape': function(context) {
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

		/**
		 * 画像の追加。動的に画像をimageSourceMapに登録したい時に呼ぶイベント
		 *
		 * @memberOf sample.PageController
		 * @param context.evArg saveNo
		 */
		'{rootElement} registDrawingImage': function(ctx) {
			var $img = $(ctx.evArg.img);
			this._registImageSourceMap($img);
		},

		/**
		 * 画像をimageSourceMapに登録
		 *
		 * @param $img
		 */
		_registImageSourceMap: function($img) {// 画像にIDを振り、ソースファイルとの対応付けを行う
			// (子コントローラのビューの準備(画像の配置)が終わった後に実行したいので__initではなく__readyで行う)
			var srcMap = this._artboardController.imageSourceMap;
			var seq = this._imageSourceMapSeq;
			$img.each(function() {
				var id = seq.next();
				var $this = $(this);
				// data()で設定するとcloneした要素にはコピーされないため、属性(attr)で設定
				$this.attr('data-' + DATA_DRAWING_IMAGE_ID, id);
				srcMap[id] = $this.attr('src');
			});
		},

		_setToolbarForSelectedShape: function() {
			var shapes = this._artboardController.getSelectedShapes();
			var toolCtrl = this._toolbarController;
			// 未選択状態から何かを選択した時、現在のツールパレットを一時保存(図形選択解除時に元に戻す)
			if (!this._existSelectedShape) {
				toolCtrl.saveSettings();
			}
			this._existSelectedShape = true;
			// 削除ボタンを有効
			toolCtrl.enableRemove();

			// shapeには図形によってstrokeColorやfillColorを設定できる
			// 選択された図形(複数)のtypeをみて判定し、一つでも設定できるものがあれば有効にする
			var strokeColor, strokeOpacity, fillColor, fillOpacity, strokeWidth, textSettings;
			for (var i = 0, l = shapes.length; i < l; i++) {
				var shape = shapes[i];
				if (fillColor == null && shape.fillColor !== undefined) {
					fillColor = shape.fillColor;
					fillOpacity = shape.fillOpacity;
				}
				if (strokeColor == null && shape.strokeColor !== undefined) {
					strokeColor = shape.strokeColor;
					strokeOpacity = shape.strokeOpacity;
				}

				// strokeColorの設定でtextColorも設定
				if (strokeColor == null && shape.textColor !== undefined) {
					strokeColor = shape.textColor;
					strokeOpacity = shape.textOpacity
				}

				if (strokeWidth == null && shape.strokeWidth !== undefined) {
					strokeWidth = shape.strokeWidth;
				}

				if (!textSettings && shape.textContent !== undefined) {
					textSettings = {
						textContent: shape.textContent,
						fontFamily: shape.fontFamily,
						fontSize: shape.fontSize,
						fontStyle: shape.fontStyle
					};
				}
			}

			// Fillの設定
			if (fillColor != null) {
				// 最初にヒットしたfillShapeの色をパレットに適用する
				toolCtrl.setFillColor(fillColor, fillOpacity);
				toolCtrl.enableFillColor();
			} else {
				// Fill設定不可
				toolCtrl.setFillColor('#fff', 0);
				toolCtrl.disableFillColor();
			}
			// Strokeの設定
			if (strokeColor != null) {
				// 最初にヒットしたstrokeShapeの色、幅をパレットに適用する
				toolCtrl.setStrokeColor(strokeColor, strokeOpacity);
				toolCtrl.enableStrokeColor();
			} else {
				// Stroke設定不可
				toolCtrl.setStrokeColor('#fff', 0);
				toolCtrl.disableStrokeColor();
			}

			// StrokeWidthの設定
			if (strokeWidth != null) {
				toolCtrl.setStrokeWidth(strokeWidth);
				toolCtrl.enableStrokeWidth();
			} else {
				toolCtrl.disableStrokeWidth();
			}

			// textの設定
			if (textSettings != null) {
				toolCtrl.setTextSettings(textSettings);
				toolCtrl.enableTextSettings();
			} else {
				toolCtrl.disableTextSettings();
			}
		},

		/**
		 * 全ての図形を選択
		 */
		_selectAll: function() {
			this._artboardController.selectAll();
			this._artboardController.setMode(this._artboardController.MODE_SELECT);
			this._toolbarController.hideOptionView();
			this._toolbarController.setSelectMode();
		},

		/**
		 * ロード
		 *
		 * @param saveNo
		 */
		_load: function(saveNo) {
			this._artboardController.clearBackgroundImage();
			this._artboardController.load(this._saveDataMap[saveNo]);
		}
	};
	h5.core.expose(controller);
})();