(function() {
	var ScreenController = {
		/**
		 * @memberOf h5.ui.ScreenController
		 */
		__name: 'h5.ui.ScreenController',

		/**
		 * @memberOf h5.ui.ScreenController
		 */
		_pageLoadLogic: h5.ui.PageLoadLogic,

		/**
		 * アニメーション中かどうか
		 *
		 * @memberOf h5.ui.ScreenController
		 */
		_isAnimation: false,

		/**
		 * スクロールラッパー要素
		 *
		 * @memberOf h5.ui.ScreenController
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
		 * @memberOf h5.ui.ScreenController
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
			$contents.eq(0).addClass('current').css('display', 'block');

			// スクロール用のDOMを作成
			this._$scrollingBase = $('<div class="scrollingBase"></div>').css({
				display: 'block',
				left: 0,
				margin: 0,
				padding: 0,
				position: 'relative'
			});
			this._$scrollingBase.append($contents);
			$(this.rootElement).css('overflow-x', 'hidden').append(this._$scrollingBase);
		},

		/**
		 * アニメーションをスタートする。
		 *
		 * @memberOf h5.ui.ScreenController
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
			$left.css({
				left: -screenWidth,
				display: 'block'
			});
			$right.css({
				left: screenWidth,
				display: 'block'
			});
			this._isAnimation = true;
			this._animationDfd = h5.async.deferred();
		},
		/**
		 * アニメーションをストップする
		 *
		 * @memberOf h5.ui.ScreenController
		 */
		stopAnimation: function() {
			// ダミーを削除
			this.$find('.h5screenContent.dummy').remove();
			// カレント以外非表示
			this.$find('.h5screenContent:not(.current)').css('display', 'none');
			// scrollingBaseの位置調整
			var left = parseInt(this._$scrollingBase.css('left'));
			this._$scrollingBase.css('left', 0);
			this._$scrollingBase.children().each(function() {
				$(this).css('left', parseInt($(this).css('left')) + left);
			});
			this._isAnimation = false;
			this._animationDfd.resolve();
		},

		/**
		 * @memberOf h5.ui.ScreenController
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
		 * @memberOf h5.ui.ScreenController
		 */
		move: function(d) {
			this._$scrollingBase.css('left', parseInt(this._$scrollingBase.css('left')) + d);
		},

		/**
		 * 右に1ページ移動
		 *
		 * @memberOf h5.ui.ScreenController
		 * @returns promise
		 */
		next: function() {
			return this._pageSlide('next');
		},

		/**
		 * 左に1ページ移動
		 *
		 * @memberOf h5.ui.ScreenController
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
		 * @memberOf h5.ui.ScreenController
		 */
		load: function(url) {
			// ロード開始時のカレントを覚えておく
			var $current = this.$find('.h5screenContent.current');
			// ページのロード
			var promise = this._pageLoadLogic.load(url).done(
					function(data) {
						var $target = $current;
						// cloneしたものがあればそこにもロード結果を反映する
						var cloneIndex = $current.attr('data-h5screencloneindex');
						if (cloneIndex != null) {
							$target = $target.add($current.parent().find(
									'[data-h5screencloneindex="' + cloneIndex + '"]'));
						}
						$target.html(data).addClass('loaded');
					});
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
		 * @memberOf h5.ui.ScreenUIController
		 */
		__name: 'h5.ui.ScreenUIController',

		/**
		 * 指でスライドするときの、スライド距離と移動距離のレート(移動距離/スライド距離)
		 *
		 * @memberOf h5.ui.ScreenUIController
		 */
		_slideRate: 1,

		/**
		 * @memberOf h5.ui.ScreenUIController
		 */
		_screenController: h5.ui.ScreenController,

		/**
		 * trackstart時のスクリーン幅を覚えておく
		 *
		 * @memberOf h5.ui.ScreenUIController
		 */
		_screenWidth: 0,

		/**
		 * @memberOf h5.ui.ScreenUIController
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
		 * @memberOf h5.ui.ScreenUIController
		 */
		isAnimation: function() {
			return this._screenController._isAnimation;
		},

		/**
		 * @memberOf h5.ui.ScreenUIController
		 */
		__meta: {
			_screenController: {
				rootElement: '.screen'
			}
		},

		/**
		 * @memberOf h5.ui.ScreenUIController
		 */
		'{rootElement} loadPage': function(context) {
			this._loadPage(context);
		},

		/**
		 * @memberOf h5.ui.ScreenUIController
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
		 * @memberOf h5.ui.ScreenUIController
		 */
		'{rootElement} nextPage': function(context) {
			this._screenController.next().done(this.own(function() {
				this._loadPage(context);
			}));
		},

		/**
		 * @memberOf h5.ui.ScreenUIController
		 */
		'{rootElement} prevPage': function(context) {
			this._screenController.prev().done(this.own(function() {
				this._loadPage(context);
			}));
		},

		/**
		 * @memberOf h5.ui.ScreenUIController
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
		 * @memberOf h5.ui.ScreenUIController
		 */
		'{rootElement} screenTrackmove': function(context) {
			this._screenController.move(context.evArg.dx * this._slideRate);
		},

		/**
		 * @memberOf h5.ui.ScreenUIController
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