(function() {
	//--------------------------------------------
	//  定数
	//--------------------------------------------
	/**
	 * 画像IDを保持するデータ属性名
	 */
	var DATA_DRAWING_IMAGE_ID = sample.consts.DATA_DRAWING_IMAGE_ID;

	//--------------------------------------
	//  ToolbarControllerが上げるイベント
	//--------------------------------------
	/** 選択モードに切り替え */
	var EVENT_SELECT_MODE = 'selectMode';

	/** 描画モードに切り替え */
	var EVENT_DRAW_MODE = 'drawMode';

	/** ストロークカラー変更 */
	var EVENT_STROKE_CHANGE = 'strokeChange';

	/** 塗りつぶしカラー変更 */
	var EVENT_FILL_CHANGE = 'fillChange';

	/** ストロークカラーの透明度設定 */
	var EVENT_STROKE_OPACITY_CHANGE = 'strokeOpacityChange';

	/** 塗りつぶしカラーの透明度設定 */
	var EVENT_FILL_OPACITY_CHANGE = 'fillOpacityChange';

	/** ストローク幅設定 */
	var EVENT_STROKE_WIDTH_CHANGE = 'strokeWidthChange';

	/** テキスト設定変更時に上げるイベント */
	var EVENT_TEXT_SETTINGS_CHANGE = 'textSettingsChange';

	/** 全てを選択 */
	var EVENT_SELECT_ALL = 'selectAll';

	/** 選択を全て解除 */
	var EVENT_UNSELECT_ALL = 'unselectAll';

	/** 選択された図形をすべて削除 */
	var EVENT_REMOVE_SELECTED_SHAPE = 'removeSelectedShape';

	/** 図形全てを削除 */
	var EVENT_REMOVE_ALL = 'removeAll';

	/** 画像出力実行 */
	var EVENT_EXPORT = 'export';

	/** セーブ */
	var EVENT_SAVE = 'save';

	/** ロード */
	var EVENT_LOAD = 'load';

	//-------------------------------------------------------------
	//  sample.ToolMenuController
	//-------------------------------------------------------------
	/**
	 * ツールメニューの開閉を行うコントローラ
	 *
	 * @private
	 * @class
	 * @name sample.ToolMenuController
	 */
	var toolMenuController = {
		/**
		 * @memberOf sample.ToolMenuController
		 */
		__name: 'sample.toolMenuController',

		//--------------------
		// メニュー操作
		//--------------------
		/**
		 * メニューの開閉
		 *
		 * @memberOf sample.ToolMenuController
		 * @param context
		 */
		'.menu-wrapper .menu-button h5trackstart': function(context, $el) {
			var $wrapper = $el.parent('.menu-wrapper');
			var $list = $wrapper.find('.menu-list');
			if ($list.hasClass('display-none')) {
				this._openMenu($wrapper);
			} else {
				this._closeMenu($wrapper);
			}
		},

		/**
		 * メニューリストの何れかが選択されたらメニューを隠す
		 *
		 * @memberOf sample.ToolMenuController
		 * @param context
		 * @param $el
		 */
		'.menu-wrapper .menu-list h5trackstart': function(context, $el) {
			var event = context.event;
			event.stopImmediatePropagation();
			if ($(event.target).hasClass('disabled')) {
				// disabledだったら何もしない
				return;
			}
			this._closeMenu($el.parent());
		},

		/**
		 * メニューを開く
		 *
		 * @memberOf sample.ToolMenuController
		 * @private
		 * @param $wrapper
		 */
		_openMenu: function($wrapper) {
			// 左メニュー、右メニューに対応
			var $list = $wrapper.find('.menu-list');
			var isLeft = $wrapper.data('menu-side') === 'left';
			$list.removeClass('display-none');
			var h = $list.height();
			var w = $list.width();
			$list.css({
				top: -h,
				left: isLeft ? 0 : -w + $el.width()
			});
			$wrapper.addClass('open');
		},

		/**
		 * メニューを閉じる
		 *
		 * @memberOf sample.ToolMenuController
		 * @private
		 * @param $wrapper
		 */
		_closeMenu: function($wrapper) {
			var $list = $wrapper.find('.menu-list');
			$list.addClass('display-none');
		}
	};

	//-------------------------------------------------------------
	// sample.TextSettingsController
	//-------------------------------------------------------------
	/**
	 * テキストの設定コントローラ
	 *
	 * @private
	 * @class
	 * @name sample.TextSettingsController
	 */
	var textSettingsController = {
		__name: 'sample.TextSettingsController',
		__init: function() {
			this._$fontFamilySelect = this.$find('select');
			this._$fontFamilyInput = this.$find('[name="font-family"]');
			this._$fontSizeInput = this.$find('[name="size"]');
			this._$textInput = this.$find('[name="text"]');
		},
		__ready: function() {
			this._setSelectedFontFamilyToInput();
		},
		/**
		 * フォントサイズのinputのkeydown
		 * <p>
		 * 数値キー以外の制御、矢印キーで数値の上下
		 * </p>
		 */
		'{this._$fontSizeInput} keydown': function(context, $el) {
			var event = context.event;
			var keyCode = event.keyCode;
			var val = parseInt($el.val());

			if (isNaN(val)) {
				return;
			}
			// 上下キーは数値の上下
			if (keyCode === 38) {
				$el.val(val + 1);
				event.preventDefault();
			} else if (keyCode === 40 && val > 0) {
				$el.val(val - 1);
				event.preventDefault();
			}
		},
		'input keyup': function(context, $el) {
			// keyup時に変更通知
			this._triggerChangeEvent();
		},
		'{this._$fontFamilySelect} change': function(context, $el) {
			this._$fontFamilyInput.val($el.find('option:selected').text());
			this._triggerChangeEvent();
		},
		'.set-text-style h5trackstart': function(context, $el) {
			if ($el.hasClass('selected')) {
				$el.removeClass('selected');
			} else {
				$el.addClass('selected');
			}
			this._triggerChangeEvent();
		},

		setTextSettings: function(settings) {
			this._$textInput.val(settings.textContent);
			this._$fontSizeInput.val(settings.fontSize);
			var $fontFamilyOption = this._$fontFamilySelect.find('[value="' + settings.fontFamily
					+ '"]');
			if ($fontFamilyOption.length) {
				$fontFamilyOption.prop('selected', true);
				this._$fontFamilyInput.val($fontFamilyOption.text());
			} else {
				this._$fontFamilyInput.val(settings.fontFamily);
			}
			for ( var p in settings.fontStyle) {
				var $setStyleBtn = this.$find('.set-text-style[data-text-style="' + p + '"]');
				if (!settings.fontStyle[p]) {
					$setStyleBtn.removeClass('selected');
				} else {
					$setStyleBtn.addClass('selected');
				}
			}
		},

		show: function() {
			$(this.rootElement).removeClass('display-none');
		},

		hide: function() {
			$(this.rootElement).addClass('display-none');
		},

		getFontFamily: function() {
			var inputValue = this._$fontFamilyInput.val();
			// フォント選択セレクトボックスに存在する名前かどうかチェック
			var $options = this._$fontFamilySelect.find('option');
			var fontFamily;
			$options.each(function() {
				if ($.trim($(this).text()) === inputValue) {
					fontFamily = $(this).val();
					return false;
				}
			});
			// フォント選択セレクトボックスに存在する名前ならその値を返す
			// 存在しないならinputの値をそのまま返す(ユーザ入力フォント)
			return fontFamily || inputValue;
		},
		getFontSize: function() {
			return this._$fontSizeInput.val();
		},
		getTextContent: function() {
			return this._$textInput.val();
		},
		getFontStyle: function() {
			var ret = {
				'text-decoration': '',
				'font-weight': 'normal',
				'font-style': ''
			};
			this.$find('.set-text-style.selected').each(function() {
				var value = $(this).data('text-style');
				switch (value) {
				case 'bold':
					ret['font-weight'] = value;
					break;
				case 'italic':
					ret['font-style'] = value;
					break;
				case 'underline':
					if (ret['text-decoration']) {
						ret['text-decoration'] += ' ' + value;
					} else {
						ret['text-decoration'] = value;
					}
					break;
				case 'line-through':
					if (ret['text-decoration']) {
						ret['text-decoration'] += ' ' + value;
					} else {
						ret['text-decoration'] = value;
					}
					break;
				}
			});
			return ret;
		},
		_setSelectedFontFamilyToInput: function() {
			this._$fontFamilyInput.val(this._$fontFamilySelect.find('option:selected').text());
		},
		_triggerChangeEvent: function() {
			this.trigger(EVENT_TEXT_SETTINGS_CHANGE, {
				textContent: this.getTextContent(),
				fontSize: this.getFontSize(),
				fontStyle: this.getFontStyle(),
				fontFamily: this.getFontFamily()
			});
		}
	};

	//-------------------------------------------------------------
	//  sample.ToolbarController
	//-------------------------------------------------------------
	/**
	 * ToolbarController
	 *
	 * @class
	 * @name sample.ToolbarController
	 */
	var controller = {

		/**
		 * コントローラ名
		 *
		 * @memberOf sample.ToolbarController
		 */
		__name: 'sample.ToolbarController',

		/**
		 * メニューコントローラ
		 *
		 * @memberOf sample.ToolbarController
		 * @private
		 */
		_menuController: toolMenuController,

		/**
		 * テキスト設定コントローラ
		 *
		 * @memberOf sample.ToolbarController
		 * @private
		 */
		_textSettingsController: textSettingsController,

		/**
		 * 背景画像追加コントローラ
		 *
		 * @memberOf sample.ToolbarController
		 * @private
		 */
		_pictureController: sample.PictureController,

		/**
		 * コントローラのメタ定義
		 *
		 * @memberOf sample.ToolbarController
		 * @private
		 */
		__meta: {
			_textSettingsController: {
				rootElement: '.text-settings-box'
			},
			_pictureController: {
				rootElement: '{.background-popup}'
			}
		},

		/**
		 * ツールバーコントローラが操作するArtbordController
		 * <p>
		 * すでにバインド済みのArtboardControllerのインスタンスを設定する(親コントローラ等で設定)。
		 * スタンプの配置、Controllerのメソッドを呼んでスタンプを配置する。
		 * </p>
		 *
		 * @memberOf sample.ToolbarController
		 * @type {h5.ui.components.artboard.controller.ArtboardController}
		 */
		targetArtboard: null,

		/**
		 * スタンプリスト要素
		 *
		 * @memberOf sample.ToolbarController
		 * @private
		 */
		_$stampList: null,

		/**
		 * テキスト入力要素
		 *
		 * @memberOf sample.ToolbarController
		 * @private
		 */
		_$textInputBox: null,

		/**
		 * テキストスタンプモードかどうか
		 *
		 * @memberOf sample.ToolbarController
		 * @private
		 */
		_isTextStampMode: false,

		/**
		 * ドラッグ中のスタンプ
		 *
		 * @memberOf sample.ToolbarController
		 * @private
		 */
		_$draggingStamp: null,

		/**
		 * ツールバー設定の一時保存
		 *
		 * @memberOf sample.ToolbarController
		 * @private
		 */
		_savedSettings: null,

		/**
		 * ポップアップ名とポップアップのマップ
		 * <p>
		 * '.popup-open[data-popup-name="hoge"]'の要素をクリックすると、popupMap['hoge']に登録されたポップアップが開きます。
		 * </p>
		 *
		 * @memberOf sample.ToolbarController
		 * @type {Object}
		 */
		popupMap: {},

		/**
		 * __initイベント
		 *
		 * @memberOf sample.ToolbarController
		 * @private
		 */
		__init: function() {
			// スタンプリストの設定
			this._$stampList = this.$find('.stamp-list');

			// 各スライダーの設定(nouislider使用)
			$('.opacity-slidebar').each(function() {
				var $this = $(this);
				$this.noUiSlider({
					start: 100,
					direction: 'rtl',
					orientation: 'vertical',
					step: 1,
					range: {
						min: 0,
						max: 100
					}
				});
			});
			this.$find('.stroke-width-slidebar').noUiSlider({
				start: 5,
				direction: 'ltr',
				step: 1,
				range: {
					min: 1,
					max: 50
				}
			});
			this.$find('.background-color-slidebar').noUiSlider({
				start: 100,
				direction: 'ltr',
				step: 1,
				range: {
					min: 0,
					max: 100
				}
			});

			// ポップアップの設定
			// 背景画像設定ポップアップ
			this._backgroundPopup = h5.ui.popupManager.createPopup('backgroundPopup', '', this
					.$find('.popup-contents-wrapper').find('.background-popup'), null, {
				header: false
			});

			this._saveDataPopup = h5.ui.popupManager.createPopup('saveDataPopup', '', this.$find(
					'.popup-contents-wrapper').find('.saveData-popup'), null, {
				header: false
			});

			this.popupMap = {
				'background-popup': this._backgroundPopup,
				'saveData-popup': this._saveDataPopup
			};

			// テキスト入力要素
			this._$textInputBox = this.$find('.text-input-box');
			$(this.targetArtboard.rootElement).append(this._$textInput);
		},

		/**
		 * ポップアップを表示
		 * <p>
		 * クリックされた要素の'data-popup-name'に指定されたポップアップ名のポップアップを開きます
		 * </p>
		 *
		 * @memberOf sample.ToolbarController
		 * @param context
		 * @param $el
		 */
		'.popup-open h5trackstart': function(context, $el) {
			if ($el.hasClass('disabled')) {
				return;
			}
			var popupCls = $el.data('popup-name');
			if (popupCls === 'saveData-popup') {
				// セーブデータの表示
				var saveNo = $el.parents('.saved-img-wrapper>*').find('[data-save-no]').data(
						'save-no');
				this.trigger('showSaveData', saveNo);
			}
			this._showPopup(popupCls);
		},

		/**
		 * undo
		 *
		 * @memberOf sample.ToolbarController
		 * @param context
		 */
		'.undo h5trackstart': function(context) {
			// ダブルタップによるzoomが動かないようにpreventDefault
			context.event.preventDefault();
			this.hideOptionView();
			this.trigger(EVENT_UNSELECT_ALL);
			this.targetArtboard.undo();
		},

		/**
		 * redo
		 *
		 * @memberOf sample.ToolbarController
		 * @param context
		 */
		'.redo h5trackstart': function(context) {
			context.event.preventDefault();
			this.hideOptionView();
			this.trigger(EVENT_UNSELECT_ALL);
			this.targetArtboard.redo();
		},

		/**
		 * 全て選択
		 *
		 * @memberOf sample.ToolbarController
		 * @param context
		 */
		'.select-all h5trackstart': function(context) {
			this.trigger(EVENT_SELECT_ALL);
		},

		/**
		 * 全て削除
		 */
		'.remove-all h5trackstart': function() {
			this.trigger(EVENT_REMOVE_ALL);
		},

		/**
		 * モード選択：select
		 *
		 * @param context
		 * @param $el
		 */
		'.mode-select h5trackstart': function(context, $el) {
			context.event.preventDefault();
			this.hideOptionView();
			this.trigger(EVENT_SELECT_MODE);
			this.setSelectMode();
		},

		/**
		 * 画像にexport
		 *
		 * @param context
		 */
		'.export h5trackstart': function(context) {
			this.trigger(EVENT_EXPORT);
		},

		/**
		 * ツールの選択
		 *
		 * @param context
		 * @param $el
		 */
		'.toolbar-icon h5trackstart': function(context, $el) {
			context.event.preventDefault();
			var toolName = $el.data('tool-name');
			var isSelected = $el.hasClass('selected');

			// 既に選択されているツールなら何もしない
			if (isSelected) {
				return;
			}
			this.hideOptionView();

			// スタンプならスタンプリストを表示
			if (toolName === 'stamp') {
				this._showStampList();
			} else {
				this._hideStampList();
			}

			// 文字入力ならテキスト入力モードに変更
			if (toolName === 'text') {
				this._isTextStampMode = true;
				$(this.targetArtboard.rootElement).addClass('mode-text-input');
			} else {
				this._isTextStampMode = false;
				$(this.targetArtboard.rootElement).removeClass('mode-text-input');
			}

			this.$find('.toolbar-icon').removeClass('selected');
			this.$find('.mode-select').removeClass('selected');
			$el.addClass('selected');

			this.trigger(EVENT_DRAW_MODE, toolName);
		},

		'.stamp-img h5trackstart': function(context, $el) {
			if ($el.hasClass('selected')) {
				return;
			}
			this.$find('.stamp-img').removeClass('selected');
			$el.addClass('selected');
		},

		//--------------------------------------------------------
		// 色の設定
		//--------------------------------------------------------
		'.pallete-color h5trackstart': function(context, $el) {
			var $selectedColor = this.$find('.color-pallete .selected .selected-color');
			if ($selectedColor.length === 0) {
				return;
			}
			var color = $el.css('background-color');
			$selectedColor.css('background-color', color);
			var isFill = $selectedColor.hasClass('fill');

			this.trigger(isFill ? EVENT_FILL_CHANGE : EVENT_STROKE_CHANGE, color);
		},

		'.selected-color h5trackstart': function(context, $el) {
			if ($el.parent().hasClass('disabled')) {
				return;
			}
			var $parent = $el.parents('.selected-color-wrapper');
			var $slidebar = $parent.find('.opacity-slidebar-wrapper');
			$el.parents('.color-pallete').find('.selected').removeClass('selected');
			$el.parent().addClass('selected');
			// 表示/非表示切替
			if ($slidebar.hasClass('display-none')) {
				$slidebar.removeClass('display-none');
				var top = $slidebar.outerHeight();
				var width = $el.innerWidth();
				$slidebar.css({
					top: -top,
					left: $el.offset().left,
					width: width
				});
			} else {
				$slidebar.addClass('display-none');
			}
		},

		'.opacity-slidebar-wrapper slide': function(context, $el) {
			var $target = $(context.event.target);
			var val = parseInt($target.val());
			var opacity = val / 100;
			$el.find('.slider-value').text(val);
			$el.parent().find('.selected-color').css('opacity', opacity);
			var isFill = $target.hasClass('opacity-fill');
			this.trigger(isFill ? EVENT_FILL_OPACITY_CHANGE : EVENT_STROKE_OPACITY_CHANGE, opacity);
		},

		//--------------------------------------------------------
		// ストローク幅
		//--------------------------------------------------------
		'.stroke-width-slider-wrapper slide': function(context, $el) {
			var $target = $(context.event.target);
			var val = parseInt($target.val());
			$el.find('.slider-value').text(val);
			this.trigger(EVENT_STROKE_WIDTH_CHANGE, val);
		},

		//--------------------------------------------------------
		// スタンプ
		//--------------------------------------------------------
		'.stamp-list .stamp-img h5trackstart': function(context, $el) {
			var $stamp = $el.find('img').clone();

			var event = context.event;
			var x = event.pageX;
			var y = event.pageY;
			$stamp.css({
				position: 'absolute',
				display: 'block'
			});
			$(this.rootElement).append($stamp);
			// height/widthはdisplay:blockで配置してから取得
			var height = $stamp.height();
			var width = $stamp.width();
			$stamp.addClass('dragging');
			$stamp.css({
				left: x - width / 2,
				top: y - height / 2
			});
			this._$draggingStamp = $stamp;
		},

		'.stamp-list .stamp-img h5trackmove': function(context) {
			// クローンしたimg要素をポインタに追従
			var $stamp = this._$draggingStamp;
			var event = context.event;
			var x = event.pageX;
			var y = event.pageY;
			var height = $stamp.height();
			var width = $stamp.width();
			var left = x - width / 2;
			var top = y - height / 2;
			$stamp.css({
				display: 'block',
				left: left,
				top: top
			});
		},

		'.stamp-list .stamp-img h5trackend': function(context) {
			var event = context.event;
			var targetArtboard = this.targetArtboard;
			var $stamp = this._$draggingStamp;
			var height = $stamp[0].height;
			var width = $stamp[0].width;
			var offset = $(targetArtboard.rootElement).offset();
			var x = event.pageX - width / 2 - offset.left;
			var y = event.pageY - height / 2 - offset.top;

			var $artboardRoot = $(targetArtboard.rootElement);
			if (0 < x + width && 0 < y + height && x < $artboardRoot.innerWidth()
					&& y < $artboardRoot.innerHeight()) {
				// 範囲内なら描画
				targetArtboard.drawImage({
					id: $stamp.data(DATA_DRAWING_IMAGE_ID),
					x: x,
					y: y,
					width: width,
					height: height
				});
			}
			$stamp.remove();
			this._$draggingStamp = null;
		},

		//--------------------------------------------------------
		// テキスト
		//--------------------------------------------------------
		'{this.targetArtboard.rootElement} h5trackstart': function(context) {
			this._isTracking = true;
			if (!this._isTextStampMode) {
				return;
			}
			this._showTextInput(context);
		},

		_showTextInput: function(context) {
			var targetArtboard = this.targetArtboard;
			var event = context.event;
			var offset = $(targetArtboard.rootElement).offset();
			var x = event.pageX - offset.left;
			var y = event.pageY - offset.top;
			this._$textInputBox.addClass('dragging').removeClass('display-none');
			var maxLeft = $(targetArtboard.rootElement).width() - this._$textInputBox.width();
			this._$textInputBox.css({
				left: x > maxLeft ? maxLeft : x,
				top: y
			});
			this._$textInputBox.find('input').focus();
		},

		'.text-input-box [name="text-input"] keydown': function(context) {
			if (context.event.keyCode !== 13) {
				return;
			}
			// エンターキーなら描画
			var val = this._$textInputBox.find('input').val();
			if (!val) {
				// 何も入力されていないなら入力ボックスを非表示にして終了
				this._$textInputBox.addClass('display-none');
				return;
			}
			this._drawText(val);
		},

		'.text-input-box .set-text h5trackstart': function(context) {
			var val = this._$textInputBox.find('input').val();
			if (!val) {
				// 何も入力されていないなら入力ボックスを非表示にして終了
				this._$textInputBox.addClass('display-none');
				return;
			}
			this._drawText(val);
		},

		_drawText: function(text) {
			// テキストの描画
			var targetArtboard = this.targetArtboard;
			var offset = $(this._$textInputBox).offset();
			var x = offset.left;
			var y = offset.top;

			var $artboardRoot = $(targetArtboard.rootElement);
			if (0 < x && 0 < y && x < $artboardRoot.innerWidth() && y < $artboardRoot.innerHeight()) {
				// 範囲内なら描画
				var settings = this._textSettingsController;
				var fontSize = settings.getFontSize();
				var fontFamily = settings.getFontFamily();
				var style = settings.getFontStyle();
				targetArtboard.drawText({
					x: x,
					y: y - 3, // FIXME textタグにするときの位置調整
					text: text,
					fontSize: fontSize,
					fontFamily: fontFamily,
					style: style
				});
			}
			this._$textInputBox.find('input').val('');
			this._$textInputBox.addClass('display-none');
		},

		//--------------------------------------------------------
		// 背景の設定
		//--------------------------------------------------------
		/**
		 * 背景画像の設定
		 *
		 * @memberOf sample.ToolbarController
		 * @param context
		 */
		'{.background-popup .set-background} h5trackstart': function(context, $el) {
			var targetArtboard = this.targetArtboard;
			var $popup = $el.parents('.background-popup');
			var $selected = $popup.find('.thumbnail.background.selected');

			var backgroundData = null;
			if ($selected.length) {
				var selectedElement = $selected[0];
				var fillMode = $popup.find('.background-fillmode-list').val();

				backgroundData = {
					id: $selected.data(DATA_DRAWING_IMAGE_ID),
					fillMode: fillMode
				};
				if (fillMode === 'none-center') {
					// 中央配置
					var $artboardRoot = $(targetArtboard.rootElement);
					var w = selectedElement.naturalWidth;
					var h = selectedElement.naturalHeight;
					backgroundData.x = ($artboardRoot.innerWidth() - w) / 2;
					backgroundData.y = ($artboardRoot.innerHeight() - h) / 2;
					backgroundData.fillMode = 'none';
				} else if (fillMode === 'contain-center') {
					// containでかつ中央配置
					var $artboardRoot = $(targetArtboard.rootElement);
					var w = selectedElement.naturalWidth;
					var h = selectedElement.naturalHeight;
					var artboardW = $artboardRoot.innerWidth();
					var artboardH = $artboardRoot.innerHeight();
					var imgRate = w / h;
					var canvasRate = artboardW / artboardH;
					var drawW, drawH;
					if (canvasRate < imgRate) {
						drawW = artboardW;
						drawH = drawW * imgRate;
						backgroundData.x = 0;
						backgroundData.y = (artboardH - drawH) / 2;
					} else {
						drawH = artboardH;
						drawW = drawH * imgRate;
						backgroundData.x = (artboardW - drawW) / 2;
						backgroundData.y = 0;
					}
					backgroundData.fillMode = 'contain';
				}
			}
			// 背景色設定
			var rgbaColor = null;
			var color = $popup.find('.background-color-selected').css('background-color');
			var opacity = $popup.find('.background-color-selected').css('opacity');
			rgbaColor = sample.util.rgbToRgba(color, opacity);

			this.trigger(EVENT_UNSELECT_ALL);
			targetArtboard.setBackground(rgbaColor, backgroundData);

			// 設定したらpopupを閉じる
			this._hidePopup();
		},

		/**
		 * 背景画像リストの表示
		 *
		 * @param context
		 * @param $el
		 */
		'{.background-popup .thumbnail:not(.img-input-wrap)} h5trackstart': function(context, $el) {
			this._selectBackgroundThumbnail($el);
		},

		/**
		 * 背景色の設定の表示
		 *
		 * @param context
		 * @param $el
		 */
		'{.background-popup .background-color-list} change': function(context, $el) {
			var $parent = $el.parents('.background-popup');
			var $colorList = $parent.find('.background-color-palette');
			var $opacity = $parent.find('.background-color-opacity');
			var $selectedWrapper = $parent.find('.background-color-selected-wrapper');
			if ($el.val() === 'none') {
				$colorList.addClass('display-none');
				$opacity.addClass('display-none');
				$selectedWrapper.addClass('display-none');
				this._backgroundPopup.refresh();
			} else {
				$colorList.removeClass('display-none');
				$opacity.removeClass('display-none');
				$selectedWrapper.removeClass('display-none');
				this._backgroundPopup.refresh();
			}
		},

		/**
		 * 背景色の透明度の設定
		 */
		'{.background-popup .background-color-slidebar} slide': function(context, $el) {
			var $parent = $el.parents('.background-popup');
			var val = parseInt($el.val());
			var opacity = val / 100;
			$parent.find('.background-color-opacity .opacity-value').text(val);
			$parent.find('.background-color-palette .pallete-color').css('opacity', opacity);
			var $selected = $parent.find('.background-color-selected');
			$selected.css({
				opacity: opacity
			});
		},

		/**
		 * 背景色の選択
		 *
		 * @param context
		 * @param $el
		 */
		'{.background-popup .pallete-color} h5trackstart': function(context, $el) {
			var $parent = $el.parents('.background-popup');
			var $selected = $parent.find('.background-color-selected');
			var opacity = $el.css('opacity');
			var color = $el.css('background-color');
			$selected.css({
				backgroundColor: color,
				opacity: opacity
			});
		},

		/**
		 * 画像の追加(ファイル・カメラ)
		 *
		 * @param ctx
		 */
		'{.background-popup} addPicture': function(ctx) {
			var imageData = ctx.evArg.imageData;
			var $img = $(this.view.get('backgroundThumbnail', {
				imageData: imageData
			}));
			$(this._backgroundPopup.rootElement).find('.img-input-wrap').after($img);
			// 追加された画像をimageMapに登録
			this.trigger('registDrawingImage', {
				img: $img[0]
			});
			// 追加された画像を選択状態にする
			this._selectBackgroundThumbnail($img);
		},

		'.remove-selected-shape h5trackstart': function() {
			this.trigger(EVENT_REMOVE_SELECTED_SHAPE);
		},

		_selectBackgroundThumbnail: function($el) {
			if ($el.hasClass('selected') || $el.hasClass('img-input-wrap')) {
				return;
			}
			var $popup = $el.parents('.background-popup');
			var $fillModeWrapper = $popup.find('.background-fillmode-wrapper');
			$popup.find('.thumbnail.selected').removeClass('selected');
			$el.addClass('selected');
			$fillModeWrapper.removeClass('display-none');
			if ($el.hasClass('none')) {
				$popup.find('.selected-bg').text($el.text());
				$fillModeWrapper.addClass('display-none');
				return;
			}
			$fillModeWrapper.removeClass('display-none');
			$popup.find('.selected-bg').text($el.attr('title'));
		},

		_showStampList: function(position) {
			this._$stampList.removeClass('display-none');
			var $stampIcon = $('[data-tool-name="stamp"]');
			var offset = $stampIcon.offset();
			this._$stampList.css({
				left: offset.left + $stampIcon.width() - this._$stampList.width(),
				top: offset.top + $stampIcon.height() + 1
			});
		},

		_hideStampList: function() {
			this._$stampList.addClass('display-none');
		},

		_showTextSettings: function(position) {
			var $textIcon = $('[data-tool-name="text"]');
			var offset = $textIcon.offset();
			this._textSettingsController.show();
			var $textSettingsRoot = $(this._textSettingsController.rootElement);
		},

		_hideTextSettings: function() {
			this._textSettingsController.hide();
		},

		_hideOpacitySlideBar: function() {
			this.$find('.opacity-slidebar-wrapper').addClass('display-none');
		},

		hideOptionView: function() {
			this._hideOpacitySlideBar();
			this._hideStampList();
			this._hideTextSettings();
			this._$textInputBox.addClass('display-none');
		},

		/**
		 * 現在の色選択状態、線の幅をセーブする
		 */
		saveSettings: function() {
			this._savedSettings = {
				strokeColor: this.$find('.selected-color.stroke').css('background-color'),
				fillColor: this.$find('.selected-color.fill').css('background-color'),
				strokeOpacity: parseInt(this.$find('.opacity-slidebar.opacity-stroke').val()) / 100,
				fillOpacity: parseInt(this.$find('.opacity-slidebar.opacity-fill').val()) / 100,
				strokeWidth: parseInt(this.$find('.stroke-width-slidebar').val())
			};
		},

		/**
		 * 背景画像、背景色設定ポップアップ
		 */
		_backgroundPopup: null,

		/**
		 * 色選択状態、線の幅をsaveSettingsした時の状態に戻す
		 */
		restoreSettings: function() {
			var savedSettings = this._savedSettings;
			if (!savedSettings) {
				return;
			}

			this.setStrokeColor(savedSettings.strokeColor, savedSettings.strokeOpacity);
			this.setFillColor(savedSettings.fillColor, savedSettings.fillOpacity);
			this.setStrokeWidth(savedSettings.strokeWidth);
		},

		setStrokeColor: function(color, opacity) {
			var $strokeColor = this.$find('.selected-color.stroke');
			var $strokeOpacity = this.$find('.opacity-slidebar.opacity-stroke');
			var $strokeLabel = $strokeOpacity.parent().find('.slider-value');
			$strokeColor.css('background-color', color);
			$strokeColor.css('opacity', opacity);
			$strokeOpacity.val(parseInt(100 * opacity));
			$strokeLabel.text(parseInt(100 * opacity));
		},

		setFillColor: function(color, opacity) {
			var $fillColor = this.$find('.selected-color.fill');
			var $fillOpacity = this.$find('.opacity-slidebar.opacity-fill');
			var $fillLabel = $fillOpacity.parent().find('.slider-value');
			$fillColor.css('background-color', color);
			$fillColor.css('opacity', opacity);
			$fillOpacity.val(parseInt(100 * opacity));
			$fillLabel.text(parseInt(100 * opacity));
		},

		setStrokeWidth: function(width) {
			var $strokeWidth = this.$find('.stroke-width-slidebar');
			var $strokeWidthLabel = $strokeWidth.parent().find('.slider-value');
			width = parseInt(width);
			$strokeWidth.val(width);
			$strokeWidthLabel.text(width);
		},

		setTextSettings: function(textSettings) {
			this._textSettingsController.setTextSettings(textSettings);
		},

		disableStrokeColor: function() {
			this.$find('.selected-color-wrapper.stroke').addClass('disabled').removeClass(
					'selected');
			this.$find('.opacity-slidebar-wrapper.opacity-stroke').addClass('display-none');
		},

		enableStrokeColor: function() {
			this.$find('.selected-color-wrapper.stroke').removeClass('disabled').addClass(
					'selected');
			this.$find('.selected-color-wrapper.fill').removeClass('selected');
		},

		enableFillColor: function() {
			this.$find('.selected-color-wrapper.fill').removeClass('disabled').addClass('selected');
			this.$find('.selected-color-wrapper.stroke').removeClass('selected');
		},

		disableFillColor: function() {
			this.$find('.selected-color-wrapper.fill').addClass('disabled').removeClass('selected');
			this.$find('.opacity-slidebar-wrapper.opacity-fill').addClass('display-none');
		},

		enableStrokeWidth: function() {
			this.$find('.stroke-width-slider-wrapper').removeClass('disabled');
			this.$find('.stroke-width-slidebar').removeAttr('disabled');
		},

		disableStrokeWidth: function() {
			this.$find('.stroke-width-slider-wrapper').addClass('disabled');
			this.$find('.stroke-width-slidebar').attr('disabled', 'disabled');
		},

		enableRemove: function() {
			this.$find('.remove-selected-shape').removeClass('disabled');
		},

		disableRemove: function() {
			this.$find('.remove-selected-shape').addClass('disabled');
		},

		enableTextSettings: function() {
			this._showTextSettings();
		},

		disableTextSettings: function() {
			this._hideTextSettings();
		},

		setSelectMode: function() {
			this.$find('.toolbar-icon').removeClass('selected');
			this.$find('.mode-select').addClass('selected');

			// テキスト入力モードの終了
			this._isTextStampMode = false;
			$(this.targetArtboard.rootElement).removeClass('mode-text-input');
		},

		//---------------------------
		// セーブ/ロード
		//---------------------------
		/**
		 * セーブ
		 */
		'.save h5trackstart': function() {
			this.trigger(EVENT_SAVE);
			this.$find('.popup-open[data-popup-name="load-popup"]').removeClass('disabled');
		},

		/**
		 * ロード
		 *
		 * @param context
		 */
		'{.load-popup .load} h5trackstart': function(context, $el) {
			var $select = $el.parents('.load-popup').find('.load-data-list');
			var saveNo = $select.val();
			var label = $select.find(':selected').text();
			if (!confirm(h5.u.str.format('{0}\nをロードします。よろしいですか？', label))) {
				return;
			}
			this.trigger(EVENT_LOAD, saveNo);
		},

		//-----------------------------------
		// ポップアップ
		//-----------------------------------
		/**
		 * ポップアップ
		 */
		'{.popupCloseBtn} click': function() {
			this._hidePopup();
		},
		/**
		 * ポップアップの表示
		 *
		 * @param cls
		 */
		_showPopup: function(cls) {
			var popup = this.popupMap[cls];
			popup.show();
		},
		/**
		 * ポップアップを隠す
		 *
		 * @param cls
		 */
		_hidePopup: function() {
			// close()はしないけどdisplay:noneにしたいのでcurrentを外す
			// FIXME h5Popupはcurrent出ない場合にdisplay:noneになっていてほしい(現状visiblity:hiddenになっているだけ)
			this._backgroundPopup.hide();
			this._saveDataPopup.hide();
			$(this._backgroundPopup.rootElement).removeClass('current');
			;
			$(this._saveDataPopup.rootElement).removeClass('current');
		}
	};
	h5.core.expose(controller);
})();