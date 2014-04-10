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
	var ScreenController = {
		/**
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		__name: 'h5.ui.components.screen.ScreenController',

		/**
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		_pageLoadLogic: h5.ui.PageLoadLogic,

		/**
		 * アニメーション中かどうか
		 *
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		_isAnimation: false,

		/**
		 * スクロールラッパー要素
		 *
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		_$scrollingBase: null,

		/**
		 * スクリーン幅
		 */
		_screenWidth: 0,

		/**
		 * ページ数
		 * <p>
		 * デフォルトではスライドされるたびに無限に要素を増やしていくが、ページ数が設定されている場合はその範囲で繰り返す。
		 * </p>
		 */
		numberOfPages: Infinity,

		/**
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		__ready: function() {
			// screen内に配置されているDOMをコンテンツとして設定
			var $contents = this.$find('>*');
			$contents.css({
				position: 'absolute',
				margin: 0,
				paddiong: 0,
				top: 0,
				display: 'none',
				width: '100%'
			}).addClass('h5screenContent');

			// コンテンツが最低3ページ以上になるようにする
			if ($contents.length === 0) {
				throw new Error('コンテンツは最低1ページは必要です');
			}
			// ページ数が2以下の場合は3ページ以上になるよう繰り返す
			if ($contents.length < 3) {
				// コンテンツにインデックスを振って、どれがどのクローンかわかるようにする
				$contents.each(function(i) {
					$(this).attr('data-h5screenCloneIndex', '' + i);
				});
				while (this.$find('>*').length < 3) {
					$(this.rootElement).append($contents.clone().addClass('clone'));
				}
				$contents = this.$find('>*');
			}

			// ページ数を設定
			this.numberOfPages = $contents.length;
			// 先頭のコンテンツをカレントとして設定
			var $current = $contents.eq(0);
			$current.addClass('current').css('display', 'block');

			// スクロール用のDOMを作成
			this._$scrollingBase = $('<div class="scrollingBase"></div>').css({
				display: 'block',
				left: 0,
				margin: 0,
				padding: 0,
				position: 'relative',
				height: $current.height(),
				overflowY: 'hidden'
			});
			this._$scrollingBase.append($contents);
			$(this.rootElement).css('overflow-x', 'hidden').append(this._$scrollingBase);
		},

		/**
		 * アニメーションをスタートする。
		 *
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		startAnimation: function() {
			if (this._isAnimation) {
				return;
			}
			// スクリーン幅を取得
			var screenWidth = $(this.rootElement).innerWidth();
			var $current = this.$find('.h5screenContent.current');
			// 左右にコンテンツが無ければ追加
			var $left = $current.prev();
			if (!$left.length) {
				// コンテンツ数がページ数を超えていれば、左側の要素は右端から持ってくる
				$left = this.$find('.h5screenContent:last');
				this._$scrollingBase.prepend($left);
			}
			var $right = $current.next();
			if (!$right.length) {
				// コンテンツ数がページ数を超えていれば、右側の要素は左端から持ってくる
				$right = this.$find('.h5screenContent:first');
				this._$scrollingBase.append($right);
			}
			// コンテンツ幅を固定にする
			$current.add($left).add($right).css('width', screenWidth);
			// scrollingBaseの幅をスクロールバーが出ないように設定
			this._$scrollingBase.css('width', screenWidth * 2);
			$left.css({
				left: -screenWidth,
				display: 'block'
			});
			$right.css({
				left: screenWidth,
				display: 'block'
			});
			// scrollingBaseの高さと、overflow:visibleを設定。
			this._$scrollingBase.css({
				height: Math.max($left.height(), $current.height(), $right.height()),
				overflow: 'visible'
			});
			this._isAnimation = true;
			$(this.rootElement).addClass('inOperation');
			this._animationDfd = h5.async.deferred();
		},
		/**
		 * アニメーションをストップする
		 *
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		stopAnimation: function() {
			// ダミーを削除
			this.$find('.h5screenContent.dummy').remove();
			// カレント以外非表示
			this.$find('.h5screenContent:not(.current)').css('display', 'none');
			var $current = this.$find('.h5screenContent.current');
			// 幅の固定化を元に戻す
			this._$scrollingBase.css('width', '100%');
			$current.css('width', '100%');
			// scrollingBaseの位置と幅と高さ調整
			var left = parseInt(this._$scrollingBase.css('left'));
			this._$scrollingBase.css({
				left: 0,
				height: $current.height(),
				overflow: 'hidden'
			});
			this._$scrollingBase.children().each(function() {
				$(this).css('left', parseInt($(this).css('left')) + left);
			});
			this._isAnimation = false;
			$(this.rootElement).removeClass('inOperation');
			this._animationDfd.resolve();
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenController
		 * @param {Number} left 移動先の位置
		 * @param {String|Number} duration アニメーション速度
		 * @returns promise
		 */
		slide: function(left, duration) {
			var dfd = h5.async.deferred();
			this._$scrollingBase.animate({
				left: left
			}, duration, null, function() {
				dfd.resolve();
			});
			return dfd.promise();
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		move: function(d) {
			this._$scrollingBase.css('left', parseInt(this._$scrollingBase.css('left')) + d);
		},

		/**
		 * 右に1ページ移動
		 *
		 * @memberOf h5.ui.components.screen.ScreenController
		 * @returns promise
		 */
		next: function() {
			return this._pageSlide('next');
		},

		/**
		 * 左に1ページ移動
		 *
		 * @memberOf h5.ui.components.screen.ScreenController
		 * @returns promise
		 */
		prev: function() {
			return this._pageSlide('prev');
		},

		/**
		 * ページ移動
		 *
		 * @param {String} nextOrPrev 'next'または'prev'
		 * @returns promise
		 */
		_pageSlide: function(nextOrPrev) {
			if (this._isAnimation) {
				// アニメーション中ならスタックする
				var dfd = h5.async.deferred();
				this._animationDfd.done(this.own(function() {
					this._pageSlide(nextOrPrev).done(function() {
						dfd.resolve();
					});
				}));
				return dfd.promise();
			}
			// スクロールする量を、startAnimationする前に取得する(スクロールバーが表示される前)
			var scrollAmount = (nextOrPrev === 'prev' ? 1 : -1) * $(this.rootElement).innerWidth();
			this.startAnimation();
			return this.slide(scrollAmount).done(this.own(function() {
				// カレントの入れ替え
				var $current = this.$find('.h5screenContent.current').removeClass('current');
				$current[nextOrPrev]().addClass('current').removeClass('dummy');
				this.stopAnimation();
			}));
		},

		/**
		 * ページをロード
		 *
		 * @param {String} url
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		load: function(url) {
			// ロード開始時のカレントを覚えておく
			var $current = this.$find('.h5screenContent.current');
			// ページのロード
			var promise = this._pageLoadLogic.load(url).done(
					this.own(function(data) {
						var $target = $current;
						// cloneしたものがあればそこにもロード結果を反映する
						var cloneIndex = $current.attr('data-h5screencloneindex');
						if (cloneIndex != null) {
							$target = $target.add($current.parent().find(
									'[data-h5screencloneindex="' + cloneIndex + '"]'));
						}
						$target.html(data).addClass('loaded');
						// scrollingBaseの位置と高さ調整
						var height = $target.outerHeight();
						this._$scrollingBase.css('height', height);
						setTimeout(this.own(function() {
							if (height !== $target.outerHeight()) {
								this._$scrollingBase.css('height', $target.outerHeight);
							}
						}), 5);
					}));
			this.indicator({
				target: $current,
				promises: promise
			}).show();
		}
	};
	h5.core.expose(ScreenController);
})();

(function() {
	var ScreenUIController = {
		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		__name: 'h5.ui.components.screen.ScreenUIController',

		/**
		 * 指でスライドするときの、スライド距離と移動距離のレート(移動距離/スライド距離)
		 *
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		_slideRate: 1,

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		_screenController: h5.ui.components.screen.ScreenController,

		/**
		 * trackstart時のスクリーン幅を覚えておく
		 *
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		_screenWidth: 0,

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		__ready: function(context) {
			// コントローラのパラメータで渡されたナビゲーションコントローラをバインドします
			var navigationController = context.args.navigationController;
			if (navigationController) {
				h5.core.controller(context.args.navigationRootElement, navigationController);
			}
		},

		/**
		 * スクリーンがアニメーション中かどうかを返す
		 *
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		isAnimation: function() {
			return this._screenController._isAnimation;
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		__meta: {
			_screenController: {
				rootElement: '.screen'
			}
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		'{rootElement} loadPage': function(context) {
			this._loadPage(context);
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 * @param url
		 */
		_loadPage: function(context) {
			if (!context.evArg.url || !context.evArg.force
					&& this.$find('.h5screenContent.current').hasClass('loaded')) {
				// url指定が無ければロードしない
				// forceオプション無しかつ、すでにコンテンツが読み込まれているなら何もしない
				// forceの指定があれば読み込み済みであろうと強制的に再ロードする
				return;
			}
			this._screenController.load(context.evArg.url);
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		'{rootElement} nextPage': function(context) {
			this._screenController.next().done(this.own(function() {
				this._loadPage(context);
			}));
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		'{rootElement} prevPage': function(context) {
			this._screenController.prev().done(this.own(function() {
				this._loadPage(context);
			}));
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		'{rootElement} screenTrackstart': function(context) {
			if (this._screenController._isAnimation) {
				return;
			}
			var trackSize = context.evArg.trackSize;
			this._screenWidth = this.$find('.screen').width();
			this._slideRate = this._screenWidth / trackSize;
			this._screenController.startAnimation();
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		'{rootElement} screenTrackmove': function(context) {
			this._screenController.move(context.evArg.dx * this._slideRate);
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		'{rootElement} screenTrackend': function(context) {
			var $current = this.$find('.h5screenContent.current');
			var $newCurrent = null;
			var page = context.evArg.page;
			var url = context.evArg.url;
			var slideDist;
			if (page === 'current') {
				$newCurrent = $current;
				slideDist = 0;
			} else {
				$newCurrent = $current[page]();
				$current.removeClass('current');
				$newCurrent.addClass('current');
				slideDist = (page === 'next' ? -1 : 1) * this._screenWidth;
			}
			this._screenController.slide(slideDist, 'fast').done(this.own(function() {
				this._screenController.stopAnimation();
				if (!$newCurrent.hasClass('loaded') || context.evArg.force) {
					this._screenController.load(url);
				}
			}));
		}
	};

	h5.core.expose(ScreenUIController);
})();