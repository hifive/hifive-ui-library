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
			this._$save = this.$find('.save');
			this.setDefaultSettings(size);
		},

		setDefaultSettings: function(settings) {
			this._$width.val(settings.width);
			this._$height.val(settings.height);
			this._aspect = settings.width / settings.height;
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
		'{this._$save} h5trackstart': function() {
			var w = parseInt(this._$width.val());
			var h = parseInt(this._$height.val());
			if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
				alert('幅と高さは0より大きい数値で指定してください');
				return;
			}
			var saveOpt = {
				width: w,
				height: h
			};
			this.trigger('save', saveOpt);
		}
	};

	/**
	 * コントローラ定義を公開.
	 */
	h5.core.expose(saveController);

})();