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

	var contextMenuController = {

		__name: 'h5.ui.ContextMenuController',

		_contextMenu: null,

		contextMenuExp: '',

		targetAll: true,

		__construct: function(context) {
			if (context.args) {
				var targetAll = context.args.targetAll;
				if (targetAll != undefined) {
					this.targetAll = context.args.targetAll;
				}
				var contextMenuExp = context.args.contextMenuExp;
				if (contextMenuExp != undefined) {
					this.contextMenuExp = context.args.contextMenuExp;
				}
			}
		},

		__ready: function(context) {
			var root = $(this.rootElement);
			var targetAll = root.attr('data-targetall');
			if (targetAll != undefined) {
				if (/false/i.test(targetAll)) {
					targetAll = false;
				}
				this.targetAll = !!targetAll;
			}
			var contextMenuExp = root.attr('data-contextmenuexp');
			if (contextMenuExp != undefined) {
				this.contextMenuExp = context.args.contextMenuExp;
			}
			this.close();
		},

		_getContextMenu: function(exp) {
			return this.$find('> .contextMenu' + (exp || this.contextMenuExp));
		},

		close: function(selected) {
			var $contextMenu = this.$find('> .contextMenu');

			// selectMenuItemイベントを上げる
			// 選択されたアイテムがあれば、それを引数に入れる
			// そもそもopenしていなかったらイベントは上げない
			if ($contextMenu.css('display') !== 'none') {
				this.trigger('selectMenuItem', {
					selected: selected ? selected : null
				});
			}

			if ($contextMenu.css('display') === 'none') {
				// 既にdisplay:noneなら何もしない(イベントもあげない)
				return;
			}
			$contextMenu.css({
				display: 'none'
			});
			// イベントを上げる
			this.trigger('hideCustomMenu');
		},

		_open: function(context, exp) {
			var contextMenu = this._getContextMenu(exp);

			// イベントを上げる
			// 既にopenしていたらイベントは上げない
			if (contextMenu.css('display') === 'none') {
				var e = this.trigger('showCustomMenu');
			}
			if (e.isDefaultPrevented()) {
				// preventDefaultされていたらメニューを出さない
				return;
			}

			contextMenu.css({
				display: 'block',
				visibility: 'hidden',
				left: 0,
				top: 0
			});
			var offsetParentOffset = contextMenu.offsetParent().offset();
			var left = context.event.pageX - offsetParentOffset.left;
			var top = context.event.pageY - offsetParentOffset.top;
			var outerWidth = contextMenu.outerWidth(true);
			var outerHeight = contextMenu.outerHeight(true);
			var scrollLeft = scrollPosition('Left')();
			var scrollTop = scrollPosition('Top')();
			var windowWidth = getDisplayArea('Width');
			var windowHeight = getDisplayArea('Height');
			var windowRight = scrollLeft + windowWidth;
			var windowBottom = scrollTop + windowHeight;
			var right = left + outerWidth;
			if (right > windowRight) {
				left = windowRight - outerWidth;
				if (left < scrollLeft)
					left = scrollLeft;
			}
			var bottom = top + outerHeight;
			if (bottom > windowBottom) {
				top = top - outerHeight;
				if (top < scrollTop)
					top = scrollTop;
			}

			initSubMenu(contextMenu, right, top);

			contextMenu.css({
				visibility: 'visible',
				left: left,
				top: top
			});

			function initSubMenu(menu, _right, _top) {
				menu.find('> .dropdown-submenu > .dropdown-menu').each(function() {
					var subMenu = $(this);
					var nextRight;
					var display = subMenu[0].style.display;
					subMenu.css({
						display: 'block'
					});
					var subMenuWidth = subMenu.outerWidth(true);
					if (subMenuWidth > windowRight - _right) {
						subMenu.parent().addClass('pull-left');
						nextRight = _right - subMenuWidth;
					} else {
						subMenu.parent().removeClass('pull-left');
						nextRight = _right + subMenuWidth;
					}

					var parent = subMenu.parent();
					var subMenuTop = _top + parent.position().top;
					var subMenuHeight = subMenu.outerHeight(true);
					if (subMenuHeight > windowBottom - subMenuTop) {
						subMenuTop = subMenuTop - subMenuHeight + parent.height();
						subMenu.css({
							top: 'auto',
							bottom: '0'
						});
					} else {
						subMenu.css({
							top: '0',
							bottom: 'auto'
						});
					}

					initSubMenu(subMenu, nextRight, subMenuTop);

					subMenu.css({
						display: display
					});
				});
			}

			//hifiveから流用(13470)
			function getDisplayArea(prop) {
				var compatMode = (document.compatMode !== 'CSS1Compat');
				var e = compatMode ? document.body : document.documentElement;
				return h5.env.ua.isiOS ? window['inner' + prop] : e['client' + prop];
			}

			//hifiveから流用(13455)
			function scrollPosition(propName) {
				var compatMode = (document.compatMode !== 'CSS1Compat');
				var prop = propName;

				return function() {
					// doctypeが「XHTML1.0 Transitional DTD」だと、document.documentElement.scrollTopが0を返すので、互換モードを判定する
					// http://mokumoku.mydns.jp/dok/88.html
					var elem = compatMode ? document.body : document.documentElement;
					var offsetProp = (prop === 'Top') ? 'Y' : 'X';
					return window['page' + offsetProp + 'Offset'] || elem['scroll' + prop];
				};
			}
		},

		/**
		 * コンテキストメニューを出す前に実行するフィルタ。 falseを返したらコンテキストメニューを出さない。
		 * 関数が指定された場合はその関数の実行結果、セレクタが指定された場合は右クリック時のセレクタとマッチするかどうかを返す。
		 */
		_filter: null,

		/**
		 * コンテキストメニューを出すかどうかを判定するフィルタを設定する。 引数には関数またはセレクタを指定できる。
		 * 指定する関数はcontextを引数に取り、falseを返したらコンテキストメニューを出さないような関数を指定する。
		 * セレクタを指定した場合は、右クリック時のevent.targetがセレクタにマッチする場合にコンテキストメニューを出さない。
		 *
		 * @memberOf ___anonymous46_5456
		 * @param selectorOrFunc
		 */
		setFilter: function(selectorOrFunc) {
			if (selectorOrFunc == null) {
				this._filter = null;
			} else if ($.isFunction(selectorOrFunc)) {
				// 渡された関数をthis._filterにセット
				this._filter = selectorOrFunc;
			} else if (typeof (selectorOrFunc) === 'string') {
				this._filter = function(context) {
					// targetがセレクタとマッチしたらreturn false;
					if ($(context.event.target).filter(selectorOrFunc).length) {
						return false;
					}
				};
			}
		},

		'{rootElement} contextmenu': function(context) {
			this.close();
			// _filterがfalseを返したら何もしない
			if (this._filter && this._filter(context) === false) {
				return;
			}
			if (this.targetAll) {
				context.event.preventDefault();
				context.event.stopPropagation();
				this._open(context);
			}
		},

		'{document.body} click': function(context) {
			this.close();
		},

		'{document.body} contextmenu': function(context) {
			this.close();
		},

		'.contextMenuBtn contextmenu': function(context) {
			//if(this.targetAll) return;
			context.event.preventDefault();
			context.event.stopPropagation();
			this.close();
			var current = context.event.currentTarget;
			var exp = $(current).attr('data-contextmenuexp');
			this._open(context, exp);
		},

		'> .contextMenu .dropdown-menu click': function(context) {
			context.event.stopPropagation();
			this.close();
		},

		'> .contextMenu .dropdown-submenu click': function(context) {
			context.event.stopPropagation();
		},

		'> .contextMenu contextmenu': function(context) {
			context.event.stopPropagation();
		},

		'> .contextMenu click': function(context) {
			context.event.stopPropagation();
		},

		'> .contextMenu li a click': function(context) {
			context.event.stopPropagation();
			this.close(context.event.target);
		}
	};

	h5.core.expose(contextMenuController);
})();