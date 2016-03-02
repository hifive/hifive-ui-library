(function() {
	/**
	 * @class
	 * @name sample.SizeChangeController
	 */
	var saveController = {
		/**
		 * @private
		 * @memberOf sample.SizeChangeController
		 */
		__name: 'sample.SizeChangeController',

		__init: function(ctx) {
			var size = ctx.args.canvasSize;
			this._$width = this.$find('[name="size-change-width"]');
			this._$height = this.$find('[name="size-change-height"]');
			this._$sizeChange = this.$find('.sizeChange');
			this.setDefaultSettings(size);
		},

		setDefaultSettings: function(settings) {
			var w = settings.width;
			var h = settings.height;
			this._$width.val(w);
			this._$height.val(h);
		},

		'{this._$sizeChange} h5trackstart': function() {
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
			this.trigger('setSize', size);
			this.setDefaultSettings(size);
		}
	};

	/**
	 * コントローラ定義を公開.
	 */
	h5.core.expose(saveController);

})();