/*
 * Copyright (C) 2015 NS Solutions Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
(function() {
	function getAvrage(a, b, r) {
		if (a === b) {
			return a;
		}
		return a * (1 - r) + b * r;
	}

	function ColorGraduate(graduateColors) {
		var graduates = [];
		// 色をRGBに分けて数値化する
		for (var i = 0, l = graduateColors.length; i < l; i++) {
			var grad = graduateColors[i];
			var color = grad.color;
			graduates.push({
				r: color >> 16,
				g: (color >> 8) % 256,
				b: color % 256,
				alpha: grad.alpha == null ? 1 : grad.alpha,
				color: color,
				position: grad.position
			});
		}
		graduates.sort(function(a, b) {
			return a.position - b.position;
		});
		this._graduateColors = graduates;
	}
	$.extend(ColorGraduate.prototype, {
		getColorAtPosition: function(pos) {
			var graduates = this._getGraduateAtPosition(pos);
			if (graduates.length === 1) {
				// 定義した位置がある場合
				return graduates[0].color;
			}
			// 定義した位置が無い場合は周りから計算
			var start = graduates[0];
			var end = graduates[1];
			var startPosition = start.position;
			var endPosition = end.position;
			var ratio = (pos - startPosition) / (endPosition - startPosition);
			var r = parseInt(getAvrage(start.r, end.r, ratio));
			var g = parseInt(getAvrage(start.g, end.g, ratio));
			var b = parseInt(getAvrage(start.b, end.b, ratio));

			return (r << 16) + (g << 8) + b;
		},
		getAlphaAtPosition: function(pos) {
			var graduates = this._getGraduateAtPosition(pos);
			if (graduates.length === 1) {
				// 定義した位置がある場合
				return graduates[0].alpha;
			}
			// 定義した位置が無い場合は周りから計算
			var start = graduates[0];
			var end = graduates[1];
			var startPosition = start.position;
			var endPosition = end.position;
			var ratio = (pos - startPosition) / (endPosition - startPosition);

			return start.alpha * (1 - ratio) + end.alpha * ratio;
		},
		_getGraduateAtPosition: function(pos) {
			var start, end;
			for (var i = 0, l = this._graduateColors.length; i < l; i++) {
				if (this._graduateColors[i].position < pos) {
					start = this._graduateColors[i];
				} else {
					end = this._graduateColors[i];
					break;
				}
			}
			if (end.position === pos) {
				return [end];
			}
			return [start, end];
		}
	});

	var colorGraduateLogic = {
		__name: 'h5.ui.components.colorGraduate.ColorGraduate',
		createColorGraduate: function(graduateColors) {
			return new ColorGraduate(graduateColors);
		}
	};
	h5.core.expose(colorGraduateLogic);
})();