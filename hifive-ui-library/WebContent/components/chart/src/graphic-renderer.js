/*
 * Copyright (C) 2012-2015 NS Solutions Corporation
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
(function($) {

	var CLIP_PATH_URL_FORMAT = 'url(#{0})';

	var TRANSLATE_FORMAT = 'translate({0},{1})';

	var h5format = h5.u.str.format;

	// -------------------------------------------------------------------------
	// for SVG
	// -------------------------------------------------------------------------

	/**
	 * SVG用描画コントローラ
	 *
	 * @class
	 * @memberOf h5.ui.components.chart
	 * @name SVGRenderer
	 */
	var svgRenderer = {
		/**
		 * SVG用描画コントローラであるか
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @type {Boolean}
		 */
		isSvg: true,

		/**
		 * SVG要素を生成します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {Object} props 属性オブジェクト
		 * @returns {Element} SVG要素
		 */
		createGraphicRootElm: function(props) {
			return this._createSvgElm('svg', props);
		},

		/**
		 * SVG要素を生成します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {Object} props 属性オブジェクト
		 * @returns {Element} SVG要素
		 */
		createGraphicElm: function(name, attrs) {
			return this._createSvgElm(name, attrs);
		},

		/**
		 * g要素を生成します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {Object} attrs 属性オブジェクト
		 * @returns {Element} g要素
		 */
		createGroupElm: function(attrs) {
			return this._createSvgElm('g', attrs);
		},

		/**
		 * g要素を追加します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {Object} attrs 属性オブジェクト
		 */
		appendGroupElm: function(attrs, $elem) {
			return $elem.append(this._createSvgElm('g', attrs));
		},


		/**
		 * translateを設定します
		 *
		 * @param {jQuery} $elem translateを設定するjQuery要素
		 * @param {Number} x x座標
		 * @param {Number} y y座標
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 */
		setTranslate: function($elem, x, y) {
			if (isNaN(x) || isNaN(y)) {
				throw new Error('value is NaN');
			}
			$elem.attr('transform', h5format(TRANSLATE_FORMAT, x, y));
		},

		/**
		 * 指定したタグ名の要素を生成します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {String} name SVG要素名
		 * @returns 指定したSVG要素のオブジェクト
		 */
		_createSvgElm: function(name, attrs) {
			var elem = document.createElementNS('http://www.w3.org/2000/svg', name);
			this.attr(elem, attrs)
			return elem;
		},

		_appendSvgElm: function(name, attrs, $parent) {
			var elem = this._createSvgElm(name, attrs);
			$parent.append(elem);
		},

		/**
		 * line要素を追加します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {Number} x1 x1属性
		 * @param {Number} y1 y1属性
		 * @param {Number} x2 x2属性
		 * @param {Number} y2 y2属性
		 * @param {String} stroke stroke属性
		 * @param {Object} attrs その他の属性を持つオブジェクト
		 * @return {Element} line要素
		 */
		createLineElm: function(x1, y1, x2, y2, stroke, attrs) {
			var attributes = attrs != null ? attrs : {};
			return this._createSvgElm('line', $.extend(attributes, {
				x1: x1,
				y1: y1,
				x2: x2,
				y2: y2,
				stroke: stroke || undefined
			}));
		},

		/**
		 * line要素を追加します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {Number} x1 x1属性
		 * @param {Number} y1 y1属性
		 * @param {Number} x2 x2属性
		 * @param {Number} y2 y2属性
		 * @param {String} stroke stroke属性
		 * @param {Object} attrs その他の属性を持つオブジェクト
		 * @param {jQuery} $parent 追加する親属性
		 */
		appendLineElm: function(x1, y1, x2, y2, stroke, attrs, $parent) {
			var elem = this.createLineElm(x1, y1, x2, y2, stroke, attrs);
			$parent.append(elem);
		},

		createRectElm: function(x, y, width, height, fill, attrs) {
			var attributes = attrs != null ? attrs : {};

			return this._createSvgElm('rect', $.extend(attributes, {
				x: x,
				y: y,
				width: width,
				height: height,
				fill: fill || null
			}));
		},
		/**
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {Number} x x属性
		 * @param {Number} y y属性
		 * @param {Number} width width属性
		 * @param {Number} height height属性
		 * @param {String} fill fill属性
		 * @param {Object} attrs その他の属性を持つオブジェクト
		 * @param {jQuery} $parent 追加する親属性
		 */
		appendRectElm: function(x, y, width, height, fill, attrs, $parent) {
			var elem = this.createRectElm(x, y, width, height, fill, attrs);
			$parent.append(elem);
		},

		/**
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {Number} cx 円の中心のx座標
		 * @param {Number} cy 円の中心のy座標
		 * @param {Number} r 半径
		 * @param {String} fill fill属性
		 * @param {Object} attrs その他の属性を持つオブジェクト
		 * @return {Element} 円要素
		 */
		createCircleElm: function(cx, cy, r, fill, attrs) {
			var attributes = attrs != null ? attrs : {};

			return this._createSvgElm('circle', $.extend(attributes, {
				cx: cx,
				cy: cy,
				r: r,
				fill: fill || 'none'
			}));
		},

		/**
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {Number} cx 円の中心のx座標
		 * @param {Number} cy 円の中心のy座標
		 * @param {Number} r 半径
		 * @param {String} fill fill属性
		 * @param {Object} attrs その他の属性を持つオブジェクト
		 * @param {jQuery} $parent 追加する親属性
		 */
		appendCircleElm: function(cx, cy, r, fill, attrs, $parent) {
			var elem = this.createCircleElm(cx, cy, r, fill, attrs);
			$parent.append(elem);
		},

		/**
		 * text要素を作成します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param str 表示する文字列
		 * @param {Number} x x属性
		 * @param {Number} y y属性
		 * @param {String} fill fill属性
		 * @param {Object} attrs その他の属性を持つオブジェクト
		 * @returns text要素
		 */
		createTextElm: function(str, x, y, fill, attrs) {
			var attributes = attrs != null ? attrs : {};

			var $text = $(this._createSvgElm('text', $.extend(attributes, {
				x: x || 0,
				y: y || 0,
				fill: fill || undefined
			})));
			this._appendTextSpans(str, $text, x || 0);
			return $text[0];
		},

		/**
		 * text要素を追加します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {String} str 表示する文字列
		 * @param {Number} x x属性
		 * @param {Number} y y属性
		 * @param {String} fill fill属性
		 * @param {Object} attrs その他の属性を持つオブジェクト
		 * @param {jQuery} $parent 追加する親属性
		 */
		appendTextElm: function(str, x, y, fill, attrs, $parent) {
			var elem = this.createTextElm(str, x, y, fill, attrs);
			$parent.append(elem);
		},

		/**
		 * text要素の位置を設定します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {Element} elem text要素
		 * @param {Number} x x座標
		 * @param {Number} y y座標
		 */
		setTextPosition: function(elem, x, y, attrs) {
			this.attr(elem, $.extend(attrs, {
				x: x,
				y: y
			}));
			$(elem).find('tspan').each(function() {
				$(this).attr('x', x);
			});
		},

		/**
		 * 指定した要素のテキストを設定します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {String} 設定するテキスト
		 * @param {jQuery} $ele jQuery要素
		 */
		text: function(str, $elm) {
			$elm.empty();
			this._appendTextSpans(str, $elm, $elm.attr('x'));
		},

		_appendTextSpans: function(str, $text, x) {
			var arr = str.split('<br>');
			if (arr.length === 1) {
				$text.text(str);
				return;
			}

			for (var i = 0, len = arr.length; i < len; i++) {
				var $elem = $(this._createSvgElm('tspan', {
					x: x,
					dy: i === 0 ? 0 : 10
				}));
				$elem.text(arr[i]);
				$text.append($elem);
			}
		},

		/**
		 * パス要素を生成します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {String} d パス
		 * @param {Object} attrs 属性
		 * @return {Element} パス要素
		 */
		createPathElm: function(d, attrs) {
			var attributes = attrs != null ? attrs : {};

			return this._createSvgElm('path', $.extend(attributes, {
				d: d
			}));
		},

		/**
		 * パス要素を追加します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {String} d パス
		 * @param {Object} attrs 属性
		 * @param {jQuery} $parent パスを追加する要素
		 */
		appendPathElm: function(d, attrs, $parent) {
			var elem = this.createPathElm(d, attrs);
			$parent.append(elem);
		},

		/**
		 * 要素をclipします
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {jQuery} $elm clip対象の要素
		 * @param {Element} clipElm クリップする形を表す要素
		 * @param {String} id クリップするID
		 * @param {jQuery} $root SVG要素のjQueryオブジェクト
		 */
		clip: function($elm, clipElm, id, $root) {
			var clipPath = this._createSvgElm('clipPath', {
				id: id
			});
			clipPath.appendChild(clipElm);
			var $defs = this._getOrCreateDefElm($root);
			$defs.append(clipPath);
			$elm.css('clip-path', h5format(CLIP_PATH_URL_FORMAT, id));
		},

		/**
		 * 色の勾配を指定するURLを取得します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {String} id 設定するID
		 * @param {Object} attrs 設定する属性
		 * @param {jQuery} $root SVG要素のjQueryオブジェクト
		 * @returns {String} 色の勾配を指定するURL
		 */
		gradient: function(id, attrs, $root) {
			var $defs = this._getOrCreateDefElm($root);
			var $linearGradient = $(this._createSvgElm('linearGradient', {
				id: id,
				x1: attrs.x1,
				y1: attrs.y1,
				x2: attrs.x2,
				y2: attrs.y2
			}));
			$defs.append($linearGradient);
			var stops = attrs.stops || [];
			for (var i = 0, len = stops.length; i < len; i++) {
				$linearGradient.append(this._createSvgElm('stop', {
					offset: stops[i].offset,
					style: 'stop-color:' + stops[i].color + ';'
				}));
			}
			return 'url(#' + id + ')';
		},

		_getOrCreateDefElm: function($root) {
			var $defs = $root.find('defs');
			if ($defs.length === 0) {
				$defs = $(this._createSvgElm('defs'));
				$root.prepend($defs);
			}
			return $defs;
		},

		/**
		 * 要素に属性をセットします
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {Element} elem 属性をセットする要素
		 * @param {Object} attrs 属性とその値
		 */
		attr: function(elem, attrs) {
			for ( var name in attrs) {
				elem.setAttribute(name, attrs[name]);
			}
		},


		/**
		 * styleを設定します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {Element} elem 設定する要素
		 * @param {Object} styles 設定するstyle
		 */
		css: function(elem, styles) {
			for ( var name in styles) {
				elem.style[name] = styles[name];
			}
		},

		/**
		 * 要素の幅を取得します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {Element} elem SVG要素
		 * @returns {Number} 要素の幅
		 */
		getWidthOf: function(elem) {
			if (elem == null) {
				return null;
			}
			return elem.getBBox().width;
		},

		/**
		 * 要素の高さを取得します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param {Element} elem SVG要素
		 * @returns {Number} 要素の高さ
		 */
		getHeightOf: function(elem) {
			if (elem == null) {
				return null;
			}
			return elem.getBBox().height;
		}
	};

	// -------------------------------------------------------------------------
	// for VML
	// -------------------------------------------------------------------------
	/**
	 * VML用描画コントローラ
	 *
	 * @class
	 * @memberOf h5.ui
	 * @name VMLRenderer
	 */
	var vmlRenderer = {
		isSvg: false,

		/**
		 * VMLのルート要素(DIV)を生成します
		 *
		 * @param {Object} props 属性を持つオブジェクト
		 */
		createGraphicRootElm: function(props) {
			var elem = document.createElement('div');
			for ( var name in props) {
				if (name === 'width' || name === 'height') {
					elem.style[name] = props[name];
					continue;
				}
				elem.setAttribute(name, props[name]);
			}
			return elem;
		},

		/**
		 * group要素を生成します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {Object} attrs 属性を持つオブジェクト
		 * @returns
		 */
		createGroupElm: function(attrs) {
			return this._createVmlElm('group', attrs);
		},

		/**
		 * line要素を生成します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {Number} x1 x1属性
		 * @param {Number} y1 y1属性
		 * @param {Number} x2 x2属性
		 * @param {Number} y2 y2属性
		 * @param {String} stroke stroke属性
		 * @param {Object} attrs その他の属性を持つオブジェクト
		 * @returns {Element} line要素
		 */
		createLineElm: function(x1, y1, x2, y2, stroke, attrs) {
			var attributes = attrs != null ? attrs : {};

			return this._createVmlElm('line', $.extend(attributes, {
				from: x1 + ',' + y1,
				to: x2 + ',' + y2,
				strokecolor: stroke
			}));
		},

		/**
		 * line要素を追加します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {Number} x1 x1属性
		 * @param {Number} y1 y1属性
		 * @param {Number} x2 x2属性
		 * @param {Number} y2 y2属性
		 * @param {String} stroke stroke属性
		 * @param {Object} attrs その他の属性を持つオブジェクト
		 */
		appendLineElm: function(x1, y1, x2, y2, stroke, attrs, $parent) {
			$parent[0].appendChild(this.createLineElm(x1, y1, x2, y2, stroke, attrs));
		},

		/**
		 * rect要素を生成します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {Number} x x属性
		 * @param {Number} y y属性
		 * @param {Number} width width属性
		 * @param {Number} height height属性
		 * @param {String} fill fill属性
		 * @param {Object} attrs その他の属性を持つオブジェクト
		 * @returns {Element} rect要素
		 */
		createRectElm: function(x, y, width, height, fill, attrs) {
			var attributes = attrs != null ? attrs : {};

			var elem = this._createVmlElm('rect', $.extend(attributes, {
				fillcolor: fill || null,
				strokecolor: '#fff'
			}));

			return this.css(elem, {
				width: width,
				height: height,
				left: x,
				top: y,
				position: 'absolute'
			});
		},

		/**
		 * rect要素を生成します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {Number} x x属性
		 * @param {Number} y y属性
		 * @param {Number} width width属性
		 * @param {Number} height height属性
		 * @param {String} fill fill属性
		 * @param {Object} attrs その他の属性を持つオブジェクト
		 * @returns {Element} rect要素
		 */
		appendRectElm: function(x, y, width, height, fill, attrs, $parent) {
			$parent[0].appendChild(this.createRectElm(x, y, width, height, fill, attrs));
		},

		/**
		 * shape要素を生成します
		 *
		 * @param {Object} attrs 属性を持つオブジェクト
		 * @returns shape要素
		 */
		createShapeElm: function(attrs) {
			return this._createVmlElm('shape', attrs);
		},

		/**
		 * テキスト要素を生成します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {String} str 表示する文字列
		 * @param {Number} x x属性
		 * @param {Number} y y属性
		 * @param {String} fill fill属性
		 * @param {Object} attrs その他の属性を持つオブジェクト
		 * @returns テキスト要素
		 */
		createTextElm: function(str, x, y, fill, attrs) {
			if (attrs == null) {
				attrs = {};
			}

			var fontSize = attrs['font-size'];
			if (fontSize) {
				delete attrs['font-size'];
			}

			var text = this._createVmlElm('textbox', attrs);

			this.css(text, {
				top: y || 0,
				position: 'absolute',
				fontSize: fontSize || null
			});
			text.innerHTML = str;
			// text-anchorの値に応じて位置を変更
			if (x != null) {
				this._setTextXPosition(text, attrs['text-anchor'], x);
			}

			return text;
		},

		/**
		 * テキスト要素を追加します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {String} str 表示する文字列
		 * @param {Number} x x属性
		 * @param {Number} y y属性
		 * @param {String} fill fill属性
		 * @param {Object} attrs その他の属性を持つオブジェクト
		 * @param {jQuery} $parent 追加する親属性
		 */
		appendTextElm: function(str, x, y, fill, attrs, $parent) {
			var text = this.createTextElm(str, x, y, fill, attrs);
			$parent[0].appendChild(text);
			// text-anchorの値に応じて位置を変更
			if (x != null) {
				this._setTextXPosition(text, attrs['text-anchor'], x);
			}

		},

		/**
		 * 指定した要素のテキストを設定します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {String} 設定するテキスト
		 * @param {jQuery} $ele jQuery要素
		 */
		text: function(str, $elm) {
			var textAnchor = $elm.attr('text-anchor');
			// 最初に指定した位置を取得
			var x = this._getTextPosition($elm, textAnchor);
			$elm[0].innerHTML = str;
			// textAnchorの値によって位置を設定
			this._setTextXPosition($elm[0], textAnchor, x);
		},

		/**
		 * text要素の位置を設定します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {Element} elem text要素
		 * @param {Number} x x座標
		 * @param {Number} y y座標
		 * @parms attrs 属性
		 */
		setTextPosition: function(elem, x, y, attrs) {
			this.css(elem, {
				top: y
			});
			var textAnchor = attrs ? attrs['text-anchor'] : null;
			this._setTextXPosition(elem, textAnchor, x);
		},

		_getTextPosition: function($text, textAnchor) {
			var left = parseInt($text.css('left'));
			if (textAnchor == null) {
				return left;
			}

			switch (textAnchor) {
			case 'strat':
				return left;
				break;
			case 'middle':
				return left + $text[0].clientWidth / 2;
				break;
			case 'end':
				return -parseInt($text.css('right'));
			default:
				return left;
			}
		},

		_setTextXPosition: function(text, textAnchor, x) {
			if (textAnchor == null) {
				this.css(text, {
					left: x
				});
				return;
			}

			switch (textAnchor) {
			case 'strat':
				this.css(text, {
					left: x
				});
				break;
			case 'middle':
				var width = text.clientWidth;
				this.css(text, {
					left: x - width / 2
				});
				break;
			case 'end':
				this.css(text, {
					right: -x
				});
				break;
			default:
				this.css(text, {
					left: x
				});
			}
		},


		/**
		 * fill要素を生成し、指定された要素に追加します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {Element} elem
		 * @param {Object} props
		 */
		fill: function(elem, props) {
			var fill = this._createVmlElm('fill');
			elem.appendChild(fill);
			$.extend(fill, props);
		},

		/**
		 * stroke要素を指定された要素に追加します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {Element} elem
		 * @param {Object} props
		 */
		stroke: function(elem, props) {
			var stroke = this._createVmlElm('stroke');
			elem.appendChild(stroke);
			$.extend(stroke, props);
		},

		/**
		 * 色の勾配を指定するURLを取得します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {String} id 設定するID
		 * @param {Object} attrs 設定する属性
		 * @param {jQuery} $root SVG要素のjQueryオブジェクト
		 * @returns {String} 色の勾配を指定するURL
		 */
		gradient: function(id, attrs) {
			var color = null;
			var color2 = null;
			var colors = [];

			var stops = attrs.stops;
			for (var i = 0, len = stops.length; i < len; i++) {
				var offset;
				// 百分率(%なし)に直した値に変更
				if (h5.u.str.endsWith(stops[i].offset, '%')) {
					// %はとる
					offset = parseInt(stops[i].offset.slice(0, -1), 10);
				} else {
					offset = stops[i].offset * 100;
				}

				if (isNaN(offset)) {
					// 不正な値を指定した時
					// TODO: 例外の出し方は全体的に見直して一括で修正する
					throw new Error('offsetに不正な値を指定しています: 値 = ' + stops[i].offset);
				}

				if (offset <= 0) {
					color = stops[i].color;
				} else if (offset >= 100) {
					color2 = stops[i].color;
				} else {
					colors.push(offset + '% ' + stops[i].color);
				}
			}
			return {
				type: 'gradient',
				color: color,
				color2: color2,
				colors: colors.join(', ')
			};
		},

		/**
		 * 指定されたタグ名の要素を生成します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {String} name
		 * @param {Object} attrs
		 * @returns {DOM} DOM要素
		 */
		_createVmlElm: function(name, attrs) {
			var elem = document.createElement('v:' + name);
			this.attr(elem, attrs);
			return elem;
		},

		/**
		 * ルート要素を生成し、指定された要素に追加します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {String} name
		 * @param {Object} attrs
		 * @param parent
		 * @returns {DOM} ルート要素
		 */
		_appendVmlElm: function(name, attrs, parent) {
			var elem = this._createVmlElm(name, attrs);
			parent.appendChild(elem);
			return elem;
		},

		/**
		 * translateを設定します
		 *
		 * @param {jQuery} $elem translateを設定するjQuery要素
		 * @param {Number} x x座標
		 * @param {Number} y y座標
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 */
		setTranslate: function($elem, x, y) {
			$elem.css({
				left: x,
				top: y
			});
		},

		/**
		 * 要素に属性をセットします
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {Element} elem 属性をセットする要素
		 * @param {Object} attrs 属性とその値
		 */
		attr: function(elem, attrs) {
			for ( var name in attrs) {
				if (name === 'class') {
					// IE7のsetAttributeはclassが設定できないバグがあるため、classNameプロパティに設定する
					elem.className = attrs[name];
				} else {
					elem.setAttribute(name, attrs[name]);
				}
			}
		},

		/**
		 * styleを設定します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {Element} elem 設定する要素
		 * @param {Object} styles 設定するstyle
		 */
		css: function(elem, styles) {
			for ( var name in styles) {
				elem.style[name] = styles[name];
			}
			return elem;
		},

		/**
		 * 要素の幅を取得します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {Element} elem VML要素
		 * @returns {Number} 要素の幅
		 */
		getWidthOf: function(elem) {
			return this._getWidthOrHeightOf(elem, 'Width');
		},

		/**
		 * 要素の高さを取得します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {Element} elem VML要素
		 * @returns {Number} 要素の高さ
		 */
		getHeightOf: function(elem) {
			return this._getWidthOrHeightOf(elem, 'Height');
		},

		/**
		 * 要素の高さまたは幅を取得します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param {Element} elem VML要素
		 * @param type {String} 'Height' or 'Width'
		 * @returns {Number} 要素の高さ
		 */
		_getWidthOrHeightOf: function(elem, type) {
			if (elem == null) {
				return null;
			}

			return elem['offset' + type];
		}
	};

	/**
	 * 図形描画レンダラ―
	 *
	 * @class
	 * @memberOf h5.ui.components.chart
	 * @name GraphicRenderer
	 */
	var graphicRenderer = {

		/**
		 * 塗りつぶしのためのオブジェクトを取得します
		 *
		 * @param {Object | String} 色定義
		 * @param {Element} 図形領域のルート要素
		 * @returns {Object | String} 塗りつぶしプロパティオブジェクトまたは色の指定文字列
		 * @memberOf h5.ui.components.chart.GraphicRenderer
		 */
		getFill: function(color, rootElement) {
			if (!color) {
				return null;
			}

			if (typeof color === 'object') {
				// グラデーションの定義オブジェクト
				return this.gradient(color.id, color, $(rootElement));
			}
			if (typeof color === 'string') {
				return color;
			}
			// TODO: エラー
			return null;
		}
	};

	if (!document.createElementNS
			|| !document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect) {
		graphicRenderer = $.extend(vmlRenderer, graphicRenderer);
		document.namespaces.add("v", "urn:schemas-microsoft-com:vml");
	} else {
		graphicRenderer = $.extend(svgRenderer, graphicRenderer);
	}

	h5.u.obj.expose('h5.ui.components.chart', {
		SVGRenderer: svgRenderer,
		VMLRenderer: vmlRenderer,
		GraphicRenderer: graphicRenderer
	});
})(jQuery);
