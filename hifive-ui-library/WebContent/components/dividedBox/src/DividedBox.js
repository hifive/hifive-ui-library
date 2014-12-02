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
	/** データ属性名：ボックスが隠れているかどうか */
	var DATA_HIDDEN = 'dividedbox-boxhidden';

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
			this.$find('> .divider').each(
					this.ownWithOrg(function(orgThis) {
						var $divider = $(orgThis);
						var isVisibleDivider = $divider.css('display') !== 'none';
						var $prev = this._getPrevBoxByDivider($divider);
						var $next = this._getNextBoxByDivider($divider);

						//prev[w_h](prev[w_h]());
						//next[w_h](next[w_h]());

						var nextZIndex = $next.css('z-index');
						if (!nextZIndex || nextZIndex == 'auto') {
							nextZIndex = 0;
						}

						// dividerの位置調整
						var dividerTop = (type == 'y' && $prev.length) ? $prev.position().top
								+ $prev.outerHeight(true) : 0;
						var dividerLeft = (type == 'x' && $prev.length) ? $prev.position().left
								+ $prev.outerWidth(true) : 0;
						if (isVisibleDivider) {
							$divider.css({
								cursor: (type == 'x') ? 'col-resize' : 'row-resize',
								top: dividerTop,
								left: dividerLeft,
								position: 'absolute',
								'z-index': nextZIndex + 1
							});
						}
						var nextTop = (type == 'y') ? dividerTop
								+ (isVisibleDivider ? $divider.outerHeight(true) : 0) : 0;
						var nextLeft = (type == 'x') ? dividerLeft
								+ (isVisibleDivider ? $divider.outerWidth(true) : 0) : 0;
						// dividerの次の要素の調整
						$next.css({
							top: nextTop,
							left: nextLeft,
							position: 'absolute'
						});
						var dividerHandler = $divider.find('.dividerHandler');
						if (dividerHandler.length == 0) {
							$divider.append('<div style="height:50%;"></div>');
							dividerHandler = $('<div class="dividerHandler"></div>');
							$divider.append(dividerHandler);
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
								'margin-left': ($divider.width() - dividerHandler.outerWidth()) / 2
							});
						}
					}));

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
			this.resize(index, $(this.rootElement)[this._w_h](), $.extend({}, opt, {
				partition: 0.5
			}));
		},

		fitToContents: function(index, opt) {
			this.resize(index, null, opt);
		},

		show: function(index, opt) {
			// hide状態のボックスを表示
			var $box = this.getBoxByIndex(index);
			if (!$box.length || !$box.data(DATA_HIDDEN)) {
				return;
			}
			$box.data(DATA_HIDDEN, false);
			// 指定されたindexのボックスの両隣のdividerを表示する
			var $prevDivider = this._getPrevDividerByBox($box);
			var $nextDivider = this._getNextDividerByBox($box);
			if ($prevDivider.length) {
				this.showDivider($prevDivider);
			} else if ($nextDivider.length) {
				this.showDivider($nextDivider, true);
			}

			// コンテンツの大きさにリサイズ
			this.fitToContents(index, opt);
		},

		hide: function(index, opt) {
			var $box = this.getBoxByIndex(index);
			if (!$box.length) {
				return;
			}
			// 指定されたindexのボックスのどちらか片方のdividerを非表示にする
			// 両側にdividerのあるboxの場合、残ったdividerは隠されたboxを無視して動作するdividerとして動作する
			var $prevDivider = this._getPrevDividerByBox($box);
			var $nextDivider = this._getNextDividerByBox($box);
			if ($prevDivider.length) {
				this.hideDivider($prevDivider);
			} else if ($nextDivider) {
				this.hideDivider($nextDivider, true);
			}

			// 0にリサイズ
			this.resize(index, 0, opt);

			$box.data(DATA_HIDDEN, true);
		},

		/**
		 * 指定されたdividerを非表示にする
		 *
		 * @param {DOM|jQuery} divider要素
		 * @param {Boolean} [fixPrev=false]
		 *            dividerを非表示にするとき、divider分の幅をどちらのボックスで埋めるか。左(上)で埋める場合はtrueを指定。
		 */
		hideDivider: function(divider, fixPrev) {
			var $divider = $(divider);
			if ($divider.css('display') === 'none') {
				return;
			}
			var w_h = this._w_h;
			var l_t = this._l_t;
			var dividerWH = $divider[w_h]();
			$divider.css('display', 'none');
			if (fixPrev) {
				var $prevBox = this._getPrevBoxByDivider($divider);
				$prevBox.css(w_h, '+=' + (dividerWH));
			} else {
				var $nextBox = this._getNextBoxByDivider($divider);
				$nextBox.css(l_t, '-=' + (dividerWH));
				$nextBox.css(w_h, '+=' + (dividerWH));
			}
		},

		/**
		 * 指定されたdividerを表示する
		 *
		 * @param {DOM|jQuery} divider要素
		 * @param {Boolean} [fixPrev=false]
		 *            dividerを表示するとき、divider分の幅をどちらのボックスがずらすか。左(上)をずらす場合はtrueを指定。
		 */
		showDivider: function(divider, fixPrev) {
			var $divider = $(divider);
			if ($divider.css('display') === 'block') {
				return;
			}
			$divider.css('display', 'block');
			this.refresh();
		},

		/**
		 * 引数に指定されたindexに対応するボックス要素を返します
		 *
		 * @param {Integer} index
		 * @returns {jQuery}
		 */
		getBoxByIndex: function(index) {
			return this.$find('> :not(.divider)').eq(index);
		},

		/**
		 * ボックスのサイズ変更を行います
		 *
		 * @param {Integer} index 何番目のボックスか
		 * @param {Integer} size リサイズするサイズ
		 * @param {Object} opt リサイズオプション
		 * @param {Number} [opt.partition=0]
		 *            <p>
		 *            左右(上下)にdividerがある場合、resize時に左右(上下)のdividerが動く割合を0.0～1.0を指定します。
		 *            </p>
		 *            <p>
		 *            0.0を指定した場合(デフォルト)は左(上)のdividerを固定して右(下)のdividerの位置が変更されます。
		 *            </p>
		 *            <p>
		 *            左右(上下)のどちらかにしかdividerが無い場合はこのオプションは無視されてresize時に位置が変更されるdividerは自動で決定されます。
		 *            </p>
		 */
		resize: function(index, size, opt) {
			var opt = opt || {};
			var partition = parseFloat(opt.partition) || 0;

			var l_t = this._l_t;
			var w_h = this._w_h;
			var outerW_H = this._outerW_H;
			var scrollW_H = this._triggerBoxSizeChange();

			var $targetBox = this.getBoxByIndex(index);

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

			// partitionに合わせて両サイドのdividerを動かす
			// dividerがそもそも片方にしか無い場合はpartitionに関係なくその1つのdividerを動かす
			var $prevDivider = this._getPrevDividerByBox($targetBox);
			var $nextDivider = this._getNextDividerByBox($targetBox);

			var totalMove = size - $targetBox[outerW_H]();
			if (!$prevDivider.length) {
				partition = 0;
			} else if (!$nextDivider.length) {
				partition = 1;
			}
			var prevMove = -totalMove * partition;
			var nextMove = totalMove + prevMove;

			if (prevMove) {
				this._move(prevMove, $prevDivider);
			}
			if (nextMove) {
				this._move(nextMove, $nextDivider);
			}
		},

		'> .divider h5trackstart': function(context) {
			var l_t = this._l_t;
			var outerW_H = this._outerW_H;

			var divider = $(context.event.currentTarget);
			var prev = this._getPrevBoxByDivider(divider);
			var next = this._getNextBoxByDivider(divider);
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
			if (move == 0) {
				return;
			}
			var $divider = $(divider);
			var l_t = this._l_t;
			var w_h = this._w_h;
			var outerW_H = this._outerW_H;
			var $prev = this._getPrevBoxByDivider($divider);
			var $next = this._getNextBoxByDivider($divider);
			if (prevStart == null) {
				// 第3引数が未指定ならprevStart,nextEnd,lastPosはdividerから計算する
				// (トラック操作の場合はキャッシュしてある値を渡しているので計算する必要はない)
				var isVisibleDivider = $divider.css('display') === 'block';
				if (isVisibleDivider) {
					lastPos = $divider.position();
				} else {
					// 非表示の場合はboxの位置を基にする
					lastPos = $next.position();
				}
				prevStart = $prev.length ? $prev.position()[l_t] : $divider.position()[l_t];
				nextEnd = $next.length ? ($next.position()[l_t] + $next[outerW_H](true) - (isVisibleDivider ? $divider[outerW_H]
						(true)
						: 0))
						: $divider.position()[l_t];
			}
			var moved = lastPos[l_t] + move;
			if (moved <= prevStart + 1) {
				move = prevStart - lastPos[l_t];
				if (move <= -1 && isTrack)
					return;
			} else if (moved >= nextEnd - 1) {
				move = nextEnd - lastPos[l_t];
				if (move >= 1 && isTrack) {
					return;
				}
			}

			moved = lastPos[l_t] + move;

			var prevWH = $prev[w_h]() + move;
			if (prevWH < 0) {
				prevWH = 0;
				move = -$prev[w_h]();
			}

			var nextWH = $next[w_h]() - move;
			if (nextWH < 0) {
				nextWH = 0;
			}

			$divider.css(l_t, moved);
			$next[w_h](nextWH);
			$prev[w_h](prevWH);
			$next.css(l_t, '+=' + move);

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
			var $dividers = this.$find('> .divider');

			var adjustAreaWH = root[w_h]();

			$dividers.each(this.ownWithOrg(function(orgThis) {
				var $divider = $(orgThis);
				if ($divider.css('display') === 'none') {
					return;
				}
				var $next = this._getNextBoxByDivider($divider);

				var dividerLT = $divider.position()[l_t];
				var per = dividerLT / this._lastAdjustAreaWH;
				var nextDivideLT = Math.round(adjustAreaWH * per);
				var move = nextDivideLT - dividerLT;

				$divider.css(l_t, '+=' + move);
				$next.css(l_t, ($next.position()[l_t] + move));
			}));

			var $boxes = this.$find('> :not(.divider)');
			$boxes.each(this.ownWithOrg(function(orgThis, index) {
				var $box = $(orgThis);
				if ($box.data(DATA_HIDDEN)) {
					return;
				}
				var $prev = this._getPrevDividerByBox($box);
				var $next = this._getNextDividerByBox($box);
				var outerSize = 0;
				if (!$prev.length) {
					outerSize = $next.position()[l_t];
				} else if (!$next.length) {
					outerSize = adjustAreaWH - ($prev.position()[l_t] + $prev[outerW_H](true));
				} else {
					outerSize = $next.position()[l_t]
							- ($prev.position()[l_t] + $prev[outerW_H](true));
				}
				this._setOuterSize($box, w_h, outerSize);
			}));

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
		},

		_getPrevBoxByDivider: function(divider) {
			var $divider = $(divider);
			var $box = $divider.prev();
			// hidden状態ならその前のboxを返す。
			// 無い場合は空のjQueryオブジェクトを返す
			if ($box.length && $box.data(DATA_HIDDEN)) {
				return this._getPrevBoxByDivider($box.prev());
			}
			return $box;
		},
		_getNextBoxByDivider: function(divider) {
			var $divider = $(divider);
			var $box = $divider.next();
			// hidden状態ならその次のboxを返す。
			// 無い場合は空のjQueryオブジェクトを返す
			if ($box.length && $box.data(DATA_HIDDEN)) {
				return this._getNextBoxByDivider($box.next());
			}
			return $box;
		},
		_getPrevDividerByBox: function(box) {
			var $box = $(box);
			var $divider = $box.prev();
			// dividerの前のボックスがhiddenかつそのボックスが先頭要素なら
			// dividerは無効なので空jQueryを返す
			if ($divider.length && !$divider.prev().prev().length
					&& $divider.prev().data(DATA_HIDDEN)) {
				return $();
			}
			return $divider;
		},
		_getNextDividerByBox: function(box) {
			var $box = $(box);
			var $divider = $box.next();
			// 次のボックスがhiddenならその次のdividerを返す
			if ($divider.length && $divider.next().data(DATA_HIDDEN)) {
				return this._getNextDividerByBox($divider.next());
			}
			return $divider;
		}
	};

	h5.core.expose(dividedBoxController);
})();