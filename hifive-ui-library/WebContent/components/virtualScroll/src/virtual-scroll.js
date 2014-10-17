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
	var requireOverflowScrollInner = false;
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

		if ($outer[0].clientWidth === FIRST_WIDTH) {
			requireOverflowScrollInner = true;
		}

		var $inner = $('<div></div>');
		$inner.css({
			height: FIRST_WIDTH + 10,
			width: FIRST_WIDTH,
			overflow: 'scroll'
		}).appendTo($outer);

		var extWidth = $inner[0].clientWidth;
		scrollBarWidth = FIRST_WIDTH - extWidth;

		$outer.remove();
	});


	var verticalScrollBarController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.virtualScroll.VerticalScrollBarController
		 */
		__name: 'h5.ui.components.virtualScroll.VerticalScrollBarController',


		// --- Property --- //

		_scrollSize: 0,

		_ignoreScrollEvent: false,


		_timer: null,

		_pos: 0,


		// --- Private Method --- //

		_resizeScrollSize: function() {

			var $innerDiv = this.$find('.vertical' + INNER_DIV_CLASS_SUFFIX);

			$innerDiv.css({
				height: this._scrollSize
			});

			var $root = $(this.rootElement);
			var barSize = $root.height();
			var visibility = (this._scrollSize <= barSize) ? 'hidden' : 'visible';

			$root.css({
				visibility: visibility
			});
		},


		// --- Life Cycle Method --- //

		__init: function() {

			var $root = $(this.rootElement);

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


		// --- Event Handler --- //

		'.vertical-scroll-bar-outer [scroll]': function(context, $el) {
			if (this._timer) {
				clearTimeout(this._timer);
			}

			var prevPos = this._pos;
			var pos = $el.scrollTop();


			if (40 < Math.abs(pos - prevPos)) {

				var ignore = this._ignoreScrollEvent;

				if (ignore) {
					this._ignoreScrollEvent = false;
				}

				if (!ignore || pos !== prevPos) {
					setTimeout(this.own(function() {
						this.trigger(SCROLL_EVENT_NAME, {
							verticalScroll: {
								type: 'pixel',
								diff: pos - prevPos
							}
						});
					}, 0));
				}

				this._pos = pos;
				return;
			}

			// IE のスムーススクロール対応

			this._timer = setTimeout(this.own(function() {
				var prevPos = this._pos;
				var pos = $el.scrollTop();

				if (!this._ignoreScrollEvent || pos !== prevPos) {
					this.trigger(SCROLL_EVENT_NAME, {
						verticalScroll: {
							type: 'pixel',
							diff: pos - this._pos
						}
					});
				}

				if (this._ignoreScrollEvent) {
					this._ignoreScrollEvent = false;
				}

				this._pos = pos;
			}), 50);
		},

		'{rootElement} keydown': function(context) {
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

		setScrollSize: function(size) {

			this._scrollSize = size;

			if (this.isInit) {
				this._resizeScrollSize();
			}
		},

		setBarSize: function(size) {

			$(this.rootElement).css({
				height: size
			});

			if (this.isInit) {
				this._resizeScrollSize();
			}
		},

		getScrollSize: function() {
			return this._scrollSize;
		},

		setScrollPosition: function(position) {
			this._pos = position;

			var $outer = this.$find('.vertical' + OUTER_DIV_CLASS_SUFFIX);

			if (position === $outer.scrollTop()) {
				return;
			}

			this._ignoreScrollEvent = true;
			$outer.scrollTop(position);
		}
	};


	var horizontalScrollBarController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.virtualScroll.HorizontalScrollBarController
		 */
		__name: 'h5.ui.components.virtualScroll.HorizontalScrollBarController',


		// --- Property --- //

		_scrollSize: 0,

		_ignoreScrollEvent: false,


		_timer: null,

		_pos: 0,

		// --- Private Method --- //

		_resizeScrollSize: function() {

			var $innerDiv = this.$find('.horizontal' + INNER_DIV_CLASS_SUFFIX);

			$innerDiv.css({
				width: this._scrollSize
			});

			var $root = $(this.rootElement);
			var barSize = $root.width();
			var visibility = (this._scrollSize <= barSize) ? 'hidden' : 'visible';

			$root.css({
				visibility: visibility
			});
		},


		// --- Life Cycle Method --- //

		__init: function() {

			var $root = $(this.rootElement);

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


		// --- Event Handler --- //

		'.horizontal-scroll-bar-outer [scroll]': function(context, $el) {
			if (this._timer) {
				clearTimeout(this._timer);
			}

			var prevPos = this._pos;
			var pos = $el.scrollLeft();

			if (40 < Math.abs(pos - prevPos)) {
				if (!this._ignoreScrollEvent || pos !== prevPos) {
					this.trigger(SCROLL_EVENT_NAME, {
						horizontalScroll: {
							type: 'pixel',
							diff: pos - this._pos
						}
					});
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

				if (!this._ignoreScrollEvent || pos !== prevPos) {
					this.trigger(SCROLL_EVENT_NAME, {
						horizontalScroll: {
							type: 'pixel',
							diff: pos - this._pos
						}
					});
				}
				this._pos = pos;
			}), 50);
		},

		'{rootElement} keydown': function(context) {
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

		setScrollSize: function(size) {

			this._scrollSize = size;

			if (this.isInit) {
				this._resizeScrollSize();
			}
		},

		getScrollSize: function() {
			return this._scrollSize;
		},

		setBarSize: function(size) {

			$(this.rootElement).css({
				width: size
			});

			if (this.isInit) {
				this._resizeScrollSize();
			}
		},

		setScrollPosition: function(position) {
			this._pos = position;

			var $outer = this.$find('.horizontal' + OUTER_DIV_CLASS_SUFFIX);
			if (position === $outer.scrollLeft()) {
				return;
			}

			this._ignoreScrollEvent = true;
			$outer.scrollLeft(position);
		}

	};

	h5.core.expose(verticalScrollBarController);
	h5.core.expose(horizontalScrollBarController);


	h5.u.obj.expose('h5.ui.components.virtualScroll', {
		getScrollBarWidth: function() {
			return scrollBarWidth;
		},

		isRequireOverflowScrollInner: function() {
			return requireOverflowScrollInner;
		}
	});

})(jQuery);


// ---- ScrollBox ---- //

(function($) {
	'use strict';

	var RENDER_TARGET_CLASS = '-scroll-box-render-target';
	var LOADING_CLASS = '-scroll-box-loading';

	var DEFAULT_LOADING_TEXT = 'Loading...';


	var getComputedSize = function(element, styleName) {
		var sizeStyle;
		if (document.defaultView != null) {
			sizeStyle = document.defaultView.getComputedStyle(element, '')[styleName];
		} else {
			sizeStyle = element.currentStyle.height;
		}
		if (sizeStyle === '') {
			return null;
		}

		return parseInt(sizeStyle.replace(/px$/i, ''), 10);
	};

	var virtualScrollBoxController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.virtualScroll.VirtualScrollBoxController
		 */
		__name: 'h5.ui.components.virtualScroll.VirtualScrollBoxController',


		// --- Property --- //

		_renderer: null,


		_rowStart: 0,

		_rowEnd: 0,

		_columnStart: 0,

		_columnEnd: 0,

		_initializeDeferred: null,


		// --- Private Method --- //

		_getRenderTarget: function() {
			// 入れ子になる可能性もあるので children で取得する
			return $(this.rootElement).children('.virtual' + RENDER_TARGET_CLASS);
		},

		_getLoading: function() {
			return $(this.rootElement).children('.virtual' + LOADING_CLASS);
		},


		// --- Life Cycle Method --- //

		__construct: function() {
			this._initializeDeferred = this.deferred();
		},

		__init: function() {
			var $root = $(this.rootElement);

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


		// --- Event Handler --- //

		// TODO: scroll イベントハンドラ


		// --- Public Method --- //

		init: function(renderer) {
			this._renderer = renderer;

			var that = this;

			return this.readyPromise.then(function() {
				that._initializeDeferred.resolve();
			});
		},

		render: function(renderData) {
			var that = this;
			this._initializeDeferred.then(function() {
				that._renderer(that._getRenderTarget(), renderData);
			});
		},

		setVerticalPosition: function(position) {
			this._getRenderTarget().css({
				top: -position,
				bottom: ''
			});
		},

		setVerticalPositionBottom: function() {
			this._getRenderTarget().css({
				top: '',
				bottom: 1
			});
		},

		setHorizontalPosition: function(position) {
			this._getRenderTarget().css({
				left: -position,
				right: ''
			});
		},

		setHorizontalPositionRight: function() {
			this._getRenderTarget().css({
				left: '',
				right: 1
			});
		},


		getLoadingDiv: function() {
			return this._getLoading()[0];
		},

		beginLoad: function() {
			this._getRenderTarget().hide();
			this._getLoading().show();
		},

		endLoad: function() {
			this._getLoading().hide();
			this._getRenderTarget().show();
		},


		getInitializePromise: function() {
			return this._initializeDeferred.promise();
		}

	};


	var htmlScrollBoxController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.virtualScroll.HtmlScrollBoxController
		 */
		__name: 'h5.ui.components.virtualScroll.HtmlScrollBoxController',


		// --- Property --- //

		_rowSelector: null,

		_columnSelector: null,


		_rowsHeight: null,

		_columnsWidth: null,

		_rowsTop: null,

		_columnsLeft: null,


		_verticalPosition: null,

		_horizontalPosition: null,


		// --- Private Method --- //

		_getRenderTarget: function() {
			// 入れ子になる可能性もあるので children で取得する
			return $(this.rootElement).children('.html' + RENDER_TARGET_CLASS);
		},

		_updateRowsHeight: function() {
			var $renderTarget = this._getRenderTarget();

			var rowsHeight = this._rowsHeight = [];
			var rowsTop = this._rowsTop = [];

			var currentTop = 0;

			$renderTarget.find(this._rowSelector).each(function(index, el) {

				// IE では height をそのままとると結合分も加えられてしまうのでそれを避けている
				var height = getComputedSize(el, 'height');
				rowsHeight.push(height);

				rowsTop.push(currentTop);
				currentTop += height;
			});
		},

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
			var $root = $(this.rootElement);

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


		// --- Public Method --- //

		init: function(rowSelector, columnSelector) {
			this._rowSelector = rowSelector;
			this._columnSelector = columnSelector;

			return this.readyPromise;
		},

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

		setVerticalPosition: function(renderTop) {
			this._verticalPosition = {
				isEnd: false,
				position: -renderTop
			};
		},

		setVerticalPositionBottom: function() {
			this._verticalPosition = {
				isEnd: true
			};
		},

		setHorizontalPosition: function(renderLeft) {
			this._horizontalPosition = {
				isEnd: false,
				position: -renderLeft
			};
		},

		setHorizontalPositionRight: function() {
			this._horizontalPosition = {
				isEnd: true
			};
		},

		getRowsHeight: function() {
			return $.extend([], this._rowsHeight);
		},

		getColumnsWidth: function() {
			return $.extend([], this._columnsWidth);
		},


		getInitializePromise: function() {
			return this.readyPromise;
		},

		beginLoad: $.noop,

		endLoad: $.noop,

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

	var IndexBaseScrollStrategy = function() {
	// コンストラクタ
	};

	$.extend(IndexBaseScrollStrategy.prototype, {

		// --- Property --- //

		_pos: 0,

		_maxIndex: null,

		_blockCells: null,

		_blocks: null,

		_blockOverlapCells: null,

		_blockIndex: null,

		_scrollSize: null,



		// --- Private Method --- //

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

		_jumpBlock: function(scrollIndex, dataInfo) {
			var blockHeadCells = this._blockCells - this._blockOverlapCells;
			this._blockIndex = Math.floor(scrollIndex / blockHeadCells);

			if (this._blocks <= this._blockIndex) {
				this._blockIndex = this._blocks - 1;
			}

			return this._scrollNear(scrollIndex, dataInfo);
		},


		// --- Public Method --- //

		scroll: function(scrollDiff, windowSize, dataInfo) {
			var windowCells = Math.ceil(windowSize / dataInfo.defaultCellSize);
			if (this._maxIndex === null) {
				this._maxIndex = dataInfo.totalCells - windowCells - 1;

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

			if (this._pos === this._scrollSize && windowCells < dataInfo.totalCells) {
				result.isEnd = true;
				result.index = dataInfo.totalCells;
			}
			if (dataInfo.totalCells < windowCells) {
				result.isEnd = false;
				result.index = 0;
			}

			return result;
		},

		indexDiffToScrollDiff: function(indexDiff, windowSize) {
			return indexDiff * Math.floor(windowSize / 8);
		},

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

	var PixelBaseScrollStrategy = function() {
	// コンストラクタ
	};

	$.extend(PixelBaseScrollStrategy.prototype, {

		// --- Property --- //

		_pos: 0,

		_cellSizeArray: null,

		_totalSize: null,

		_indexToPosArray: null,


		// --- Private Method --- //

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
			}
			if (this._totalSize < windowSize) {
				result.isEnd = false;
				result.index = 0;
			}

			return result;
		},

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