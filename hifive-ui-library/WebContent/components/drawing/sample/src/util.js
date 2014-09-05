(function() {
	/**
	 * 日付のフォーマット
	 */
	function dateFormat(date) {
		/**
		 * 数値を2桁にフォーマット
		 *
		 * @private
		 */
		function formatNum(n) {
			return n = n < 10 ? '0' + n : n;
		}
		var y = date.getFullYear();
		var m = formatNum(date.getMonth() + 1);
		var d = formatNum(date.getDate());
		var hour = formatNum(date.getHours());
		var min = formatNum(date.getMinutes());
		var sec = formatNum(date.getSeconds());
		return h5.u.str.format('{0}/{1}/{2} {3}:{4}.{5}', y, m, d, hour, min, sec);
	}

	h5.u.obj.expose('sample.util', {
		dateFormat: dateFormat
	})
})();