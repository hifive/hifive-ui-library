// ---- Logic ---- //
(function($) {

	//サンプルデータ取得URL
	var DATA_URL = '/api/sample3';

	var gridSampleLogic = {

		/**
		 * ロジック名
		 *
		 * @memberOf datagrid.sample.GridLogic
		 * @type string
		 */
		__name: 'datagrid.sample.GridLogic',

		/**
		 * データ取得
		 *
		 * @memberOf datagrid.sample.GridLogic
		 * @param
		 */
		loadData: function(start, end) {
			var def = this.deferred();
			h5.ajax(DATA_URL, {
				dataType: 'json',
				data: {
					start: start,
					end: end
				}
			}).done(function(data) {
				def.resolve(data.list);
			});
			return def.promise();
		}
	};

	h5.core.expose(gridSampleLogic);

})(jQuery);