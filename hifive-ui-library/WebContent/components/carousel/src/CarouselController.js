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
/***************************************************************************************************
 * h5.ui.components.carousel.CarouselController
 **************************************************************************************************/
(function($) {
	// =========================================================================
	//
	// 外部定義のインクルード
	//
	// =========================================================================

	// =========================================================================
	//
	// スコープ内定数
	//
	// =========================================================================

	// =========================================================================
	//
	// スコープ内静的プロパティ
	//
	// =========================================================================

	// =============================
	// スコープ内静的変数
	// =============================

	// =============================
	// スコープ内静的関数
	// =============================
	/**
	 * cssのプロパティキーにベンダープレフィックスを追加 animate.jsからコピペ
	 */
	function addVenderPrefix(css, key, isOverride) {
		var _css = (isOverride) ? css : $.extend(true, {}, css);
		if (key) {
			if (typeof key == 'string') {
				key = [key];
			}
			$.each(key, function() {
				if (this in css) {
					_css['-moz-' + this] = css[this];
					_css['-webkit-' + this] = css[this];
					_css['-o-' + this] = css[this];
					_css['-ms-' + this] = css[this];
				}
			});
		} else {
			for ( var i in css) {
				_css['-moz-' + i] = css[i];
				_css['-webkit-' + i] = css[i];
				_css['-o-' + i] = css[i];
				_css['-ms-' + i] = css[i];
			}
		}
		return _css;
	}

	/**
	 * requestAnimationFrame
	 */
	var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
			|| function(func) {
				window.setTimeout(func, 15);
			};

	// =========================================================================
	//
	// メインコード（コントローラ・ロジック等）
	//
	// =========================================================================
	/**
	 * ループするカルーセル部品
	 *
	 * @class
	 * @name h5.ui.components.carousel.CarouselController
	 */
	var loopCarouselController = {
		/**
		 * @memberOf h5.ui.components.carousel.CarouselController
		 */
		__name: 'h5.ui.components.carousel.CarouselController',

		/**
		 * スクロールするDOM要素
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @type {jQuery}
		 */
		_$scrollingBase: null,

		/**
		 * スクロール方向(horizontal||vertical デフォルトhorizontal)
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @type {String}
		 */
		type: 'horizontal',

		/**
		 * 位置についてのcssプロパティ。leftまたはtop。
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @type {String}
		 */
		_l_t: 'left',

		/**
		 * 大きさについてのcssプロパティ。WidthまたはHeight。
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @type {String}
		 */
		_W_H: 'Width',

		/**
		 * アイテム要素1つのスクロール方向のサイズ(幅または高さ。デフォルト120)
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 */
		_itemSize: 120,

		/**
		 * スクロールしたかどうか。trackend時に分かるようにフラグ管理。
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @type {Boolean}
		 */
		_isMoved: false,

		/**
		 * カルーセル上に配置するアイテムの表示数
		 * <p>
		 * 足りない場合は繰り返し配置する。
		 * </p>
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 */
		_visibleItemsNum: 12,

		/**
		 * スクロールを止めるフラグ
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 */
		_scrollStopFlag: false,

		/**
		 * カルーセルの左端の位置
		 */
		_startPos: 0,

		/**
		 * 繰り返しでないオリジナルのアイテムに持たせる番号
		 * <p>
		 * アイテムが右(上)に追加されるたびにアイテムにこの値を持たせてインクリメントする
		 * </p>
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 */
		_lastIndex: 0,

		/**
		 * 繰り返しでないオリジナルのアイテムに持たせる番号
		 * <p>
		 * アイテムが左(下)に追加されるたびにこの値をデクリメントしてアイテムに持たせる
		 * </p>
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 */
		_firstIndex: 0,

		/**
		 * アイテムに振るID
		 */
		_seq: 0,

		/**
		 * 空になった時に表示する要素
		 */
		_$emptyGuide: null,

		/**
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param context
		 */
		__construct: function(context) {
			// 初期設定
			var option = context.args;
			this.type = (option && option.type) || this.type;
			this._l_t = this.type == 'horizontal' ? 'left' : 'top';
			this._W_H = this.type == 'horizontal' ? 'Width' : 'Height';
			this._itemSize = (option && option.itemSize) || this._itemSize;
			this._visibleItemsNum = (option && option.minItemsNum) || this._visibleItemsNum;
		},
		/**
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param context
		 */
		__ready: function(context) {
			// 初期設定
			var $root = $(this.rootElement);
			// カルーセル部分のスタイル
			var style = {
				overflow: 'hidden'
			};
			//			style[this.type == 'horizontal' ? 'height' : 'width'] = '100%';
			//			$root.css(style);

			// scrollingBaseの追加
			var _$scrollingBase = $('<div class="scrollingBase"></div>');
			_$scrollingBase.css({
				display: 'block',
				height: '100%',
				width: '100%',
				position: 'relative',
				top: 0,
				left: 0
			});

			// IE7用
			$root.css('position', 'relative');

			// 要素が空の時に表示するガイドがあればそれを取得
			var $emptyGuide = this.$find('.empty-guide');
			if ($emptyGuide.length) {
				this._$emptyGuide = $emptyGuide.clone();
				// scrollingBaseを追加するのでいったん削除
				$emptyGuide.remove();
			}

			// scrollingBaseを追加する前に元あった要素を取得
			var $items = $root.children();

			// scrollingBaseの追加
			$root.append(_$scrollingBase);
			this._$scrollingBase = _$scrollingBase;

			// カルーセルの左端の位置を計算
			this._startPos = -this._itemSize * (parseInt(this._visibleItemsNum / 2) - 0.5)
					+ $(this.rootElement)['inner' + this._W_H]() / 2;

			// DOMに記述されている子要素はアイテム化して、元のは消す
			var $clone = $items.clone();
			if ($clone.length) {
				this.appendItem($clone);
			} else {
				if (this._$emptyGuide) {
					// scrollingBaseの上に置かれるようにスタイル調整
					this._$emptyGuide.css({
						position: 'absolute',
						top: 0,
						left: 0
					});
					$(this.rootElement).append(this._$emptyGuide);
				}
			}
			$items.remove();
		},

		/**
		 * アイテムの右(上)端の位置
		 */
		_getLastPos: function() {
			var $last = this._$scrollingBase.find('.carousel-item-wrapper:last');
			return $last.length ? parseInt($last.css(this._l_t)) + this._itemSize : this._startPos;
		},

		/**
		 * アイテムの左(下)端の位置
		 */
		_getFirstPos: function() {
			var $first = this._$scrollingBase.find('.carousel-item-wrapper:first');
			return $first.length ? parseInt($first.css(this._l_t)) : this._startPos;
		},

		/**
		 * 現在繰り返し配置されているものを削除
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 */
		_removeRepeatItems: function() {
			// オリジナル要素がリピート要素によって分断されている場合、左(上)側に移動する
			var $scrollingBase = this._$scrollingBase;
			var $items = $scrollingBase.children();
			var $first = $items.eq(0);
			var $last = $items.eq(-1);
			var $repeatItems = $items.filter('.carousel-repeat');
			if ($repeatItems.length && !$first.hasClass('carousel-repeat')
					&& !$last.hasClass('carousel-repeat')) {
				while (!$last.hasClass('carousel-repeat')) {
					$last.css(this._l_t, this._getFirstPos() - this._itemSize);
					$scrollingBase.prepend($last);
					$last = $scrollingBase.children().eq(-1);
				}
			}

			// 削除
			$repeatItems.remove();
		},

		/**
		 * 現在保持しているアイテムが、最低アイテム数未満であれば、繰り返し配置する。このメソッドを呼んだ時点で配置されているものを繰り返し配置する。
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 */
		_itemRepeatRefresh: function() {
			var $scrollingBase = this._$scrollingBase;
			var $items = $scrollingBase.children();
			if (!$items.length || ($items.length > this._visibleItemsNum)
					|| $items.contents('.carousel-repeat').length) {
				// 一つもアイテムがないまたは既に表示数だけあるまたはリピート用アイテムが配置済み場合はなにもしない
				// リピートが配置されているときはすでに表示数分繰り返されている(またはその配置途中)。
				return;
			}

			// 現在繰り返し配置されているものを削除
			this._removeRepeatItems();

			// アイテムが表示数を超えるまで繰り返し要素の生成
			var $repeats = $();
			while ($scrollingBase.children().length + $repeats.length < this._visibleItemsNum) {
				var $clone = $items.clone();
				$clone.addClass('carousel-repeat');
				// コピー元のitem-idを持たせる
				$items.each(function(i) {
					$clone.eq(i).data('item-id', $items.eq(i).data('item-id'));
				});
				$repeats = $repeats.add($clone);
			}

			// 繰り返し要素を追加していく
			// append先が可視範囲外ならprependして追加する
			var prepend = false;
			while ($repeats.length) {
				var $target;
				if (prepend
						|| !this._isVisible(parseInt($scrollingBase.children().eq(-1)
								.css(this._l_t))
								+ this._itemSize)) {
					prepend = true;
					$target = $repeats.eq(-1);
					$repeats.splice($repeats.length - 1, 1);
				} else {
					$target = $repeats.eq(0);
					$repeats.splice(0, 1);
				}
				this._addItem($target, prepend, true);
			}
		},

		/**
		 * 表示されているアイテムのサイズ等を更新する
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 */
		_itemViewRefresh: function(isMinusScroll) {
			if (!this._$scrollingBase.children().length) {
				return;
			}
			if (isMinusScroll == null) {
				// スクロール方向の指定がない場合は両方
				this._itemViewRefresh(true);
				this._itemViewRefresh(false);
				return;
			}
			// 右(下)への移動なら可視範囲左(上)端、左(上)への移動なら可視範囲右(上)端に見えているアイテム要素を取得する
			// もし取得できない(=要素がない)なら反対端のものと差し替える。
			// 1度にアイテムの大きさ以上のスクロールが起きたら、その分差し替えないといけないので端がアイテム要素になるまでループする。
			var $item;
			while (!($item = this._getVisibleStartOrEndItem(isMinusScroll))) {
				// 端に何も要素がないなら要素を動的に追加
				$item = $('<div class="carousel-item-wrapper"></div>');
				this._addItem($item, !isMinusScroll, true, true);
				// ダミー要素が端にあるなら中身を反対端のものに差し替える
				var $replaceTaget = null;
				var itemLT = isMinusScroll ? Infinity : -Infinity;
				var l_t = this._l_t;
				this._$scrollingBase.find('.carousel-item-wrapper:not(.dummy)').each(function() {
					var lt = parseInt($(this).css(l_t));
					if (isMinusScroll && lt < itemLT || !isMinusScroll && lt > itemLT) {
						itemLT = lt;
						$replaceTaget = $(this);
					}
				});
				$item.children().remove();
				$item.append($replaceTaget.children());
				$item.addClass($replaceTaget.attr('class'));
				$item.attr('data-item-id', $replaceTaget.attr('data-item-id'));

				$replaceTaget.remove();
			}
		},

		/**
		 * アイテムの大きさ、位置を更新
		 * <p>
		 * 真ん中に近ければ近いほど大きくし、横幅を詰める
		 * </p>
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 */
		_itemTransFormRefresh: function() {
			// 真ん中を大きく、端を小さくする
			var l_t = this._l_t;
			var W_H = this._W_H;
			var viewWH = $(this._$scrollingBase)['inner' + W_H]();
			var itemSize = this._itemSize;
			var scrollLT = parseInt(this._$scrollingBase.css(l_t));
			var that = this;
			this._$scrollingBase.children().each(
					function() {
						var $this = $(this);
						// 可視範囲外なら何もしない
						if (!that._isVisible(parseInt($this.css(l_t)))) {
							return;
						}
						// アイテムの真ん中の位置
						var itemViewPos = scrollLT + parseInt($this.css(l_t)) + itemSize / 2;

						// 可視範囲真ん中からの距離
						var distFromCenter = Math.abs(viewWH / 2 - itemViewPos);
						// 拡大率
						var scale = 1 - distFromCenter / viewWH;
						// 0.1以下は見えなくする(scale=0にする)
						scale = scale < 0.1 ? 0 : scale;
						// 透明度の設定
						var opacity = scale ? Math.min(1, (scale * 2 - 0.1)) : 0;
						// 横を詰める
						var transDist = scale ? ((itemViewPos > viewWH / 2 ? -1 : 1) * (1 - scale)
								* (1 - scale) * viewWH / 2) : 0;
						var styleObj = $.extend({
							opacity: opacity
						}, addVenderPrefix({
							transform: h5.u.str
									.format('matrix({0},0,0,{0},{1})', scale,
											this.type == 'horizontal' ? '0,' + transDist
													: transDist + ',0')
						}));
						$(this).css(styleObj);
					});
		},

		/**
		 * アイテムを後ろに追加
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param elm
		 */
		appendItem: function(elm) {
			this._addItem(elm);
			this._itemViewRefresh();
		},
		/**
		 * アイテムを前に追加
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param elm
		 */
		prependItem: function(elm) {
			this._addItem(elm, true);
			this._itemViewRefresh();
		},

		/**
		 * アイテムを削除
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param elm DOM要素
		 */
		removeItem: function(elm) {
			// 繰り返し要素が渡された場合はそのオリジナルを消す
			var $elm = this._getOriginalItemElement(elm);


			// 繰り返し要素を削除
			this._removeRepeatItems();
			var l_t = this._l_t;
			var itemSize = this._itemSize;
			// 詰める
			this._$scrollingBase.children().each(function() {
				var targetPos = parseInt($(this).css(l_t));
				if (targetPos > parseInt($elm.css(l_t))) {
					// 削除対象要素より右(下)にある要素の位置を左(上)に詰める
					$(this).css(l_t, targetPos - itemSize);
				}
			});
			// 削除
			$elm.remove();
			if (!this._$scrollingBase.children().length) {
				// すべて削除されたとき
				if (this._$emptyGuide) {
					$(this.rootElement).append(this._$emptyGuide);
				}
				return;
			}
			this._itemRepeatRefresh();
			this._itemViewRefresh();
			this._itemTransFormRefresh();
		},

		/**
		 * 繰り返しのために生成された要素からオリジナルのアイテムを取得
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @returns jQueryObject
		 */
		_getOriginalItemElement: function(elm) {
			var id = $(elm).attr('data-item-id');
			return this._$scrollingBase.find('>[data-item-id="' + id + '"]:not(.carousel-repeat)');
		},

		/**
		 * 指定された数値をleft(上下スクロールの場合はtop)に指定した時に可視範囲に入るかどうかを返す
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 */
		_isVisible: function(lt) {
			// 可視範囲は要素が全て同じ大きさ(scaleが1)の場合よりも広くなる。
			// (scaleが全て1なら-itemSize～$scrollingBase.width()の範囲になる。)
			// (scaleを小さくして、真ん中に寄せているため、その外側も見えるようになる。)
			// ここではアイテムの大きさ3倍分大きく取っている。(3.5倍は3倍+アイテムの真ん中の位置にするための0.5))
			var abs_lt = lt + parseInt(this._$scrollingBase.css(this._l_t));
			return -3.5 * this._itemSize < abs_lt
					&& abs_lt < this._$scrollingBase['inner' + this._W_H]() + 3.5 * this._itemSize;
		},

		/**
		 * アイテムを追加する。アイテム追加前後で繰り返し要素についての処理を行うかどうかを第3引数で指定する
		 *
		 * @private
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param elm 追加する要素
		 * @param prepend trueなら前に追加
		 * @param forRepeat 繰り返し要素の配置かどうか
		 * @param forFill スクロール中に端に要素がないときの補てん時のための追加かどうか
		 * @returns
		 */
		_addItem: function(elm, prepend, forRepeat, forFill) {
			if (!elm || elm.length === 0) {
				return;
			}
			// 空の時に表示するものは削除
			this.$find('.empty-guide').remove();
			if (!forRepeat) {
				// リピートやダミーではなく、普通のアイテムの追加の場合は繰り返し要素を削除てから追加する
				// そうでない場合は、リピート用のアイテムを削除してから追加する
				this._removeRepeatItems();
			}
			var $elm = $(elm);
			for (var i = 0, len = $elm.length; i < len; i++) {
				// ラップされてなかったらラップする
				var $item = $elm.eq(i);
				if (!$item.hasClass('carousel-item-wrapper')) {
					$item = $('<div class="carousel-item-wrapper"></div>');
					$item.append($(elm)[i]);
				}

				// imgタグとaタグにunselectable="on"を指定(IE8-用)
				// 繰り返しの要素またはスクロール時の補てんであれば設定済み
				$item.find('a,img').attr('unselectable', 'on');

				// アイテムをカルーセルに追加する
				// アイテムはposition:absolute
				// 位置は、すでに配置済みのものの数を数えて、そのすぐ横または下に配置
				var style = {
					position: 'absolute'
				};
				// アイテムはすべて同じ大きさとして計算
				var l_t = this._l_t;
				if (prepend) {
					style[l_t] = this._getFirstPos() - this._itemSize;
				} else {
					style[l_t] = this._getLastPos();
				}
				// アイテムのスタイル決定
				$item.css(style);
				// アイテムの追加
				this._$scrollingBase[prepend ? 'prepend' : 'append']($item);
				if (!forRepeat && !forFill) {
					// 新たに追加された要素の場合はidを振る　
					$item.attr('data-item-id', this._createItemId());
				}

			}
			if (!forRepeat) {
				this._itemRepeatRefresh();
			}
			// トランスフォームのリフレッシュ
			if (!forFill) {
				this._itemTransFormRefresh();
			}
		},

		/**
		 * @memberOf h5.ui.components.carousel.CarouselController
		 */
		_createItemId: function() {
			return this._seq++;
		},

		/**
		 * isEndがtrueなら見えているアイテムの右(下)端のアイテム要素を返す。 falseなら見えているアイテムの左(上)端のアイテム要素を返す。
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 */
		_getVisibleStartOrEndItem: function(isEnd) {
			var _$scrollingBase = this._$scrollingBase;
			var l_t = this._l_t;
			var W_H = this._W_H;
			var itemSize = this._itemSize;
			var scrollingLT = parseInt(_$scrollingBase.css(l_t));
			// transformで中心に寄せているので0～rootElement.width(height)の外側も見えている。
			// 見えている位置は、見えているアイテムの数から計算する
			var pos = $(this.rootElement)['inner' + W_H]() / 2 + (isEnd ? 1 : -1) * this._itemSize
					* this._visibleItemsNum / 2;
			var ret = null;
			this._$scrollingBase.children().each(function() {
				var itemAbsPos = scrollingLT + parseInt($(this).css(l_t));
				if (pos <= itemAbsPos + itemSize && itemAbsPos <= pos) {
					ret = $(this);
					return false;
				}
			});
			return ret;
		},
		/**
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param context
		 */
		_h5trackstart: function(context) {
			context.event.preventDefault();
			this._isScrolling = true;
		},
		/**
		 * h5trackmoveから呼ばれた場合はcontextを引数にとる。メソッド呼び出しで数値を渡しても動作する。
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param context
		 */
		_h5trackmove: function(context) {
			context.event.preventDefault();
			this.scroll(context.event[this.type == 'horizontal' ? 'dx' : 'dy']);
		},

		scrollStart: function(forward) {
			var d = (forward ? 1 : -1) * 4;
			this._isScrolling = true;
			this._scrollStopFlag = false;
			var that = this;
			function doAnimation() {
				that._move(d);
				if (!that._scrollStopFlag) {
					requestAnimationFrame(doAnimation);
				} else {
					that._isScrolling = false;
				}
			}
			requestAnimationFrame(doAnimation);
		},

		scrollStop: function() {
			this._isMoved = false;
			this._scrollStopFlag = true;
		},

		_move: function(d) {
			var $base = this._$scrollingBase;
			if (!$base.children().length) {
				// アイテムがないなら何もしない
				return;
			}
			var style = {};
			style[this._l_t] = (parseFloat($base.css(this._l_t)) || 0) + d;
			$base.css(style);

			// 可視範囲に表示するものの更新
			this._itemViewRefresh(d < 0);
			// トランスフォーム更新
			this._itemTransFormRefresh();
		},

		scrollToByElm: function(elm, isAnimation) {
			var $elm = $(elm);
			// スクロールする距離を求める
			var d = (this._$scrollingBase['inner' + this._W_H]() - this._itemSize) / 2
					- parseInt($elm.css(this._l_t)) + parseInt(this._$scrollingBase.css(this._l_t));
			this.scroll(d, isAnimation);
			this._recalcPosition();
		},

		scroll: function(d, isAnimation) {
			if (!d) {
				// 0またはそれ以外のfalse相当の値なら何もしない
				return;
			}
			// アニメーション
			if (isAnimation) {
				function f(frame) {
					return d * (1 - Math.cos(0.2 * Math.PI / 2));
				}
				var scrolled = 0;
				var frame = 0;
				var that = this;
				function doAnimation() {
					var diff = f(frame++);
					scrolled += diff;
					that._move(diff);
					if (diff !== 0 && Math.abs(scrolled) < Math.abs(d)) {
						requestAnimationFrame(doAnimation);
					} else {
						that._recalcPosition();
					}
				}
				requestAnimationFrame(doAnimation);
				return;
			}
			this._move(d);
		},

		/**
		 * セレクタにマッチする要素のアイテムへ移動
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param selector
		 * @param isAnimation アニメーションを付けるかどうか
		 */
		scrollToMatchElement: function(selector, isAnimation) {
			var target = null;
			// セレクタにマッチする要素のうち、一番真ん中に近い要素を選択する
			var W_H = this._W_H;
			var l_t = this._l_t;
			var viewWH = $(this._$scrollingBase)['inner' + W_H]();
			var scrollLT = parseInt(this._$scrollingBase.css(l_t));
			var itemSize = this._itemSize;
			var minDist = Infinity;
			this._$scrollingBase.children().each(function() {
				var $this = $(this);
				if ($(this).children().filter(selector).length) {
					// アイテムの真ん中の位置
					var itemViewPos = scrollLT + parseInt($this.css(l_t)) + itemSize / 2;
					// 可視範囲真ん中からの距離
					var distFromCenter = Math.abs(viewWH / 2 - itemViewPos);
					if (minDist > distFromCenter) {
						minDist = distFromCenter;
						target = this;
					}
				}
			});
			if (target) {
				this.scrollToByElm(target, isAnimation);
			}
		},

		/**
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param context
		 */
		_h5trackend: function(context) {
			var that = this;

			// フラグを元に戻す。
			// trackend直後にclickのイベントが発火するので、ここですぐfalseにしてしまうとclick時にはフラグが無くなっている。
			// 動いたかどうかのフラグ(_isMoved)は非同期で元に戻して、clickのイベントハンドラで分かるようにしておく。
			this._isScrolling = false;
			setTimeout(function() {
				that._isMoved = false;
			}, 0);
			this._recalcPosition();
		},
		/**
		 * @memberOf h5.ui.components.carousel.CarouselController
		 */
		_recalcPosition: function() {
			var d = parseFloat(this._$scrollingBase.css(this._l_t));
			this._$scrollingBase.css(this._l_t, 0);
			var that = this;
			this._$scrollingBase.children().each(function() {
				var lt = parseFloat($(this).css(that._l_t));
				$(this).css(that._l_t, lt + d);
			});
		},
		/**
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param context
		 */
		'{rootElement} h5trackstart': function(context) {
			this._h5trackstart(context);
		},
		/**
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param context
		 */
		'{rootElement} h5trackmove': function(context) {
			// h5trackend時に動いたかどうか分かるようにしておく
			this._isMoved = true;
			this._h5trackmove(context);
		},
		/**
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param context
		 */
		'{rootElement} h5trackend': function(context, $el) {
			this._h5trackend(context);
		},
		/**
		 * スクロール中の画面遷移をキャンセル
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param context
		 */
		'a click': function(context) {
			// スクロール中、またはscrollend時に該当するスクロール操作でスクロールされた場合はpreventDefault()
			if (this._isScrolling || this._isMoved) {
				context.event.preventDefault();
			}
		},
		/**
		 * スクロール中の画面遷移をキャンセル
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param context
		 */
		'a mousestart': function(context) {
			context.event.preventDefault();
		},
		/**
		 * リンク遷移(タッチ用)
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param context
		 */
		'a touchend': function(context, $el) {
			if (!this._isScrolling && !this._isMoved) {
				location.href = $el.attr('href');
			}
		},
		/**
		 * リンク遷移(タッチ用)
		 *
		 * @memberOf h5.ui.components.carousel.CarouselController
		 * @param context
		 */
		'a mouseup': function(context, $el) {
			if (!this._isScrolling && !this._isMoved) {
				location.href = $el.attr('href');
			}
		}
	};

	// =========================================================================
	//
	// 外部公開
	//
	// =========================================================================
	h5.core.expose(loopCarouselController);
})(jQuery);