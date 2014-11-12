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
		 * PageLoadLogic
		 * <p>
		 * PageLoadLogic.jsを呼んでいない場合はundefined
		 * </p>
		 *
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		_pageLoadLogic: h5.u.obj.ns('h5.ui.components.screen').PageLoadLogic,

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
		 * トラック操作中のスクリーン幅(高さ)
		 */
		_screenWH: 0,

		/**
		 * 縦スクロールかどうか。デフォルトはfalseで横スクロール
		 *
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		isVertical: false,

		/**
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		__ready: function(context) {
			// 縦か横かを取得
			this.isVertical = context.args.isVertical;

			// screen内に配置されているDOMをコンテンツとして設定
			var $contents = this.$find('>*');
			$contents.css({
				display: 'none'
			}).addClass('h5screenContent');

			// コンテンツが最低1ページ以上になるようにする
			// TODO 後から追加する場合など、バインド時に無い場合の対応。
			if ($contents.length === 0) {
				throw new Error('コンテンツは最低1ページは必要です');
			}
			// ページ数が2以下の場合は3ページ以上になるよう繰り返す
			// TODO ループしない場合や、コントローラがバインドされているページなどクローンしても意味ないものの場合は繰り返す必要ない
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

			// 先頭のコンテンツをカレントとして設定
			var $current = $contents.eq(0);
			$current.addClass('current').css('display', 'block');

			// スクロール用のDOMを作成
			this._$scrollingBase = $('<div class="scrollingBase"></div>').css({
				display: 'block',
				left: 0,
				margin: 0,
				padding: 0,
				position: 'relative'
			});
			this._$scrollingBase.append($contents);
			$(this.rootElement).append(this._$scrollingBase);

			// 準備ができたら表示
			$(this.rootElement).css('visibility', 'visible');
		},

		/**
		 * アニメーションをスタートする。
		 *
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		startAnimation: function(nextOrPrev) {
			if (this._isAnimation) {
				return;
			}
			var outerWH = this.isVertical ? 'outerHeight' : 'outerWidth';

			// スクリーン幅を取得
			var screenWH = $(this.rootElement)[outerWH]();
			var $current = this.$find('.h5screenContent.current');
			// 左右(上下)のコンテンツを表示。無ければ反対端から持ってくる。
			var $prev = null;
			if (nextOrPrev !== 'next') {
				$prev = $current.prev();
				if (!$prev.length) {
					// コンテンツ数がページ数を超えていれば、左側の要素は右端から持ってくる
					// (TODO loopする場合のみ)
					$prev = this.$find('.h5screenContent:last');
					this._$scrollingBase.prepend($prev);
				}
				$prev.css('display', 'block');
			}
			var $next = null;
			if (nextOrPrev !== 'prev') {
				$next = $current.next();
				if (!$next.length) {
					// コンテンツ数がページ数を超えていれば、右側の要素は左端から持ってくる
					$next = this.$find('.h5screenContent:first');
					this._$scrollingBase.append($next);
				}
				$next.css('display', 'block');
			}

			// display;blockにしてから幅(高さ)を取得
			var currentWH = $current[outerWH]();
			var prevWH = $prev ? $prev[outerWH]() : 0;
			var nextWH = $next ? $next[outerWH]() : 0;

			// scrollingBaseの幅(高さ)を設定
			if (this.isVertical) {
				this._$scrollingBase.css({
					height: prevWH + currentWH + nextWH,
					top: -prevWH
				});
			} else {
				this._$scrollingBase.css({
					width: prevWH + currentWH + nextWH,
					left: -prevWH
				});
			}

			// current,prev,nextの位置調整
			// 幅(高さ)を一時的に固定。固定しないとscrollingBaseの幅によって可変になってしまうため
			$current.add($prev).add($next).css('position', 'absolute');
			if (this.isVertical) {
				$current.css({
					left: 0,
					top: prevWH,
					height: currentWH
				});

				if ($prev) {
					$prev.css({
						left: 0,
						top: 0,
						height: prevWH
					});
				}
				if ($next) {
					$next.css({
						left: 0,
						top: prevWH + currentWH,
						height: nextWH
					});
				}
			} else {
				$current.css({
					top: 0,
					left: prevWH,
					width: currentWH
				});

				if ($prev) {
					$prev.css({
						left: 0,
						top: 0,
						width: prevWH
					});
				}
				if ($next) {
					$next.css({
						top: 0,
						left: prevWH + currentWH,
						width: nextWH
					});
				}
			}

			// scrollingBaseの高さ(幅)を設定。横スクロールなら高さ、縦スクロールなら幅を設定する。
			// screenに高さが設定されていない(position:absoluteの要素しか中にない場合に高さが0になっている)場合は一時的に高さを固定にする
			if (!this.isVertical && !$(this.rootElement).height()) {
				this._$scrollingBase.css({
					height: Math.max(($prev ? $prev.outerHeight() : 0), $current.outerHeight(),
							($next ? $next.outerHeight() : 0))
				});
			}
			if (this.isVertical && !$(this.rootElement).width()) {
				this._$scrollingBase.css({
					width: Math.max(($prev ? $prev.outerWidth() : 0), $current.outerWidth(),
							($next ? $next.outerWidth() : 0))
				});
			}

			this._isAnimation = true;
			$(this.rootElement).addClass(
					'inOperation ' + (this.isVertical ? 'vertical' : 'horizonal'));
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
			var $content = this.$find('.h5screenContent');
			$content.css({
				display: 'none',
				position: '',
				width: '',
				top: '',
				left: ''
			});
			$content.css(this.isVertical ? 'height' : 'width', '');

			var $current = this.$find('.h5screenContent.current');
			$current.css({
				display: 'block'
			});
			// scrollingBaseの位置と幅と高さ調整
			var ltProp = this.isVertical ? 'top' : 'left';
			var lt = parseInt(this._$scrollingBase.css(ltProp));
			this._$scrollingBase.css({
				left: 0,
				top: 0,
				width: '',
				height: '',
				overflow: 'visible'
			});
			this._$scrollingBase.children().each(function() {
				$(this).css(ltProp, parseInt($(this).css(ltProp)) + lt);
			});

			this._isAnimation = false;
			$(this.rootElement).removeClass('inOperation');
			$(this.rootElement).removeClass(this.isVertical ? 'vertical' : 'horizonal');
			this._animationDfd.resolve();
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenController
		 * @param {Number} position 移動先の位置
		 * @param {String|Number} duration アニメーション速度
		 * @returns promise
		 */
		slide: function(position, duration) {
			var dfd = h5.async.deferred();
			this._$scrollingBase.animate((this.isVertical ? {
				top: position
			} : {
				left: position
			}), duration, null, function() {
				dfd.resolve();
			});
			return dfd.promise();
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		track: function(d) {
			var leftOrTop = this.isVertical ? 'top' : 'left';
			this._$scrollingBase.css(leftOrTop, parseInt(this._$scrollingBase.css(leftOrTop)) + d);
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
			var scrollAmount = nextOrPrev === 'prev' ? 0
					: -$(this.rootElement)[this.isVertical ? 'innerHeight' : 'innerWidth']();
			this.startAnimation(nextOrPrev);
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
			if (!url) {
				return;
			}
			if (!this._pageLoadLogic) {
				throw new Error('コンテンツのロード機能を使用するにはPageLoadLogic.jsが必要です');
			}
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
					}));
			this.indicator({
				target: $current,
				promises: promise
			}).show();
		},

		/**
		 * ページを追加
		 *
		 * @param {jQuery} $elm
		 * @returns {Promise}
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		add: function($elm) {
			var dfd = h5.async.deferred();
			if (this._isAnimation) {
				// アニメーション中ならスタックする
				this._animationDfd.done(this.own(function() {
					this.add($elm).done(function() {
						dfd.resolve();
					}).fail(function() {
						dfd.reject();
					});
				}));
				return dfd.promise();
			}

			// カレントの後ろに追加する
			var $current = this.$find('.h5screenContent.current');
			// コンテンツ化
			this._translateContents($elm);
			$current.after($elm);

			// 循環しない場合で、最後の要素だった場合はクラスを入れ替える
			if (!this._circulation && $current.hasClass('h5screenLastContent')) {
				$current.removeClass('h5screenLastContent');
				$elm.addClass('h5screenLastContent');
			}
			return dfd.resolve().promise();
		},

		/**
		 * 指定されたページの箇所に移動
		 *
		 * @param {jQuery} $elm
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		move: function($target) {
			if (this._isAnimation) {
				// アニメーション中ならスタックする
				var dfd = h5.async.deferred();
				this._animationDfd.done(this.own(function() {
					this.move($target).done(function() {
						dfd.resolve();
					}).fail(function() {
						dfd.reject();
					});
				}));
				return dfd.promise();
			}
			var dfd = h5.async.deferred();
			var $current = this.$find('.h5screenContent.current');
			if ($target[0] === $current[0]) {
				// 指定されたターゲットが現在のページなら何もしない
				return dfd.resolve().promise();
			}

			$target.css('display', 'block');
			$current.css('display', 'none');
			$target.css({
				top: 0,
				left: 0
			});
			// カレントの入れ替え
			$current.removeClass('current');
			$target.addClass('current').removeClass('dummy');
			return dfd.resolve().promise();
		},

		/**
		 * ページを削除
		 *
		 * @param {jQuery} $elm
		 * @memberOf h5.ui.components.screen.ScreenController
		 */
		remove: function($elm) {
			var dfd = h5.async.deferred();
			if ($.inArray($elm[0], this.$find('.h5screenContent')) === -1) {
				var e = new Error('削除する要素はスクリーン内のコンテンツ要素を指定してください');
				throw e;
				return dfd.reject(e).promise();
			}
			if (this._isAnimation) {
				// アニメーション中ならスタックする
				this._animationDfd.done(this.own(function() {
					this.remove($elm).done(function() {
						dfd.resolve();
					}).fail(function() {
						dfd.reject();
					});
				}));
				return dfd.promise();
			}

			if (this.$find('.h5screenContent').length < 2) {
				// 1つしかない場合は削除でない
				return dfd.reject().promise();
			}

			var $current = this.$find('.h5screenContent.current');
			if ($elm[0] === $current[0]) {
				// カレントを削除するときは移動してから削除する
				var promise = null;
				if (!this._circulation && $current.hasClass('h5screenFirstContent')) {
					// 次のページへ移動
					promise = this.next().done(function() {
						$current.next().addClass('h5screenFirstContent');
					});
				} else {
					// 前のページへ移動
					promise = this.prev().done(function() {
						if ($current.hasClass('h5screenLastContent')) {
							$current.prev().addClass('h5screenLastContent');
						}
					});
				}
				// 移動してから削除
				promise.done(this.own(function() {
					// コントローラのdispose
					this._disposeContentsController($elm).done(function() {
						// 要素の削除
						$elm.remove();
						dfd.resolve();
					});
				}));
				return dfd.promise();
			}

			// カレント以外の要素が削除対象の場合
			if ($elm.hasClass('h5screenFirstContent')) {
				// クラスの入れかえ
				$elm.next().addClass('h5screenFirstContent');
			}
			if ($elm.hasClass('h5screenLastContent')) {
				// クラスの入れかえ
				$elm.prev().addClass('h5screenLastContent');
			}
			this._disposeContentsController($elm).done(function() {
				$elm.remove();
				dfd.resolve();
			});

			return dfd.promise();
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenController
		 * @param $elm
		 * @returns promise
		 */
		_disposeContentsController: function($elm) {
			// 内部のコントローラを全てdisposeする
			// disposeでPromiseが返ってきたら、removeはdispose完了後にする。
			var controllers = h5.core.controllerManager.getControllers($elm, {
				deep: true
			});
			var promises = [];
			for (var i = 0, len = controllers.length; i < len; i++) {
				promises.push(controllers[i].dispose());
			}
			return h5.async.when(promises);
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
		_screenWH: 0,

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		__ready: function(context) {
			// コントローラのパラメータで渡されたナビゲーションコントローラをバインドします
			var navigationController = context.args.navigationController;
			this._navController = h5.core.controller(context.args.navigationRootElement
					|| this.rootElement, navigationController, $.extend({}, context.args, {
				$screen: this.$find('.screen')
			}));
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
			if (!context.evArg || !context.evArg.url || !context.evArg.force
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
			var $current = this.$find('.h5screenContent.current');
			this._screenController.next().always(
					this.ownWithOrg(function(promise) {
						// ナビゲーションコントローラに通知
						var isResolved = promise.state() === 'resolved';
						if (!$current.hasClass('current')) {
							this._callNavigationCallback('change', [
									this.$find('.h5screenContent.current'), $current]);
						}
						if (isResolved) {
							this._loadPage(context);
						}
					}));
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		'{rootElement} prevPage': function(context) {
			var $current = this.$find('.h5screenContent.current');
			this._screenController.prev().always(
					this.ownWithOrg(function(promise) {
						// ナビゲーションコントローラに通知
						var isResolved = promise.state() === 'resolved';
						if (!$current.hasClass('current')) {
							this._callNavigationCallback('change', [
									this.$find('.h5screenContent.current'), $current]);
						}
						if (isResolved) {
							this._loadPage(context);
						}
					}));
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		'{rootElement} movePage': function(context) {
			var $current = this.$find('.h5screenContent.current');
			var $target = $(context.evArg.target);
			this._screenController.move($target);
			// ナビゲーションコントローラに通知

			if (!$current.hasClass('current')) {
				this._callNavigationCallback('change', [this.$find('.h5screenContent.current'),
						$current]);
			}

			this._loadPage(context);
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		'{rootElement} screenTrackstart': function(context) {
			if (this._screenController._isAnimation) {
				return;
			}
			var trackSize = context.evArg.trackSize;
			this._screenWH = this.$find('.screen')[this._screenController.isVertical ? 'height'
					: 'width']();
			this._slideRate = this._screenWH / trackSize;
			this._screenController.startAnimation();
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		'{rootElement} screenTrackmove': function(context) {
			var d = context.evArg.dist * this._slideRate;
			if (d === 0) {
				return;
			}
			this._screenController.track(d);
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 */
		'{rootElement} screenTrackend': function(context) {
			var $current = this.$find('.h5screenContent.current');
			var $newCurrent = null;
			var page = context.evArg.page;
			var url = context.evArg.url;
			var changed = false;
			var slideDist;
			if (page === 'current') {
				$newCurrent = $current;
				slideDist = -this._screenWH;
			} else {
				changed = true;
				$newCurrent = $current[page]();
				$current.removeClass('current');
				$newCurrent.addClass('current');
				slideDist = (page === 'next' ? -2 : 0) * this._screenWH;
			}
			this._screenController.slide(slideDist, 'fast').done(this.own(function() {
				this._screenController.stopAnimation();

				if (changed) {
					// ナビゲーションコントローラに通知
					this._callNavigationCallback('change', [$newCurrent, $current]);

					// ロード
					if (!$newCurrent.hasClass('loaded') || context.evArg.force) {
						this._screenController.load(url);
					}
				}
			}));
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 * @param context
		 */
		'{rootElement} addPage': function(context) {
			var $elm = context.evArg.element;
			this._screenController.add($elm).always(this.ownWithOrg(function(promise) {
				// ナビゲーションコントローラに通知
				this._callNavigationCallback('add', [$elm, promise.state() === 'resolved']);
			}));
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 * @param context
		 */
		'{rootElement} removePage': function(context) {
			var $current = this.$find('.h5screenContent.current');
			var $elm = context.evArg.element;
			this._screenController.remove($elm).always(
					this.ownWithOrg(function(promise) {
						// ナビゲーションコントローラに通知
						this._callNavigationCallback('remove', [$elm,
								promise.state() === 'resolved']);
						// 現在のページが変更されていたらchangeで通知
						if (!$current.hasClass('current')) {
							this._callNavigationCallback('change', [
									this.$find('.h5screenContent.current'), $current]);
						}
					}));
		},

		/**
		 * @memberOf h5.ui.components.screen.ScreenUIController
		 * @param context
		 */
		_callNavigationCallback: function(event, args) {
			if (this._navController) {
				$(this._navController.rootElement).trigger('screen' + event, args);
			}
		}
	};

	h5.core.expose(ScreenUIController);
})();