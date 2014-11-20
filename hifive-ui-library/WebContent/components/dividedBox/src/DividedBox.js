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
(function() {
	var DATA_STATE = 'state';
	var EVENT_STATE_CHANGE = 'state-change';
	var selectBoxController = {
		__name: 'h5.ui.container.StateBox',
		_currentState: null,
		__init: function() {
			// data-stateが指定されているもののうち、最初以外を隠す
			var $stateBoxes = this._getAllStateBoxes();
			this.setState($stateBoxes.data(DATA_STATE));

			//FIXME ルートエレメントからこのコントローラを辿れるようにjQuery.dataを使って覚えさせておく
			// (getControllers()を使ったDOM->Controllerの特定は子コントローラの場合にできないため)
			$(this.rootElement).data('h5controller-statebox-instance', this);
		},
		setState: function(state) {
			if (this._currentState === state) {
				return;
			}
			var $target = this._getStateBoxByState(state);
			if (!$target.length) {
				this.log.warn('指定されたstateの要素はありません。{}', state);
				return;
			}
			var $stateBoxes = this.$find('*[data-' + DATA_STATE + ']');
			$stateBoxes.css('display', 'none');
			$target.css('display', 'block');
			this._currentState = state;
			this.trigger(EVENT_STATE_CHANGE, state);
		},
		getContentsSize: function() {
			var $current = this._getStateBoxByState(this._currentState);
			// TODO outerWidth/Heightかどうかはオプション？
			return {
				width: $current.outerWidth(),
				height: $current.outerHeight()
			};
		},
		_getAllStateBoxes: function() {
			return this.$find('>[data-' + DATA_STATE + ']');
		},
		_getStateBoxByState: function(state) {
			return this.$find('>[data-' + DATA_STATE + '="' + state + '"]');
		}
	};
	h5.core.expose(selectBoxController);
})();

(function() {

	var logger = h5.log.createLogger('DivideBoxController');

	var dividedBoxController = {

		__name: 'h5.ui.container.DividedBox',

		_dividerPos: {
			left: 0.5,
			top: 0.5
		},

		_type: null,

		_prev: null,

		_prevStart: null,

		_next: null,

		_nextEnd: null,

		_root: null,

		_lastAdjustAreaWH: null,

		_l_t: '',

		_w_h: '',

		_outerW_H: '',

		_scrollW_H: '',

		_lastPos: null,

		__init: function(context) {

			var root = this._root = $(this.rootElement);
			var type = this._type = root.hasClass('vertical') ? 'y' : 'x';
			var that = this;

			this._cleanWhitespace(root[0]);

			root.addClass('dividedBox');
			if (type == 'x') {
				root.addClass('horizontal');
			}

			var w_h = this._w_h = (type == 'x') ? 'width' : 'height';
			var l_t = this._l_t = (type == 'x') ? 'left' : 'top';

			var outerW_H = this._outerW_H = w_h == 'width' ? 'outerWidth' : 'outerHeight';
			this._scrollW_H = w_h == 'width' ? 'scrollWidth' : 'scrolleight';

			if (root.hasClass('freezeSize')) {
				root.width(root.width());
				root.height(root.height());
			}

			this._lastAdjustAreaWH = root[w_h]();

			var pcp = root.css('position');

			if (pcp == 'static' || !pcp) {
				root.css('position', 'relative');
				if (h5.env.ua.isOpera) {
					root.css({
						'top': 0,
						'left': 0
					});
				}
			}

			var autoSizeBoxCouunt = 0;
			var autoSizeBoxAreaWH = root[w_h]();

			var boxArray = this.$find('> :not(.divider)');
			boxArray.each(function(index, domEle) {
				var box = $(this);
				if (box.hasClass('autoSize')) {
					autoSizeBoxCouunt++;
				} else {
					autoSizeBoxAreaWH -= box[outerW_H](true);
				}
			});

			if (autoSizeBoxCouunt) {
				var autoSizeBoxWH = autoSizeBoxAreaWH / autoSizeBoxCouunt;
				boxArray.each(function(index, domEle) {
					var box = $(this);
					if (box.hasClass('autoSize')) {
						that._setOuterSize(box, w_h, autoSizeBoxWH);
					}
				});
			}

			this.refresh();
		},

		refresh: function() {
			var root = this._root = $(this.rootElement);
			var type = this._type;
			var w_h = this._w_h;

			//ボックス間に区切り線がない場合は挿入
			root.children(':not(.divider) + :not(.divider)').each(function() {
				$(this).before('<div class="divider"></div>');
			});

			//主に、新たに配置した区切り線とその前後のボックスの設定(既存も調整)
			this.$find('> .divider').each(function() {
				var divider = $(this);
				var prev = divider.prev();
				var next = divider.next();
				//prev[w_h](prev[w_h]());
				//next[w_h](next[w_h]());

				var nextZIndex = next.css('z-index');
				if (!nextZIndex || nextZIndex == 'auto')
					nextZIndex = 0;

				divider.css({
					cursor: (type == 'x') ? 'col-resize' : 'row-resize',
					top: (type == 'y') ? prev.position().top + prev.outerHeight(true) : 0,
					left: (type == 'x') ? prev.position().left + prev.outerWidth(true) : 0,
					position: 'absolute',
					'z-index': nextZIndex + 1
				});
				next.css({
					top: divider.position().top + (type == 'y' ? divider.outerHeight(true) : 0),
					left: divider.position().left + (type == 'x' ? divider.outerWidth(true) : 0),
					position: 'absolute'
				});
				var dividerHandler = divider.find('.dividerHandler');
				if (dividerHandler.length == 0) {
					divider.append('<div style="height:50%;"></div>');
					dividerHandler = $('<div class="dividerHandler"></div>');
					divider.append(dividerHandler);
				}
				dividerHandler.css({
					'margin-top': -dividerHandler.height() / 2
				});
				if (type == 'y') {
					dividerHandler.css({
						'margin-left': 'auto',
						'margin-right': 'auto'
					});
				} else {
					dividerHandler.css({
						'margin-left': (divider.width() - dividerHandler.outerWidth()) / 2
					});
				}
			});

			//以上の配置を元にルート要素サイズに合わせて再配置
			this._adjust();
		},

		insert: function(index, box) {
			var root = this._root;
			var type = this._type;
			var l_t = this._l_t;
			var t_l = l_t == 'left' ? 'top' : 'left';
			var w_h = this._w_h;
			var outerW_H = this._outerW_H;

			var target = root.children(':not(.divider)').eq(index);
			var divider = $('<div class="divider"></div>');

			box = $(box);

			target.after(box);
			target.after(divider);

			var targetWH = target[w_h](true) - divider[outerW_H](true) - box[outerW_H](true);

			var mbpSize = this._getMBPSize(target, w_h);
			if (targetWH <= mbpSize)
				targetWH = mbpSize + 1;
			this._setOuterSize(target, w_h, targetWH);
			//jQueryが古いと以下のようにする必要があるかもしれない。1.8.3だと以下で動作しない。何かのオブジェクトが返ってくる。
			//divider.css(l_t, target.position()[l_t] + target[outerW_H]({margin:true}));
			divider.css(l_t, target.position()[l_t] + target[outerW_H](true));
			divider.css(t_l, divider.position()[t_l]);
			divider.css('position', 'absolute');
			divider.css('cursor', (type == 'x') ? 'col-resize' : 'row-resize');

			box.css(l_t, divider.position()[l_t] + divider[outerW_H](true));
			box.css(t_l, 0);
			box.css('position', 'absolute');

			var next = box.next();
			var distance = 0;
			if (next.length > 0) {
				distance = next.position()[l_t] - box.position()[l_t];
			} else {
				distance = root[w_h]() - box.position()[l_t];
			}
			var boxOuterWH = box[outerW_H](true);
			if (distance < boxOuterWH) {
				this._setOuterSize(box, w_h, distance);
			}

			var dividerHandler = $('<div class="dividerHandler"></div>');
			divider.append('<div style="height:50%;"></div>');
			dividerHandler = $('<div class="dividerHandler"></div>');
			divider.append(dividerHandler);
			dividerHandler.css({
				'margin-top': -dividerHandler.height() / 2
			});
			if (type == 'y') {
				dividerHandler.css({
					'margin-left': 'auto',
					'margin-right': 'auto'
				});
			} else {
				dividerHandler.css({
					'margin-left': (divider.width() - dividerHandler.width()) / 2
				});
			}

			this._triggerBoxSizeChange();
		},

		minimize: function(index, opt) {
			this.resize(index, 0, opt);
		},
		maximize: function(index, opt) {
			this.resize(index, Infinity, opt);
		},

		normalize: function(index, opt) {
			this.resize(index, null, opt);
		},

		hide: function(index, opt) {
			opt = $.extend(opt, {
				hideDivider: true
			});
			this.resize(index, 0, opt);
		},

		resize: function(index, size, opt) {
			// TODO 右を基準、左を基準、、パーセンテージで基準位置など指定できるようにする
			// (= 左右のdividerをどれくらい動かすかの指定)
			var opt = opt || {};
			var fixNext = opt.fixNext;

			var l_t = this._l_t;
			var w_h = this._w_h;
			var outerW_H = this._outerW_H;
			var scrollW_H = this._triggerBoxSizeChange()

			var $targetBox = this.$find('> :not(.divider)').eq(index);
			if (size == null) {
				// nullの場合は中身の要素を設定
				// 中身がはみ出ている場合はscrollWidth|Heigthで取得できる
				// 中身が小さい場合は取得できないが、StateBoxの場合は取得できる

				// FIXME StateBoxが子コントローラだった場合はgetControllers()で取得できないので、data属性を使って取得
				var stateBox = $targetBox.data('h5controller-statebox-instance');
				if (stateBox.getContentsSize) {
					size = stateBox.getContentsSize()[w_h];
				} else {
					size = $targetBox[0][this._scrollW_H]();
				}
			}

			// 右または下側固定なら次のdivider、そうでないなら前のdividerを動かす
			// そもそも片方にしかdividerが無い場合はfixNextに関係なくその1つのdividerを動かす
			var $prevDivider = $targetBox.prev();
			var $nextDivider = $targetBox.next();
			var $divider = fixNext ? ($prevDivider.length ? $prevDivider : $nextDivider)
					: ($nextDivider.length ? $nextDivider : $prevDivider);
			var isNext = false;
			if ($divider[0] === $nextDivider[0]) {
				isNext = true;
			}
			var $prev = $divider.prev();
			var $next = $divider.next();
			var lastPos = $divider.position();
			var prevStart = $prev.position()[l_t];
			var nextEnd = $next.position()[l_t] + $next[outerW_H](true) - $divider[outerW_H](true);
			var move = (isNext ? 1 : -1) * (size - $targetBox[outerW_H]());

			this._move(move, $divider, prevStart, nextEnd, lastPos);
			var dviderWH = 0;
			if (opt.hideDivider) {
				dviderWH = (isNext ? 1 : -1) * $divider[this._outerW_H]();
				$divider.css('display', 'none');
			} else {
				$divider.css('display', 'block');
			}
			$divider.next().css(this._l_t, '-=' + dviderWH);
		},

		'> .divider h5trackstart': function(context) {
			var l_t = this._l_t;
			var w_h = this._w_h;
			var outerW_H = this._outerW_H;

			var divider = $(context.event.currentTarget);
			var prev = divider.prev();
			var next = divider.next();
			this._lastPos = divider.position();
			this._prevStart = prev.position()[l_t];
			this._nextEnd = next.position()[l_t] + next[outerW_H](true) - divider[outerW_H](true);
		},

		'> .divider h5trackmove': function(context) {
			context.event.preventDefault();
			var divider = $(context.event.currentTarget);
			var l_t = this._l_t;
			var move = (l_t == 'left') ? context.event.dx : context.event.dy;
			if (move == 0)
				return;
			this._move(move, divider, this._prevStart, this._nextEnd, this._lastPos, true);
			this._lastPos = divider.position();
		},

		_move: function(move, divider, prevStart, nextEnd, lastPos, isTrack) {
			if (move == 0)
				return;
			var l_t = this._l_t;
			var w_h = this._w_h;
			var prev = divider.prev();
			var next = divider.next();
			var moved = lastPos[l_t] + move;
			//要検証。+1しないと親要素外にドラッグできてしまう。
			if (moved <= prevStart + 1) {
				move = prevStart - lastPos[l_t];
				if (move <= -1 && isTrack)
					return;
			} else if (moved >= nextEnd - 1) {
				move = nextEnd - lastPos[l_t];
				if (move >= 1 && isTrack) {
					return;
					;
				}
			}

			moved = lastPos[l_t] + move;

			var prevWH = prev[w_h]() + move;
			if (prevWH < 0) {
				prevWH = 0;
				move = -prev[w_h]();
			}

			var nextWH = next[w_h]() - move;
			if (nextWH < 0)
				nextWH = 0;

			divider.css(l_t, moved);
			next[w_h](nextWH);
			prev[w_h](prevWH);
			next.css(l_t, '+=' + move);

			this._triggerBoxSizeChange();
		},

		'> .divider h5trackend': function(context) {
			this._lastPos = null;
			this._prevStart = null;
			this._nextEnd = null;
		},

		_adjust: function() {
			var l_t = this._l_t;
			var w_h = this._w_h;
			var root = this._root;
			var outerW_H = this._outerW_H;
			var that = this;
			var dividerArray = this.$find('> .divider');

			var adjustAreaWH = root[w_h]();

			dividerArray.each(function(index, domEle) {
				var divider = $(this);
				var prev = divider.prev();
				var next = divider.next();

				var dividerLT = divider.position()[l_t];
				var per = dividerLT / that._lastAdjustAreaWH;
				var nextDivideLT = Math.round(adjustAreaWH * per);
				var move = nextDivideLT - dividerLT;

				divider.css(l_t, '+=' + move);
				next.css(l_t, (next.position()[l_t] + move));
			});

			var boxArray = this.$find('> :not(.divider)');
			boxArray.each(function(index, domEle) {
				var box = $(this);
				var prev = box.prev();
				var next = box.next();
				var outerSize = 0;
				if (index == 0) {
					outerSize = next.position()[l_t];
				} else if (index == boxArray.length - 1) {
					outerSize = adjustAreaWH - (prev.position()[l_t] + prev[outerW_H](true));
				} else {
					outerSize = next.position()[l_t]
							- (prev.position()[l_t] + prev[outerW_H](true));
				}
				that._setOuterSize(box, w_h, outerSize);
			});

			this._lastAdjustAreaWH = adjustAreaWH;
		},

		_setOuterSize: function(element, w_h, outerSize) {
			element[w_h](outerSize - this._getMBPSize(element, w_h));
		},

		_getMBPSize: function(element, w_h) {
			var outerW_H = w_h == 'width' ? 'outerWidth' : 'outerHeight';
			return element[outerW_H](true) - element[w_h]();
		},

		//prototype.js v1.5.0 より
		_cleanWhitespace: function(element) {
			var node = element.firstChild;
			while (node) {
				var nextNode = node.nextSibling;
				if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
					element.removeChild(node);
				node = nextNode;
			}
			return element;
		},

		_triggerBoxSizeChange: function() {
			this.$find('> :not(.divider)').each(function() {
				$(this).trigger('boxSizeChange');
			});
		}
	};

	h5.core.expose(dividedBoxController);
})();