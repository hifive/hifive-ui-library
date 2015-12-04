/*
 * Copyright (C) 2013-2014 NS Solutions Corporation
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
 * hifive
 */

/*jshint browser: true, jquery: true */
/*global h5 */


// ---- ScrollBar ---- //
(function($) {
	'use strict';

	var FIRST_WIDTH = 25;
	var OUTER_DIV_CLASS_SUFFIX = '-scroll-bar-outer';
	var INNER_DIV_CLASS_SUFFIX = '-scroll-bar-inner';
	var SCROLL_EVENT_NAME = 'h5scroll';

	// ネイティブなスクロールバーの幅を計算
	var scrollBarWidth = 17;
	$(function() {
		var $body = $('body');

		var $outer = $('<div></div>');
		$outer.css({
			visibility: 'hidden',
			height: FIRST_WIDTH,
			width: FIRST_WIDTH,
			overflow: 'scroll',
			position: 'absolute',
			top: -100
		}).appendTo($body);

		$('<div></div>').css({
			height: FIRST_WIDTH + 1,
			width: 1
		}).appendTo($outer);

		var extWidth = $outer[0].clientWidth;
		scrollBarWidth = FIRST_WIDTH - extWidth;

		$outer.remove();
	});

	/**
	 * 縦のスクロールバーを描画するコントローラ
	 * 
	 * @class h5.ui.components.virtualScroll.VerticalScrollBarController
	 */
	var verticalScrollBarController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.virtualScroll.VerticalScrollBarController
		 */
		__name: 'h5.ui.components.virtualScroll.VerticalScrollBarController',


		// --- Property --- //

		/** スクロール領域全体のサイズ */
		_scrollSize: 0,

		/** 無視するスクロールポジションのリスト */
		_ignoreScrollList: null,

		/** setTimeout() の返り値であるタイマーID */
		_timer: null,

		/** 現在のスクロールポジション */
		_pos: 0,


		// --- Private Method --- //

		/**
		 * rootElement のサイズを取り直してバーを描画するか再計算する
		 */
		_resizeScrollSize: function() {

			var $innerDiv = this.$find('.vertical' + INNER_DIV_CLASS_SUFFIX);

			$innerDiv.css({
				height: this._scrollSize
			});

			var $root = $(this.barRootElement);
			var barSize = $root.height();
			var visibility = (this._scrollSize <= barSize) ? 'hidden' : 'visible';

			$root.css({
				visibility: visibility
			});
		},


		// --- Life Cycle Method --- //

		__construct: function() {
			this._ignoreScrollList = [];
		},

		__init: function() {
			if (!this.barRootElement) {
				this.barRootElement = this.rootElement;
			}

			var $root = $(this.barRootElement);

			var rootPosition = $root.css('position');

			if (rootPosition === 'static') {
				rootPosition = 'relative';
			}

			$root.css({
				overflow: 'hidden',
				width: FIRST_WIDTH,
				visibility: 'hidden',
				display: 'block',
				position: rootPosition
			});


			var $outerDiv = $('<div></div>').addClass('vertical' + OUTER_DIV_CLASS_SUFFIX).css({
				'overflow-x': 'hidden',
				'overflow-y': 'scroll',
				height: '100%',
				width: FIRST_WIDTH,
				position: 'absolute',
				right: 0
			});

			var $innerDiv = $('<div></div>').addClass('vertical' + INNER_DIV_CLASS_SUFFIX).css({
				width: '100%'
			});

			$root.append($outerDiv);
			$outerDiv.append($innerDiv);

			$root.css({
				width: scrollBarWidth
			});

			this._resizeScrollSize();
		},

		__unbind: function() {
			clearTimeout(this._timer);
			$(this.barRootElement).empty();
			this.barRootElement = null;
		},


		// --- Event Handler --- //

		/**
		 * ブラウザのスクロールイベントが発生したら h5scroll イベントを発生させる。
		 */
		'.vertical-scroll-bar-outer [scroll]': function(context, $el) {
			if (this._timer) {
				clearTimeout(this._timer);
			}

			var prevPos = this._pos;
			var pos = $el.scrollTop();



			if (40 < Math.abs(pos - prevPos)) {
				var ignoreIndex = $.inArray(pos, this._ignoreScrollList);
				if (ignoreIndex === -1) {
					this.trigger(SCROLL_EVENT_NAME, {
						verticalScroll: {
							type: 'pixel',
							diff: pos - prevPos
						}
					});
				} else {
					this._ignoreScrollList.splice(ignoreIndex, 1);
				}

				this._pos = pos;
				return;
			}

			// IE のスムーススクロール対応

			this._timer = setTimeout(this.own(function() {
				var prevPos = this._pos;
				var pos = $el.scrollTop();

				var ignoreIndex = $.inArray(pos, this._ignoreScrollList);
				if (ignoreIndex === -1) {
					this.trigger(SCROLL_EVENT_NAME, {
						verticalScroll: {
							type: 'pixel',
							diff: pos - prevPos
						}
					});
				} else {
					this._ignoreScrollList.splice(ignoreIndex, 1);
				}

				this._pos = pos;
			}), 50);
		},

		/**
		 * キーが押下されたときのデフォルトの挙動をキャンセルする。
		 */
		'{rootElement} keydown': function(context) {
			if (context.event.target !== this.barRootElement) {
				return;
			}

			var event = context.event;
			var keycode = event.which;

			if (keycode === 38) {
				// 上矢印キー
				event.preventDefault();
			} else if (keycode === 40) {
				// 下矢印キー
				event.preventDefault();
			}
		},


		// --- Public Method --- //

		/**
		 * スクロール領域全体のサイズをセットする。
		 * 
		 * @param {number} size スクロール領域全体のサイズ
		 */
		setScrollSize: function(size) {

			this._scrollSize = size;

			if (this.isInit) {
				this._resizeScrollSize();
			}
		},

		/**
		 * 実際のスクロールバーのサイズをセットする。
		 * 
		 * @param {number} size スクロールバー自体のサイズ
		 */
		setBarSize: function(size) {

			$(this.barRootElement).css({
				height: size
			});

			if (this.isInit) {
				this._resizeScrollSize();
			}
		},

		/**
		 * スクロール領域全体のサイズを返す。
		 * 
		 * @returns {number} スクロール領域全体のサイズ
		 */
		getScrollSize: function() {
			return this._scrollSize;
		},

		/**
		 * スクロールのポジションをセットする。
		 * 
		 * @param position スクロールポジション
		 */
		setScrollPosition: function(position) {
			this._pos = position;

			var $outer = this.$find('.vertical' + OUTER_DIV_CLASS_SUFFIX);

			if (position === $outer.scrollTop()) {
				return;
			}

			this._ignoreScrollList.push(position);
			$outer.scrollTop(position);
		}
	};


	/**
	 * 横のスクロールバーを描画するコントローラ
	 * 
	 * @class h5.ui.components.virtualScroll.HorizontalScrollBarController
	 */
	var horizontalScrollBarController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.virtualScroll.HorizontalScrollBarController
		 */
		__name: 'h5.ui.components.virtualScroll.HorizontalScrollBarController',


		// --- Property --- //

		/** スクロール領域全体のサイズ */
		_scrollSize: 0,

		/** 無視するスクロールポジションのリスト */
		_ignoreScrollList: null,

		/** setTimeout() の返り値であるタイマーID */
		_timer: null,

		/** 現在のスクロールポジション */
		_pos: 0,

		// --- Private Method --- //

		/**
		 * rootElement のサイズを取り直してバーを描画するか再計算する
		 */
		_resizeScrollSize: function() {

			var $innerDiv = this.$find('.horizontal' + INNER_DIV_CLASS_SUFFIX);

			$innerDiv.css({
				width: this._scrollSize
			});

			var $root = $(this.barRootElement);
			var barSize = $root.width();
			var visibility = (this._scrollSize <= barSize) ? 'hidden' : 'visible';

			$root.css({
				visibility: visibility
			});
		},


		// --- Life Cycle Method --- //

		__construct: function() {
			this._ignoreScrollList = [];
		},

		__init: function() {
			if (!this.barRootElement) {
				this.barRootElement = this.rootElement;
			}

			var $root = $(this.barRootElement);

			var rootPosition = $root.css('position');

			if (rootPosition === 'static') {
				rootPosition = 'relative';
			}

			$root.css({
				overflow: 'hidden',
				height: FIRST_WIDTH,
				visibility: 'hidden',
				display: 'block',
				position: rootPosition
			});

			var $outerDiv = $('<div></div>').addClass('horizontal' + OUTER_DIV_CLASS_SUFFIX).css({
				'overflow-x': 'scroll',
				'overflow-y': 'hidden',
				width: '100%',
				height: FIRST_WIDTH,
				position: 'absolute',
				bottom: 0
			});

			var $innerDiv = $('<div></div>').addClass('horizontal' + INNER_DIV_CLASS_SUFFIX).css({
				height: '100%'
			});

			$root.append($outerDiv);
			$outerDiv.append($innerDiv);

			$root.css({
				height: scrollBarWidth
			});

			this._resizeScrollSize();
		},

		__unbind: function() {
			clearTimeout(this._timer);
			$(this.barRootElement).empty();
			this.barRootElement = null;
		},


		// --- Event Handler --- //

		/**
		 * ブラウザのスクロールイベントが発生したら h5scroll イベントを発生させる。
		 */
		'.horizontal-scroll-bar-outer [scroll]': function(context, $el) {
			if (this._timer) {
				clearTimeout(this._timer);
			}

			var prevPos = this._pos;
			var pos = $el.scrollLeft();

			if (40 < Math.abs(pos - prevPos)) {
				var ignoreIndex = $.inArray(pos, this._ignoreScrollList);
				if (ignoreIndex === -1) {
					this.trigger(SCROLL_EVENT_NAME, {
						horizontalScroll: {
							type: 'pixel',
							diff: pos - prevPos
						}
					});
				} else {
					this._ignoreScrollList.splice(ignoreIndex, 1);
				}


				this._pos = pos;
				return;
			}

			if (this._ignoreScrollEvent) {
				this._ignoreScrollEvent = false;
			}

			// IE のスムーススクロール対応
			this._timer = setTimeout(this.own(function() {
				var prevPos = this._pos;
				var pos = $el.scrollLeft();

				var ignoreIndex = $.inArray(pos, this._ignoreScrollList);
				if (ignoreIndex === -1) {
					this.trigger(SCROLL_EVENT_NAME, {
						horizontalScroll: {
							type: 'pixel',
							diff: pos - prevPos
						}
					});
				} else {
					this._ignoreScrollList.splice(ignoreIndex, 1);
				}

				this._pos = pos;
			}), 50);
		},

		/**
		 * キーが押下されたときのデフォルトの挙動をキャンセルする。
		 */
		'{rootElement} keydown': function(context) {
			if (context.event.target !== this.barRootElement) {
				return;
			}

			var event = context.event;
			var keycode = event.which;

			if (keycode === 37) {
				// 左矢印キー
				event.preventDefault();
			} else if (keycode === 39) {
				// 右矢印キー
				event.preventDefault();
			}
		},


		// --- Public Method --- //

		/**
		 * スクロール領域全体のサイズをセットする。
		 * 
		 * @param {number} size スクロール領域全体のサイズ
		 */
		setScrollSize: function(size) {

			this._scrollSize = size;

			if (this.isInit) {
				this._resizeScrollSize();
			}
		},

		/**
		 * スクロール領域全体のサイズを返す。
		 * 
		 * @returns {number} スクロール領域全体のサイズ
		 */
		getScrollSize: function() {
			return this._scrollSize;
		},

		/**
		 * 実際のスクロールバーのサイズをセットする。
		 * 
		 * @param {number} size スクロールバー自体のサイズ
		 */
		setBarSize: function(size) {

			$(this.rootElement).css({
				width: size
			});

			if (this.isInit) {
				this._resizeScrollSize();
			}
		},

		/**
		 * スクロールのポジションをセットする。
		 * 
		 * @param position スクロールポジション
		 */
		setScrollPosition: function(position) {
			this._pos = position;

			var $outer = this.$find('.horizontal' + OUTER_DIV_CLASS_SUFFIX);
			if (position === $outer.scrollLeft()) {
				return;
			}

			this._ignoreScrollList.push(position);
			$outer.scrollLeft(position);
		}

	};

	h5.core.expose(verticalScrollBarController);
	h5.core.expose(horizontalScrollBarController);


	h5.u.obj.expose('h5.ui.components.virtualScroll', {

		/**
		 * ブラウザごとに異なるスクロールバーの幅を計算して返す。
		 * 
		 * @returns {number} スクロールバーの幅
		 */
		getScrollBarWidth: function() {
			return scrollBarWidth;
		}
	});

})(jQuery);


// ---- ScrollBox ---- //

(function($) {
	'use strict';

	var RENDER_TARGET_CLASS = '-scroll-box-render-target';
	var LOADING_CLASS = '-scroll-box-loading';

	var DEFAULT_LOADING_TEXT = 'Loading...';


	/**
	 * スタイルシート適用後のエレメントの高さを取得する。 ブラウザによって取得方法が異なるため関数として切り出している。
	 * 
	 * @param {Element} element 高さを取得したいエレメント
	 * @returns {number} スタイルシート適用後のエレメントの高さ
	 */
	var getComputedSize = function(element) {
		var sizeStyle;
		if (document.defaultView != null) {
			sizeStyle = document.defaultView.getComputedStyle(element, '')['height'];
		} else {
			sizeStyle = element.currentStyle.height;
		}
		if (sizeStyle === '') {
			return null;
		}

		return parseInt(sizeStyle.replace(/px$/i, ''), 10);
	};

	/**
	 * 仮想スクロールを行うスクロール領域のコントローラ。
	 * 
	 * @class h5.ui.components.virtualScroll.VirtualScrollBoxController
	 */
	var virtualScrollBoxController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.virtualScroll.VirtualScrollBoxController
		 */
		__name: 'h5.ui.components.virtualScroll.VirtualScrollBoxController',


		// --- Property --- //

		/** 描画を行う関数 */
		_renderer: null,

		/** 描画範囲の開始行 */
		_rowStart: 0,

		/** 描画範囲の終了行 */
		_rowEnd: 0,

		/** 描画範囲の開始列 */
		_columnStart: 0,

		/** 描画範囲の終了列 */
		_columnEnd: 0,

		/** 初期化を待機する Deferred */
		_initializeDeferred: null,


		// --- Private Method --- //

		/**
		 * 描画を行う対象の jQuery オブジェクトを取得する
		 * 
		 * @returns 描画対象の jQuery オブジェクト
		 */
		_getRenderTarget: function() {
			// 入れ子になる可能性もあるので children で取得する
			return $(this.boxRootElement).children('.virtual' + RENDER_TARGET_CLASS);
		},

		/**
		 * ローディング表示を行う jQuery オブジェクトを取得する
		 * 
		 * @returns ローディング表示を行う jQuery オブジェクト
		 */
		_getLoading: function() {
			return $(this.boxRootElement).children('.virtual' + LOADING_CLASS);
		},

		// --- Life Cycle Method --- //

		__construct: function() {
			this._initializeDeferred = this.deferred();
		},

		__init: function() {
			if (!this.boxRootElement) {
				this.boxRootElement = this.rootElement;
			}

			var $root = $(this.boxRootElement);

			var rootPosition = $root.css('position');

			if (rootPosition === 'static') {
				rootPosition = 'relative';
			}

			$root.css({
				overflow: 'hidden',
				position: rootPosition
			});

			// rootElement 内の HTML を取得して削除する
			var html = $root.html();
			$root.empty();

			$('<div></div>').addClass('virtual' + RENDER_TARGET_CLASS).css({
				position: 'absolute'
			}).html(html).appendTo($root);

			$('<div></div>').addClass('virtual' + LOADING_CLASS).css({
				position: 'absolute',
				top: 0,
				left: 0,
				display: 'none'
			}).text(DEFAULT_LOADING_TEXT).appendTo($root);
		},

		__unbind: function() {
			$(this.boxRootElement).empty();
			this.boxRootElement = null;
		},


		// --- Event Handler --- //


		// --- Public Method --- //

		/**
		 * 初期化する。
		 * 
		 * @param {Function} renderer 描画対象の jQuery オブジェクトと描画するデータを渡されて、実際に描画する関数
		 */
		init: function(renderer) {
			this._renderer = renderer;

			var that = this;

			return this.readyPromise.then(function() {
				that._initializeDeferred.resolve();
			});
		},

		/**
		 * 描画する。
		 * 
		 * @param renderData 描画データ
		 * @returns {Promise} 描画が完了するまで待機する Promise
		 */
		render: function(renderData) {
			var that = this;
			return this._initializeDeferred.then(function() {
				that._renderer(that._getRenderTarget(), renderData);
			});
		},

		/**
		 * 縦の描画位置を指定する。 指定した分のピクセルだけ上にずれる。
		 * 
		 * @param {number} position 縦の描画位置
		 */
		setVerticalPosition: function(position) {
			this._getRenderTarget().css({
				top: -position,
				bottom: ''
			});
		},

		/**
		 * 縦の描画位置を底に合わせる。
		 */
		setVerticalPositionBottom: function() {
			this._getRenderTarget().css({
				top: '',
				bottom: 1
			});
		},

		/**
		 * 横の描画位置を指定する。 指定した分のピクセルだけ左にずれる。
		 * 
		 * @param {number} position 横の描画位置
		 */
		setHorizontalPosition: function(position) {
			this._getRenderTarget().css({
				left: -position,
				right: ''
			});
		},

		/**
		 * 横の描画位置を右端に合わせる。
		 */
		setHorizontalPositionRight: function() {
			this._getRenderTarget().css({
				left: '',
				right: 1
			});
		},

		/**
		 * ローディング表示をする DIV のエレメントを取得する。
		 * 
		 * @returns {Element} ローディング表示をする DIV のエレメント
		 */
		getLoadingDiv: function() {
			return this._getLoading()[0];
		},

		/**
		 * 描画領域を隠してローディング表示を描画する。
		 */
		beginLoad: function() {
			this._getRenderTarget().hide();
			this._getLoading().show();
		},

		/**
		 * ローディング表示をやめて描画領域を表示する。
		 */
		endLoad: function() {
			this._getLoading().hide();
			this._getRenderTarget().show();
		},

		/**
		 * 初期化を待機する Promise を返す。
		 * 
		 * @returns {Promise} 初期化を待機する Promise
		 */
		getInitializePromise: function() {
			return this._initializeDeferred.promise();
		}

	};


	/**
	 * HTMLで記述された要素に対してスクロールを行うスクロール領域のコントローラ。
	 */
	var htmlScrollBoxController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.virtualScroll.HtmlScrollBoxController
		 */
		__name: 'h5.ui.components.virtualScroll.HtmlScrollBoxController',


		// --- Property --- //

		/** 行要素を選択する jQuery セレクタ */
		_rowSelector: null,

		/** 列要素を選択する jQuery セレクタ */
		_columnSelector: null,


		/** 各行の高さ */
		_rowsHeight: null,

		/** 各列の幅 */
		_columnsWidth: null,

		/** 各行のポジション */
		_rowsTop: null,

		/** 各列のポジション */
		_columnsLeft: null,

		/** 縦の描画ポジション */
		_verticalPosition: null,

		/** 横の描画ポジション */
		_horizontalPosition: null,


		// --- Private Method --- //

		/**
		 * 描画を行う対象の jQuery オブジェクトを取得する。
		 * 
		 * @returns 描画対象の jQuery オブジェクト
		 */
		_getRenderTarget: function() {
			// 入れ子になる可能性もあるので children で取得する
			return $(this.boxRootElement).children('.html' + RENDER_TARGET_CLASS);
		},

		/**
		 * 描画している HTML から各行の高さを再取得して記憶する。
		 */
		_updateRowsHeight: function() {
			var $renderTarget = this._getRenderTarget();

			var rowsHeight = this._rowsHeight = [];
			var rowsTop = this._rowsTop = [];

			var currentTop = 0;

			$renderTarget.find(this._rowSelector).each(function(index, el) {

				// IE では height をそのままとると結合分も加えられてしまうのでそれを避けている
				var height = getComputedSize(el);
				rowsHeight.push(height);

				rowsTop.push(currentTop);
				currentTop += height;
			});
		},

		/**
		 * 描画している HTML から各列の幅を再取得して記憶する。
		 */
		_updateColumnsWidth: function() {
			var $renderTarget = this._getRenderTarget();

			var columnsWidth = this._columnsWidth = [];
			var columnsLeft = this._columnsLeft = [];

			var currentLeft = 0;

			$renderTarget.find(this._columnSelector).each(function(index, el) {

				var width = $(el).outerWidth();
				columnsWidth.push(width);

				columnsLeft.push(currentLeft);
				currentLeft += width;
			});
		},

		/**
		 * 描画している HTML から各行の高さと各列の幅を再取得して記憶する。
		 */
		_updateCellsSize: function() {
			this._updateRowsHeight();
			this._updateColumnsWidth();
		},


		// --- Life Cycle Method --- //

		__construct: function() {
			this._verticalPosition = {
				isEnd: false,
				position: 0
			};
			this._horizontalPosition = {
				isEnd: false,
				position: 0
			};
		},

		__init: function() {
			if (!this.boxRootElement) {
				this.boxRootElement = this.rootElement;
			}

			var $root = $(this.boxRootElement);

			var rootPosition = $root.css('position');

			if (rootPosition === 'static') {
				rootPosition = 'relative';
			}

			$root.css({
				overflow: 'hidden',
				position: rootPosition
			});

			// rootElement 内の HTML を取得して削除する
			var html = $root.html();
			$root.empty();

			$('<div></div>').addClass('html' + RENDER_TARGET_CLASS).css({
				position: 'absolute'
			}).html(html).appendTo($root);

			this._updateCellsSize();
		},

		__unbind: function() {
			$(this.boxRootElement).empty();
			this.boxRootElement = null;
		},


		// --- Public Method --- //

		/**
		 * 初期化する。
		 * 
		 * @param {string} 各行のエレメントを取得する jQuery セレクタ文字列
		 * @param {string} 各列のエレメントを取得する jQuery セレクタ文字列
		 */
		init: function(rowSelector, columnSelector) {
			this._rowSelector = rowSelector;
			this._columnSelector = columnSelector;

			return this.readyPromise;
		},

		/**
		 * 描画する。
		 * 
		 * @param data 描画データ（APIを揃えるためにあるだけで、実際には利用されない）
		 * @param range 描画する範囲
		 */
		render: function(data, range) {
			if (this._rowsTop == null) {
				return;
			}

			var css = {};

			if (this._verticalPosition.isEnd && range.rowStart != null) {
				css.top = '';
				css.bottom = 1;
			} else {
				css.top = this._verticalPosition.position - this._rowsTop[range.rowStart];
				css.bottom = '';
			}

			if (this._horizontalPosition.isEnd && range.columnStart != null) {
				css.left = '';
				css.right = 1;
			} else {
				css.left = this._horizontalPosition.position - this._columnsLeft[range.columnStart];
				css.right = '';
			}

			this._getRenderTarget().css(css);
		},

		/**
		 * 縦の描画位置を指定する。 指定した分のピクセルだけ上にずれる。
		 * 
		 * @param {number} position 縦の描画位置
		 */
		setVerticalPosition: function(position) {
			this._verticalPosition = {
				isEnd: false,
				position: -position
			};
		},

		/**
		 * 縦の描画位置を底に合わせる。
		 */
		setVerticalPositionBottom: function() {
			this._verticalPosition = {
				isEnd: true
			};
		},

		/**
		 * 横の描画位置を指定する。 指定した分のピクセルだけ左にずれる。
		 * 
		 * @param {number} position 横の描画位置
		 */
		setHorizontalPosition: function(position) {
			this._horizontalPosition = {
				isEnd: false,
				position: -position
			};
		},

		/**
		 * 横の描画位置を右端に合わせる。
		 */
		setHorizontalPositionRight: function() {
			this._horizontalPosition = {
				isEnd: true
			};
		},

		/**
		 * 各行の高さを取得する。
		 * 
		 * @returns 各行の高さ
		 */
		getRowsHeight: function() {
			return $.extend([], this._rowsHeight);
		},

		/**
		 * 各列の幅を取得する。
		 * 
		 * @returns 各列の幅
		 */
		getColumnsWidth: function() {
			return $.extend([], this._columnsWidth);
		},

		/**
		 * 初期化を待機する Promise を返す。
		 * 
		 * @returns {Promise} 初期化を待機する Promise
		 */
		getInitializePromise: function() {
			return this.readyPromise;
		},

		/**
		 * 描画領域を隠してローディング表示を描画する。 このコントローラの実装ではなにもしない。
		 */
		beginLoad: $.noop,

		/**
		 * ローディング表示をやめて描画領域を表示する。 このコントローラの実装ではなにもしない。
		 */
		endLoad: $.noop,

		/**
		 * ローディング表示をする DIV のエレメントを取得する。 このコントローラの実装では null を返す。
		 */
		getLoadingDiv: $.noop

	};

	h5.core.expose(virtualScrollBoxController);
	h5.core.expose(htmlScrollBoxController);

})(jQuery);


// ---- IndexBaseScrollStrategy ---- //

(function($) {
	'use strict';

	var SCROLL_SIZE_LIMIT = 500000;
	var BLOCK_SIZE = 10000;

	/**
	 * インデックスによるスクロール戦略。
	 * 
	 * @class h5.ui.components.virtualScroll.IndexBaseScrollStrategy
	 */
	var IndexBaseScrollStrategy = function() {
	// コンストラクタ
	};

	$.extend(IndexBaseScrollStrategy.prototype, {

		// --- Property --- //

		/**
		 * 現在のスクロール位置
		 * 
		 * @memberOf h5.ui.components.virtualScroll.IndexBaseScrollStrategy
		 */
		_pos: 0,

		/** 最大のインデックス */
		_maxIndex: null,

		/** 1ブロックのセル数 */
		_blockCells: null,

		/** ブロック数 */
		_blocks: null,

		/** 次のブロックと重なるセル数 */
		_blockOverlapCells: null,

		/** 現在表示しているブロック */
		_blockIndex: null,

		/** スクロール領域のサイズ */
		_scrollSize: null,



		// --- Private Method --- //

		/**
		 * ブロックを初期化する。
		 */
		_setupBlock: function(dataInfo) {
			var indexes = this._maxIndex + 1;
			var scrollIndexLimit = Math.floor(SCROLL_SIZE_LIMIT / this._scrollCellSize);

			if (indexes < scrollIndexLimit) {
				this._blockCells = dataInfo.totalCells;
				this._blocks = 1;
				this._blockOverlapCells = 0;
				this._blockIndex = 0;
				this._scrollSize = (indexes - 1) * this._scrollCellSize + 1;
				return;
			}

			this._blockCells = Math.ceil(BLOCK_SIZE / this._scrollCellSize);
			this._blocks = Math.floor(indexes / this._blockCells);

			this._blockOverlapCells = Math.ceil((indexes - scrollIndexLimit) / (this._blocks - 1));

			var scrollIndexes = indexes - (this._blocks - 1) * this._blockOverlapCells;
			this._scrollSize = scrollIndexes * this._scrollCellSize + 1;
		},

		/**
		 * 近い位置へのスクロールをする。 差分によってスクロールする。
		 * 
		 * @param {number} scrollIndex スクロール先のインデックス
		 * @returns {number} 計算した結果のインデックス
		 */
		_scrollNear: function(scrollIndex) {
			var blockHeadCells = this._blockCells - this._blockOverlapCells;
			var indexInBlock = scrollIndex - (this._blockIndex * blockHeadCells);

			if (indexInBlock < 0) {
				this._pos += this._blockOverlapCells * this._scrollCellSize;
				this._blockIndex -= 1;
				indexInBlock = this._blockCells - 1;
			} else if (this._blockCells <= indexInBlock && this._blockIndex < this._blocks - 1) {
				this._pos -= this._blockOverlapCells * this._scrollCellSize;
				this._blockIndex += 1;
				indexInBlock = 0;
			}

			var index = this._blockIndex * this._blockCells + indexInBlock;

			indexInBlock = this._blockCells - 1;
			return index;
		},

		/**
		 * 遠い位置へのスクロールをする。 絶対値によるスクロールをしたあと _scrollNear() を実行している。
		 * 
		 * @param {number} scrollIndex スクロール先のインデックス
		 * @param {object} dataInfo スクロールに関わる情報
		 * @returns 計算した結果のインデックス
		 */
		_jumpBlock: function(scrollIndex, dataInfo) {
			var blockHeadCells = this._blockCells - this._blockOverlapCells;
			this._blockIndex = Math.floor(scrollIndex / blockHeadCells);

			if (this._blocks <= this._blockIndex) {
				this._blockIndex = this._blocks - 1;
			}

			return this._scrollNear(scrollIndex, dataInfo);
		},


		// --- Public Method --- //

		/**
		 * スクロールを行い、スクロール後の位置情報を返す。
		 * 
		 * @param {number} scrollDiff スクロールの差分
		 * @param {number} windowSize スクロール領域の窓幅
		 * @param {object} dataInfo スクロールに関する情報
		 */
		scroll: function(scrollDiff, windowSize, dataInfo) {
			var windowCells = Math.ceil(windowSize / dataInfo.defaultCellSize);
			if (this._maxIndex === null) {
				this._maxIndex = dataInfo.totalCells - windowCells + 1;
				if (this._maxIndex < 0) {
					this._maxIndex = 0;
				}

				// IE8 用の計算
				this._scrollCellSize = Math.floor(windowSize / 8);
				this._setupBlock(dataInfo);
			}

			var nextPosition = this._pos + scrollDiff;

			if (nextPosition < 0) {
				nextPosition = 0;
			} else if (this._scrollSize < nextPosition) {
				nextPosition = this._scrollSize;
			}

			this._pos = nextPosition;

			var scrollIndex = Math.floor(this._pos / this._scrollCellSize);

			var index;
			if (this._blockIndex !== null && Math.abs(scrollDiff) < windowSize) {
				index = this._scrollNear(scrollIndex, dataInfo);
			} else {
				index = this._jumpBlock(scrollIndex, dataInfo);
			}

			// TODO: わかる場合は len を付ける

			var result = {
				isEnd: false,
				index: index,
				offset: 0,
				scrollPosition: this._pos,
				scrollSize: this._scrollSize + windowSize
			};

			if (this._maxIndex <= index && windowCells <= dataInfo.totalCells) {
				result.isEnd = true;
				result.index = dataInfo.totalCells;
			}
			if (dataInfo.totalCells < windowCells) {
				result.isEnd = false;
				result.index = 0;
			}

			return result;
		},

		/**
		 * インデックスの差分をスクロールピクセルの差分に変換する。
		 * 
		 * @param {number} indexDiff インデックスの差分
		 * @param {number} windowSize スクロール領域の窓幅
		 * @returns {number} スクロールピクセルの差分
		 */
		indexDiffToScrollDiff: function(indexDiff, windowSize) {
			return indexDiff * Math.floor(windowSize / 8);
		},

		/**
		 * スクロール位置以外の記憶した情報をリセットする。
		 */
		resetPageInfo: function() {
			this._maxIndex = null;
			this._blockCells = null;
			this._blocks = null;
			this._blockOverlapCells = null;
			this._blockIndex = null;
		}

	});


	h5.u.obj.expose('h5.ui.components.virtualScroll', {
		createIndexBaseScrollStrategy: function() {
			return new IndexBaseScrollStrategy();
		}
	});

})(jQuery);


//---- PixelBaseScrollStrategy ---- //

(function($) {

	/**
	 * ピクセルによるスクロール戦略
	 * 
	 * @class h5.ui.components.virtualScroll.PixelBaseScrollStrategy
	 */
	var PixelBaseScrollStrategy = function() {
	// コンストラクタ
	};

	$.extend(PixelBaseScrollStrategy.prototype, {

		// --- Property --- //

		/**
		 * 現在のスクロール位置
		 * 
		 * @memberOf h5.ui.components.virtualScroll.PixelBaseScrollStrategy
		 */
		_pos: 0,

		/** 各セルのサイズを持った配列 */
		_cellSizeArray: null,

		/** 全体のサイズ */
		_totalSize: null,

		/** インデックスごとのポジションを記録する配列 */
		_indexToPosArray: null,


		// --- Private Method --- //

		/**
		 * ポジションから index に変換する。
		 * 
		 * @param {number} pos ポジション
		 */
		_posToIndex: function(pos) {

			var minIndex = 0;
			var maxIndex = this._indexToPosArray.length;
			var centerIndex;
			var centerPos;

			while (minIndex <= maxIndex) {
				centerIndex = Math.floor((minIndex + maxIndex) / 2);
				centerPos = this._indexToPosArray[centerIndex];

				if (centerPos < pos) {
					minIndex = centerIndex + 1;
				} else if (pos < centerPos) {
					maxIndex = centerIndex - 1;
				} else {
					return centerIndex;
				}
			}

			// ヒットしない場合は値が小さい方を返す
			if (maxIndex < 0) {
				return 0;
			}
			return maxIndex;
		},


		// --- Public Method --- //

		/**
		 * スクロールを行い、スクロール後の位置情報を返す。
		 * 
		 * @param {number} scrollDiff スクロールの差分
		 * @param {number} windowSize スクロール領域の窓幅
		 * @param {object} dataInfo スクロールに関する情報
		 */
		scroll: function(scrollDiff, windowSize, dataInfo) {
			var i;
			var len;

			if (this._cellSizeArray === null) {
				if (dataInfo.cellSizeArray == null) {
					throw new Error('全件取得できる場合でないと Pixel ベースのスクロールはできません');
				}
				len = dataInfo.cellSizeArray.length;
				this._cellSizeArray = dataInfo.cellSizeArray;
				this._totalSize = 0;
				this._indexToPosArray = [];

				for (i = 0; i < len; i++) {
					this._indexToPosArray.push(this._totalSize);
					this._totalSize += this._cellSizeArray[i];
				}
			}

			var scrollSize = this._totalSize - windowSize;
			if (scrollSize < 0) {
				scrollSize = 0;
			}

			var nextPosition = this._pos + scrollDiff;

			if (nextPosition < 0) {
				nextPosition = 0;
			} else if (scrollSize < nextPosition) {
				nextPosition = scrollSize;
			}

			this._pos = nextPosition;

			var index = this._posToIndex(nextPosition);
			var offset = nextPosition - this._indexToPosArray[index];

			var rangeSize = 0;
			var cellLength = this._cellSizeArray.length;
			for (i = index; i < cellLength; i++) {
				rangeSize += this._cellSizeArray[i];
				if (windowSize + offset < rangeSize) {
					break;
				}
			}

			var range = i - index + 2;
			if (cellLength <= index + range) {
				range = cellLength - index;
			}


			var result = {
				isEnd: false,
				index: index,
				length: range,
				offset: offset,
				scrollPosition: this._pos,
				scrollSize: this._totalSize
			};

			if (this._pos === scrollSize && windowSize < this._totalSize) {
				result.isEnd = true;
				result.index = dataInfo.totalCells;
				result.offset = 0;
				if (result.length <= 0) {
					result.length = 1;
				}
			}
			if (this._totalSize < windowSize) {
				result.isEnd = false;
				result.index = 0;
			}

			return result;
		},

		/**
		 * インデックスの差分をスクロールピクセルの差分に変換する。
		 * 
		 * @param {number} indexDiff インデックスの差分
		 * @param {number} windowSize スクロール領域の窓幅
		 * @returns {number} スクロールピクセルの差分
		 */
		indexDiffToScrollDiff: function(indexDiff, windowSize) {
			var index = this._posToIndex(this._pos);

			if (indexDiff < 0 && this._pos !== this._indexToPosArray[index]) {
				// 戻るときに現在のポジションがピッタリでない場合 index を一個ずらす
				index += 1;
			}

			var nextIndex = index + indexDiff;

			if (nextIndex < 0) {
				nextIndex = 0;
			}

			if (this._indexToPosArray.length <= nextIndex) {
				nextIndex = this._indexToPosArray.length - 1;
			}
			var nextPosition = this._indexToPosArray[nextIndex];

			var maxPosition = this._totalSize - windowSize;
			if (maxPosition < nextPosition) {
				nextPosition = maxPosition;
			}

			return nextPosition - this._pos;
		},

		/**
		 * スクロール位置以外の記憶した情報をリセットする。
		 */
		resetPageInfo: function() {
			this._cellSizeArray = null;
			this._totalSize = null;
			this._indexToPosArray = null;
		}
	});


	h5.u.obj.expose('h5.ui.components.virtualScroll', {
		createPixelBaseScrollStrategy: function() {
			return new PixelBaseScrollStrategy();
		}
	});

})(jQuery);