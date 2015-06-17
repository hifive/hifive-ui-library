// =============================================================================
// 業務画面 1ページに対応する、コントローラ、ロジックの定義を以下に記載する.
//
// h5.core.exposeを使って、明示的な公開を行わない限り、
// コードの定義は本ファイル内に閉じる.
// =============================================================================
(function() {
	// =========================================================================
	// このファイル内のみで有効な定数
	// =========================================================================

	// =========================================================================
	// このファイル内のみで有効な変数
	// =========================================================================

	// =========================================================================
	// このファイル内のみで有効な関数
	// =========================================================================

	// =========================================================================
	// ロジックの定義
	// =========================================================================

	// =========================================================================
	// コントローラ定義
	// =========================================================================
	/**
	 * @class
	 * @name sample.SaveController
	 */
	var saveController = {
		/**
		 * @private
		 * @memberOf sample.SaveController
		 */
		__name: 'sample.SaveController',

		_aspect: null,

		__init: function(ctx) {
			var size = ctx.args.canvasSize;
			this._$width = this.$find('[name="save-width"]');
			this._$height = this.$find('[name="save-height"]');
			this._$aspectCheck = this.$find('[name="save-keep-aspect-ratio"]');
			this._$sizeCheck = this.$find('[name="save-size-on"]');
			this._$trimCheck = this.$find('[name="save-trim-on"]');
			this._$dx = this.$find('[name="save-trim-dx"]');
			this._$dy = this.$find('[name="save-trim-dy"]');
			this._$dw = this.$find('[name="save-trim-dw"]');
			this._$dh = this.$find('[name="save-trim-dh"]');
			this._$save = this.$find('.save');
			this.setDefaultSettings(size);
		},

		setDefaultSettings: function(settings) {
			var w = settings.width;
			var h = settings.height;
			this._$width.val(w);
			this._$height.val(h);
			this._$dx.val(0);
			this._$dy.val(0);
			this._$dw.val(w);
			this._$dh.val(h);
			this._aspect = w / h;
		},

		'{this._$width} keyup': function(ctx, $el) {
			var w = parseInt($el.val());
			if (isNaN(w) || !this._$aspectCheck.prop('checked')) {
				return;
			}
			this._$height.val(parseInt(w / this._aspect));
		},

		'{this._$height} keyup': function(ctx, $el) {
			var h = parseInt($el.val());
			if (isNaN(h) || !this._$aspectCheck.prop('checked')) {
				return;
			}
			this._$width.val(parseInt(h * this._aspect));
		},

		'{this._$sizeCheck} change': function(ctx, $el) {
			this.$find('.save-size-settings').find('input').not($el).prop('disabled',
					!$el.prop('checked'));
		},


		'{this._$trimCheck} change': function(ctx, $el) {
			this.$find('.save-trim-settings').find('input').not($el).prop('disabled',
					!$el.prop('checked'));
		},

		'{this._$save} h5trackstart': function() {
			var saveOpt = {
				// italic対のシミュレート
				simulateItalic: true
			};
			if (this._$sizeCheck.prop('checked')) {
				var w = parseInt(this._$width.val());
				var h = parseInt(this._$height.val());
				if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
					alert('幅と高さは0より大きい数値で指定してください');
					return;
				}
				var size = {
					width: w,
					height: h
				};
				saveOpt.size = size;
			}
			if (this._$trimCheck.prop('checked')) {
				var trim = {
					dx: this._$dx.val(),
					dy: this._$dy.val(),
					dw: this._$dw.val(),
					dh: this._$dh.val()
				};
				saveOpt.trim = trim;
			}
			this.trigger('save', saveOpt);
		},

		'.save-trim-select h5trackstart': function() {
		// TODO ドラッグして選択できるようにする
		}
	};

	/**
	 * コントローラ定義を公開.
	 */
	h5.core.expose(saveController);

})();