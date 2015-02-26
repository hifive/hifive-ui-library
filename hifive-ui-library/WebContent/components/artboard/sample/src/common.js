/**
 * const
 *
 * @namespace
 * @name sample.consts
 */
(function() {
	h5.u.obj.expose('sample.consts', {
		DATA_DRAWING_IMAGE_ID: 'drawing-image-id'
	});
})();

/**
 * util
 *
 * @namespace
 * @name sample.util
 */
(function() {
	/**
	 * 日付のフォーマット
	 *
	 * @param {Date}
	 * @returns {String} yy/mm/dd hh:mm.ss 形式の日付文字列
	 */
	function dateFormat(date) {
		/**
		 * 数値を2桁にフォーマット
		 *
		 * @private
		 * @param {Integer} n
		 * @returns {String}
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

	h5.u.obj.expose('sample.util', {
		dateFormat: dateFormat,
		rgbToRgba: rgbToRgba
	});
})();