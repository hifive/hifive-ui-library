/*
 * Copyright (C) 2012-2014 NS Solutions Corporation
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
		 * @returns {Boolean}
		 */
		isSvg: true,

		/**
		 * SVG要素を生成します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param props
		 * @returns
		 */
		createGraphicRootElm: function(props) {
			return this._createSvgElm('svg', props);
		},

		createGraphicElm: function(name, attrs) {
			return this._createSvgElm(name, attrs);
		},

		/**
		 * SVG要素を生成します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param attrs
		 * @returns
		 */
		createGroupElm: function(attrs) {
			return this._createSvgElm('g', attrs);
		},

		appendGroupElm: function(attrs, $elem) {
			return $elem.append(this._createSvgElm('g', attrs));
		},


		/**
		 * @param $elem translateを設定するjQuery要素
		 * @param x x座標
		 * @param y y座標
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
		 * @param name SVG要素名
		 * @returns 指定したSVG要素のオブジェクト
		 */
		_createSvgElm: function(name, attrs) {
			var elem = document.createElementNS('http://www.w3.org/2000/svg', name);
			for ( var name in attrs) {
				elem.setAttribute(name, attrs[name]);
			}
			return elem;
		},

		_appendSvgElm: function(name, attrs, $parent) {
			var elem = this._createSvgElm(name, attrs);
			$parent.append(elem);
		},

		/**
		 * LINE要素を追加します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param x1 x1属性
		 * @param y1 y1属性
		 * @param x2 x2属性
		 * @param y2 y2属性
		 * @param stroke stroke属性
		 * @param attrs その他の属性を持つオブジェクト
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
		 * RECT要素を追加します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param x x属性
		 * @param y y属性
		 * @param width width属性
		 * @param height height属性
		 * @param fill fill属性
		 * @param attrs その他の属性を持つオブジェクト
		 * @param $parent 追加する親属性
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
		 * @param x x属性
		 * @param y y属性
		 * @param width width属性
		 * @param height height属性
		 * @param fill fill属性
		 * @param attrs その他の属性を持つオブジェクト
		 * @param $parent 追加する親属性
		 */
		appendRectElm: function(x, y, width, height, fill, attrs, $parent) {
			var elem = this.createRectElm(x, y, width, height, fill, attrs);
			$parent.append(elem);
		},

		/**
		 * TEXT要素を追加します
		 *
		 * @memberOf h5.ui.components.chart.SVGRenderer
		 * @param str 表示する文字列
		 * @param x x属性
		 * @param y y属性
		 * @param fill fill属性
		 * @param attrs その他の属性を持つオブジェクト
		 * @param $parent 追加する親属性
		 */
		appendTextElm: function(str, x, y, fill, attrs, $parent) {
			var attributes = attrs != null ? attrs : {};

			var $text = $(this._createSvgElm('text', $.extend(attributes, {
				x: x,
				y: y,
				fill: fill || undefined
			})));
			this._appendTextSpans(str, $text, x);
			$parent.append($text);
		},

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

		createPathElm: function(d, attrs) {
			var attributes = attrs != null ? attrs : {};

			return this._createSvgElm('path', $.extend(attributes, {
				d: d
			}));
		},

		appendPathElm: function(d, attrs, $parent) {
			var elem = this.createPathElm(d, attrs);
			$parent.append(elem);
		},

		clip: function($elm, clipElm, id, $root) {
			var clipPath = this._createSvgElm('clipPath', {
				id: id
			});
			clipPath.appendChild(clipElm);
			var $defs = this._getOrCreateDefElm($root);
			$defs.append(clipPath);
			$elm.css('clip-path', h5format(CLIP_PATH_URL_FORMAT, id))
		},

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

		css: function(elem, styles) {
			for ( var name in styles) {
				elem.style[name] = styles[name];
			}
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
		 * @param props
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
		 * GROUP要素を生成します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param attrs
		 * @returns
		 */
		createGroupElm: function(attrs) {
			return this._createVmlElm('group', attrs);
		},

		createLineElm: function(x1, y1, x2, y2, stroke, attrs) {
			var attributes = attrs != null ? attrs : {};

			return this._createVmlElm('line', $.extend(attributes, {
				from: x1 + ',' + y1,
				to: x2 + ',' + y2,
				strokecolor: stroke
			}));
		},

		/**
		 * LINE要素を追加する
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param x1 x1属性
		 * @param y1 y1属性
		 * @param x2 x2属性
		 * @param y2 y2属性
		 * @param stroke stroke属性
		 * @param attrs その他の属性を持つオブジェクト
		 */
		appendLineElm: function(x1, y1, x2, y2, stroke, attrs, $parent) {
			$parent[0].appendChild(this.createLineElm(x1, y1, x2, y2, stroke, attrs));
		},

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

		appendRectElm: function(x, y, width, height, fill, attrs, $parent) {
			$parent[0].appendChild(this.createRectElm(x, y, width, height, fill, attrs));
		},

		createShapeElm: function(attrs) {
			return this._createVmlElm('shape', attrs);
		},

		/**
		 * 追加する
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param str 表示する文字列
		 * @param x x属性
		 * @param y y属性
		 * @param fill fill属性
		 * @param attrs その他の属性を持つオブジェクト
		 * @param $parent 追加する親属性
		 */
		appendTextElm: function(str, x, y, fill, attrs, $parent) {
			var fontSize = attrs['font-size'];
			if (fontSize) {
				delete attrs['font-size'];
			}

			var text = this._createVmlElm('textbox', attrs);

			this.css(text, {
				left: x,
				top: y,
				position: 'absolute',
				fontSize: fontSize || null
			});
			text.innerHTML = str;

			$parent[0].appendChild(text);
		},

		text: function(str, $elm) {
			$elm[0].innerHTML = str;
		},

		/**
		 * FILL要素を生成し、指定された要素に追加します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param elem
		 * @param props
		 * @returns
		 */
		fill: function(elem, props) {
			var fill = this._createVmlElm('fill');
			elem.appendChild(fill);
			$.extend(fill, props);
		},

		/**
		 * STROKE要 指定された要素に追加します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param elem
		 * @param props
		 * @returns
		 */
		stroke: function(elem, props) {
			var stroke = this._createVmlElm('stroke');
			elem.appendChild(stroke);
			$.extend(stroke, props);
		},

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
		 * @param name
		 * @param attrs
		 * @returns {DOM} DOM要素
		 */
		_createVmlElm: function(name, attrs) {
			var elem = document.createElement('v:' + name);
			for ( var name in attrs) {
				if (name === 'class') {
					// IE7のsetAttributeはclassが設定できないバグがあるため、classNameプロパティに設定する
					elem.className = attrs[name];
				} else {
					elem.setAttribute(name, attrs[name]);
				}
			}
			return elem;
		},

		/**
		 * ルート要素を生成し、指定された要素に追加します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param name
		 * @param attrs
		 * @param parent
		 * @returns {DOM} ルート要素
		 */
		_appendVmlElm: function(name, attrs, parent) {
			var elem = this._createVmlElm(name, attrs);
			parent.appendChild(elem);
			return elem;
		},

		/**
		 * LINE要素の生成に必要な情報を持つDataItemまたはObservableItemからLINE要素を生成し、 指定されたGROUP要素に追加します
		 *
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 * @param lines {DataItem|ObservableItem} LINE要素の生成に必要な情報を持つDataItemまたはObservableItemオブジェクト
		 * @param g {DOM} GROUP要素
		 */
		appendLines: function(lines, g) {
			for (var i = 0, len = lines.length; i < len; i++) {
				this._appendLineElm(lines[i].get('fromX'), lines[i].get('fromY'), lines[i]
						.get('toX'), lines[i].get('toY'), '#000', {
					id: h5format(LINE_ELM_ID_FORMAT, lines[i].get('id'))
				}, g);
			}
		},

		/**
		 * LEFTプロパティに値を設定します
		 *
		 * @param $elem translateを設定するjQuery要素
		 * @param x x座標
		 * @memberOf h5.ui.components.chart.VMLRenderer
		 */
		setTranslate: function($elem, x) {
			$elem.css({
				left: x
			});
		},

		css: function(elem, styles) {
			for ( var name in styles) {
				elem.style[name] = styles[name];
			}
			return elem;
		}
	};

	var graphicRenderer;
	// if (h5.env.ua.isIE && h5.env.ua.browserVersion <= 8) {
	if (!document.createElementNS
			|| !document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect) {
		graphicRenderer = vmlRenderer;
		document.namespaces.add("v", "urn:schemas-microsoft-com:vml");
	} else {
		graphicRenderer = svgRenderer;
	}

	h5.u.obj.expose('h5.ui.components.chart', {
		SVGRenderer: svgRenderer,
		VMLRenderer: vmlRenderer,
		GraphicRenderer: graphicRenderer
	});
})(jQuery);