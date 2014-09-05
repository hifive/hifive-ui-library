(function() {
	/**
	 * ToolbarController
	 *
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
		 * スタンプリスト要素
		 */
		_$stampList: null,

		/**
		 * ドラッグ中のスタンプ
		 */
		_$draggingStamp: null,

		/**
		 * 設定の一時保存
		 */
		_savedSettings: null,

		__init: function() {
			this._$stampList = this.$find('.stamp-list');

			// スライダーの設定(nouislider使用)
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
			$('.stroke-width-slidebar').noUiSlider({
				start: 5,
				direction: 'ltr',
				step: 1,
				range: {
					min: 1,
					max: 50
				}
			});
		},

		'.undo h5trackstart': function(context) {
			// ダブルタップによるzoomが動かないようにpreventDefault
			context.event.preventDefault();
			this.hideOptionView();
			this.trigger('undo');
		},

		'.redo h5trackstart': function(context) {
			context.event.preventDefault();
			this.hideOptionView();
			this.trigger('redo');
		},

		'.shape-select h5trackstart': function(context, $el) {
			context.event.preventDefault();
			this.hideOptionView();
			this.trigger('shape-select');
			this.$find('.toolbar-icon').removeClass('selected');
			$el.addClass('selected');
		},

		'.export-img h5trackstart': function(context) {
			this.trigger('export-img');
		},

		'.toolbar-icon h5trackstart': function(context, $el) {
			context.event.preventDefault();
			var toolName = $el.data('tool-name');
			var isSelected = $el.hasClass('selected');
			if (isSelected) {
				return;
			}
			// スタンプならスタンプリストを表示
			if (toolName === 'stamp') {
				var offset = $el.offset();
				this.hideOptionView();
				this._showStampList({
					left: offset.left - $el.outerWidth() / 2,
					top: offset.top + $el.outerHeight()
				});
			} else {
				this._hideStampList();
			}
			this.$find('.toolbar-icon').removeClass('selected');
			this.$find('.shape-select').removeClass('selected');
			$el.addClass('selected');

			this.trigger('tool-select', toolName);
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

			this.trigger(isFill ? 'fill-change' : 'stroke-change', color);
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
			$el.find('.slider-value').text(val);
			$el.parent().find('.selected-color').css('opacity', val / 100);
			if ($target.hasClass('opacity-fill')) {
				this.trigger('fill-opacity-change', val / 100);
			} else {
				this.trigger('stroke-opacity-change', val / 100);
			}
		},

		//--------------------------------------------------------
		// ストローク幅
		//--------------------------------------------------------
		'.stroke-width-slider-wrapper slide': function(context, $el) {
			var $target = $(context.event.target);
			var val = parseInt($target.val());
			$el.find('.slider-value').text(val);
			this.trigger('stroke-width-change', val);
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
			var $stamp = this._$draggingStamp;
			var event = context.event;
			var height = $stamp.height();
			var width = $stamp.width();
			this.trigger('dropstamp', {
				img: this._$draggingStamp,
				x: event.pageX - width / 2,
				y: event.pageY - height / 2
			});

			$stamp.removeClass('dragging');
			$stamp.remove();
			this._$draggingStamp = null;
		},

		/**
		 * 背景画像の設定
		 *
		 * @memberOf sample.ToolbarController
		 * @param context
		 */
		'.set-background h5trackstart': function(context, $el) {
			var $parent = $el.parents('.background-select-wrapper');
			var val = $parent.find('.background-list').val();
			if (val === 'none') {
				this.trigger('set-background', null);
				return;
			} else if (val === 'color') {
				// fillカラーから取得
				var $fill = this.$find('.selected-color.fill');
				this.trigger('set-background', {
					color: $fill.css('background-color'),
					opacity: $fill.css('opacity')
				});
				return;
			}
			// 画像IDの場合は画像
			var img = $parent.find('.drawing-image')[parseInt(val)];
			var fillMode = $('.background-fillmode-list').val();

			this.trigger('set-background', {
				element: img,
				fillMode: fillMode
			});
		},

		/**
		 * 背景画像選択select
		 *
		 * @memberOf sample.ToolbarController
		 * @param context
		 * @param $el
		 */
		'.background-list change': function(context, $el) {
			var val = $el.val();
			if (val === 'none' || val === 'color') {
				// 画像でないなら、fillMode設定を非表示
				this.$find('.background-fillmode-list-label,.background-fillmode-list').addClass(
						'display-none');
			} else {
				// 画像指定なら、fillMode設定を表示
				this.$find('.background-fillmode-list-label,.background-fillmode-list')
						.removeClass('display-none');
			}
		},

		'.remove-selected-shape h5trackstart': function() {
			this.trigger('remove-selected-shape');
		},

		'.remove-all-shape h5trackstart': function() {
			this.trigger('remove-all-shape');
		},

		_showStampList: function(position) {
			this._$stampList.css({
				left: position.left,
				top: position.top
			}).removeClass('display-none');
		},

		_hideStampList: function() {
			this._$stampList.addClass('display-none');
		},

		_hideOpacitySlideBar: function() {
			this.$find('.opacity-slidebar-wrapper').addClass('display-none');
		},

		hideOptionView: function() {
			this._hideOpacitySlideBar();
			this._hideStampList();
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
			$strokeWidth.val(width);
			$strokeWidthLabel.text(width);
		},

		disableStrokeColor: function() {
			this.$find('.selected-color-wrapper.stroke').addClass('disabled').removeClass(
					'selected');
			this.$find('.opacity-slidebar-wrapper.opacity-stroke').addClass('display-none');
		},

		disableFillColor: function() {
			this.$find('.selected-color-wrapper.fill').addClass('disabled').removeClass('selected');
			this.$find('.opacity-slidebar-wrapper.opacity-fill').addClass('display-none');
		},

		disableStrokeWidth: function() {
			this.$find('.stroke-width-slider-wrapper').addClass('disabled');
			this.$find('.stroke-width-slidebar').attr('disabled', 'disabled');
		},

		disableRemove: function() {
			this.$find('.remove-selected-shape').addClass('disabled');
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
		enableStrokeWidth: function() {
			this.$find('.stroke-width-slider-wrapper').removeClass('disabled');
			this.$find('.stroke-width-slidebar').removeAttr('disabled');
		},

		enableRemove: function() {
			this.$find('.remove-selected-shape').removeClass('disabled');
		},

		//---------------------------
		// セーブ/ロード
		//---------------------------]
		'.save-button h5trackstart': function() {
			this.trigger('save');
		},

		appendSaveDataList: function(saveNo) {
			this.$find('.load-select-wrapper').removeClass('display-none');
			var label = h5.u.str.format('[{0}] {1}', saveNo, sample.util.dateFormat(new Date()));
			var $option = $(h5.u.str.format('<option value="{0}">{1}</option>', saveNo, label));
			this.$find('.load-data-list').prepend($option);
			$option.prop('selected', true);
			alert('セーブしました\n' + label);
		},

		'.load-button h5trackstart': function(context) {
			var $select = this.$find('.load-data-list');
			var saveNo = $select.val();
			var label = $select.find(':selected').text();
			if (!confirm(h5.u.str.format('{0}\nをロードします。よろしいですか？', label))) {
				return;
			}
			this.trigger('load', saveNo);
		}
	};
	h5.core.expose(controller);
})();