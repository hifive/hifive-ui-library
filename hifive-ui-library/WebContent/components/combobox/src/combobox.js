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

// ---- ListLayout ---- //
(function($) {
	'use strict';

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
	var BOX_CLASS = 'list-layout-box';
	var BAR_CLASS = 'list-layout-bar';
	var RENDER_WAIT_TIME = 100;

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

	// =========================================================================
	//
	// メインコード（コントローラ・ロジック等）
	//
	// =========================================================================
	var listLayoutController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		__name: 'h5.ui.components.combobox.ListLayoutController',


		// --- Property --- //

		_source: null,

		_rowHeight: 0,


		_scrollStrategy: null,

		_start: 0,

		_end: 0,

		_renderWaitTimerId: null,

		_loadingId: null,

		_changeSourceHandler: null,

		_initializeDeferred: null,


		// --- Private Method --- //

		_render: function() {
			var that = this;

			var start = this._start;
			var end = this._end;

			var isCached = this._source.isCached(start, end);
			var renderListEventArg = {
				start: start,
				end: end
			};

			if (isCached && this._renderWaitTimerId === null) {
				// Cache されている場合はそのまま表示する
				this._source.sliceAsync(start, end).then(function(data) {
					that._boxController.render(data);
					that._boxController.endLoad();
					that.trigger('renderList', renderListEventArg);
				});
				return;
			}

			if (this._renderWaitTimerId !== null) {
				clearTimeout(this._renderWaitTimerId);
			}

			this._boxController.beginLoad();
			that.trigger('loadDataBegin');

			this._renderWaitTimerId = setTimeout(function() {

				var timerId = that._renderWaitTimerId;

				that._source.sliceAsync(start, end).then(function(data) {
					if (timerId !== that._renderWaitTimerId) {
						return;
					}
					that._renderWaitTimerId = null;

					that._boxController.render(data);
					that._boxController.endLoad();

					that.trigger('loadDataEnd');
					that.trigger('renderList', renderListEventArg);
				});

			}, RENDER_WAIT_TIME);
		},

		_scroll: function(scrollDiff) {
			var windowSize = $(this.rootElement).height();
			var dataInfo = {
				totalCells: this._source.getTotalLength(),
				defaultCellSize: this._rowHeight
			};

			var scrollInfo = this._scrollStrategy.scroll(scrollDiff, windowSize, dataInfo);

			this._barController.setScrollPosition(scrollInfo.scrollPosition);
			this._barController.setScrollSize(scrollInfo.scrollSize);


			var index = scrollInfo.index;

			// 追記：プライベートメソッド化
			var len = this._getDispDataLength(windowSize);

			if (scrollInfo.isEnd) {
				this._start = index - len;
				this._end = index;
				this._boxController.setVerticalPositionBottom();
			} else {
				this._start = index;
				this._end = index + len;
				this._boxController.setVerticalPosition(scrollInfo.offset);
			}

			this._render();
		},

		// 追記：プライベートメソッド化
		_getDispDataLength: function(windowSize) {
			return Math.ceil(windowSize / this._rowHeight) + 1;
		},

		// --- Life Cycle Method --- //

		__construct: function() {
			this._initializeDeferred = h5.async.deferred();
		},

		__init: function() {

			// TODO: 子コントローラの parentController が null になっていて問題になる可能性あり

			var $root = $(this.rootElement);

			var $box = $('<div></div>').addClass(BOX_CLASS).css({
				height: '100%',
				float: 'left'
			}).appendTo(this.rootElement);

			var $bar = $('<div></div>').addClass(BAR_CLASS).css({
				height: '100%'
			}).appendTo(this.rootElement);


			this._boxController = h5.core.controller($box,
					h5.ui.components.virtualScroll.VirtualScrollBoxController);
			this._barController = h5.core.controller($bar,
					h5.ui.components.virtualScroll.VerticalScrollBarController);

			return this._barController.initPromise.then(function() {
				var boxWidth = $root.width() - $bar.width();
				$box.width(boxWidth);
			});
		},


		// --- Event Handler --- //

		'{rootElement} h5scroll': function(context) {

			context.event.stopPropagation();
			var info = context.evArg.verticalScroll;

			if (info.type === 'pixel') {
				this._scroll(info.diff);
			} else if (info.type === 'index') {
				this.moveIndex(info.diff);
			} else {
				var msg = '不正な type を持つ h5scroll イベントです; verticalScroll.type = {0}';
				this.throwError(msg, info.type);
			}
		},

		'{rootElement} mousewheel': function(context) {
			context.event.preventDefault();

			var diff = (context.event.wheelDelta < 0) ? 1 : -1;

			this.trigger('h5scroll', {
				verticalScroll: {
					type: 'index',
					diff: diff
				}
			});
		},

		// --- Public Method  --- //

		init: function(source, renderer, rowHeight, scrollStrategy) {

			this._source = source;
			this._scrollStrategy = scrollStrategy;

			var that = this;

			this._changeSourceHandler = this.own(function() {
				this.refresh();
			});

			this.initPromise.then(function() {
				that._boxController.init(renderer);
				that._rowHeight = rowHeight;

				that._boxController.initPromise.then(function() {
					that._scroll(0);
				});

				that._source.addEventListener('changeSource', that._changeSourceHandler);
			});

			var promises = [this.readyPromise, this._boxController];

			h5.async.when(promises).then(function() {
				that._initializeDeferred.resolve();
			});

			return this.getInitializePromise();
		},

		refresh: function() {
			this._scrollStrategy.resetPageInfo();
			this._scroll(0);
		},

		beginLoad: function() {
			this._boxController.beginLoad();
		},

		getLoadingInfoDiv: function() {
			this._boxController.getLoadingDiv();
		},

		moveIndex: function(diff) {
			var windowSize = $(this.rootElement).height();
			var scrollDiff = this._scrollStrategy.indexDiffToScrollDiff(diff, windowSize);
			this._scroll(scrollDiff);
		},

		changeSearchOptions: function(searchOptions) {
			var windowSize = $(this.rootElement).height();

			this._source.changeSearchOptions($.extend({
				cachePageSize: this._getDispDataLength(windowSize)
			}, searchOptions));
		},

		setDataSource: function(dataSource) {
			if (this._source !== null) {
				this._source.removeEventListener('changeSource', this._changeSourceHandler);

				this._source = dataSource;
				this._source.addEventListener('changeSource', this._changeSourceHandler);

				this.refresh();
			}
		},

		getInitializePromise: function() {
			return this._initializeDeferred.promise();
		}

	};

	// =========================================================================
	//
	// 外部公開
	//
	// =========================================================================
	h5.core.expose(listLayoutController);

})(jQuery);

(function() {

	// =========================================================================
	//
	// スコープ内定数
	//
	// =========================================================================
	// オーバーレイ, ドロップボタン、ドロップダウンリストに適用するz-indexの開始値
	var Z_INDEX_START_VALUE = 1000;
	// ドロップダウンリストに一度に表示する件数
	var DEFAULT_MAX_ITEMS = 20;
	// ウィンドウのリサイズイベントに登録したハンドラが実行されるまでの遅延時間(ms)
	var RESIZE_EVENT_THRESHOLD = 300;
	// リスト内要素のテンプレート
	var MENU_TEMPLATE = '<ul style="list-style-type:none; margin:0; padding:0;">'
			+ '[% for (var i = 0, ilen = items.length; i < ilen; i++) { %]'
			+ '[%   var data = items[i], ret = formatter(data, i), label = (typeof ret === "string" ? ret : "&nbsp;") %]'
			+ '<li style="width:100%;" class="[%= matchedClass %] [%= activeClass %]" data-value="[%= data["value"] %]">[%:= label %]</li>'
			+ '[% } %]' + '</ul>';

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
	 * ドロップダウンリストのリストアイテムのテキストに表示する、文字列を生成する関数を返します
	 * <p>
	 * 引数に関数(Function)を指定した場合は、テキストを生成する関数が指定されたものとして、その関数をそのまま返します。
	 * <p>
	 * それ以外の型の値が指定された場合は、valueのテキストを生成する関数を返します。
	 */
	function createListItemTextFormatter(param, controller) {
		var pattern = param;
		var c = controller;

		switch ($.type(pattern)) {
		case 'function':
			return function(aData, i) {
				return pattern.call(c, aData, i);
			};
		default:
			return function(aData) {
				if (aData == null) {
					return '';
				}

				//dataがobjectの場合は、valueのテキストを表示します。
				if ($.isPlainObject(aData)) {
					return aData["value"].toString();
				}
				return aData.toString();
			};
		}
	}
	;

	// =========================================================================
	//
	// メインコード（コントローラ・ロジック等）
	//
	// =========================================================================
	/**
	 * ドロップダウンリストを制御するコントローラ
	 *
	 * @class h5.ui.components.combobox.DropDownListController
	 */
	var dropDownListControllerDef = {
		__name: 'h5.ui.components.combobox.DropDownListController',
		/** テンプレート名 */
		_templateName: 'comboboxMenu',
		/** 画面に表示されているリストアイテムに適用するクラス名 */
		_activeListClassName: 'active',
		/** 検索条件に一致したリストアイテムに適用するクラス名 */
		_matchedListClassName: 'matched',
		/** ドロップダウンボタンを包含する要素に適用するクラス名 */
		_dropdownBtnWrapClassName: 'combobox-dropdown-btn-wrapper',
		/** ドロップダウンボタンに適用するクラス名 */
		_dropdownBtnClassName: 'combobox-dropdown-btn',
		/** ドロップダウンボタンのアイコンに適用するクラス名 */
		_dropdownBtnIconClassName: 'combobox-dropdown-btn-icon',
		/** ドロップダウンリスト表示時に一緒に表示するオーバーレイの要素に適用するクラス名 */
		_dropdownMenuOverlay: 'combobox-dropdown-menu-overlay',
		/** ドロップダウンリストのハイライトする要素に適用するクラス名 */
		_dropdownMenuHighlightClassName: 'combobox-dropdown-menu-highlight',
		/** ドロップダウンリストを非表示にするクラス名 */
		_dropdownMenuVisibilityHidden: 'combobox-dropdown-menu-visibility-hidden',
		/** ドロップダウンリストを表示するクラス名 */
		_dropdownMenuVisibilityVisible: 'combobox-dropdown-menu-visibility-visible',
		/** リサイズイベントが発火するまでの遅延時間(ms) */
		_resizeEventThreshold: RESIZE_EVENT_THRESHOLD,
		/** 親要素(input要素) */
		_$parent: null,
		/** ルート要素 */
		_$root: null,
		/** body */
		_$body: null,
		/** ドロップダウンボタン要素 */
		_$btn: null,
		/** オーバーレイ要素 */
		_$overlay: null,
		/** 一回の読込みでドロップダウンに表示するアイテム数 */
		_maxItems: 0,
		/** テキストボックスに適用したスタイル情報 */
		_restoreStyles: {},
		/** リストアイテムに表示するテキストを生成する関数 */
		_listItemTextFormatter: null,
		/** 検索対象に含めるプロパティ名 */
		_searchProps: null,
		/** メニューの左枠線幅 */
		_rootLeftBorderWidth: null,
		/** メニューの右枠線幅 */
		_rootRightBorderWidth: null,
		/** リサイズタイマーID */
		_resizeTimerId: null,
		/** 仮想スクロール */
		_virtualScroll: null,
		/** postする値を格納するhidden要素 */
		_$hiddenElement: null,
		/** grid layout */
		_layout: null,
		/** grid dataSource */
		_dataSource: null,
		/** grid scrollStrategy */
		_scrollStrategy: null,
		/** データ全体の長さ */
		_dataTotalLength: null,
		/** postData */
		_postData: null,
		/** 描画されているliタグ */
		_$renderMenuList: null,
		/** 選択されているli要素 */
		_selectedLineObj: {
			$li: null,
			indexOfData: -1
		},
		/** ハイライト要素 */
		_highlightLineObj: {
			$li: null,
			indexOfData: -1,
			indexOfDom: -1
		},

		_onsubmitWrapper: null,

		__ready: function(context) {
			var args = context.args;

			// ユーザ指定パラメータ
			this._searchLabel = args.hasOwnProperty('searchLabel') ? args.searchLabel : true;
			this._listItemTextFormatter = createListItemTextFormatter(args.textFormat, this);
			this._searchProps = args.searchProps || [];
			this._maxItems = args.maxItems || DEFAULT_MAX_ITEMS;

			this.view.register(this._templateName, MENU_TEMPLATE);

			this._$root = $(this.rootElement);
			this._$body = $('body');
			this._$parent = $(context.args.parent);
			this._$hiddenElement = $(context.args.hiddenElement);

			//テキストボックスの親要素のsubmitイベントにハンドラを登録する
			this._onsubmitWrapper = this.own(this._submitEventHandler);
			this._$root.parents('form').submit(this._onsubmitWrapper);

			this._rootLeftBorderWidth = parseFloat(this._$root.css('border-left-width'));
			this._rootRightBorderWidth = parseFloat(this._$root.css('border-right-width'));

			//dataSourceの初期化
			var readyPromise = this.initDropDownList(context.args);

			//データ変更時のイベントハンドラを設定
			this._dataSource.addEventListener('changeSource', this.own(this.setDataTotalLength));

			// IE9では、テキストボックスにフォーカスが当たっている状態でスクロールバーをクリックすると
			// テキストボックスのフォーカスが外れfocusoutイベントが発生してしまう
			// そのためfocusousetは使用せず、ドロップダウンリスト表示中のみ存在する透明のオーバーレイ要素を作って擬似的にfocusoutと同じ処理を行う
			// (ただしTabキーでのフォーカス移動は、ComboBoxControllerのkeyupで対応する)
			this._$overlay = $('<div></div>').addClass(this._dropdownMenuOverlay);
			// オーバーレイ クリックイベント
			this._$overlay.click(this.own(this._overlayHitHandler));
			// ウィンドウサイズを計算してオーバーレイを表示する
			this._resizeOverlay();

			var offset = this._$parent.offset();
			//			var parentBorderStyle = this._$parent.css('border-top-style'); // IEではborder-styleだと値が取得できないのでborder-top-styleで取得する
			var parentBorderColor = this._$parent.css('border-top-color'); // IEではborder-colorだと値が取得できないのでborder-top-colorで取得する
			//			var parentTopBorder = parseFloat(this._$parent.css('border-top-width'));
			//			var parentBottomBorder = parseFloat(this._$parent.css('border-bottom-width'));
			//			var parentLeftBorder = parseFloat(this._$parent.css('border-left-width'));
			//			var parentRightBorder = parseFloat(this._$parent.css('border-right-width'));
			var btnHeight = this._$parent.outerHeight();

			// appearanceが適用されていてかつ色がデフォルトの場合は、ボタンにボーダーカラーを適用しない
			if (this._$parent.css('appearance') !== 'none'
					&& parentBorderColor.replace(/ /g, '') === 'rgb(0,0,0)') {
				parentBorderColor = '';
			}

			// ドロップダウンリスト表示用ボタンアイコン
			var $btnIcon = $('<div></div>').addClass(this._dropdownBtnIconClassName);

			// ドロップダウンリスト表示用ボタン
			this._$btn = $('<div name="combo-box-dropdown-button"></div>');
			this._$btn.addClass(this._dropdownBtnClassName);
			// テキストボックスのサイズに合わせてボタンのサイズを調整すし、ボーダーのスタイルをコピーする
			this._$btn.css({
				height: btnHeight
			//				borderStyle: parentBorderStyle,
			//				borderColor: parentBorderColor,
			// borderWidth: h5.u.str.format('{0}px {1}px {2}px {3}px', parentTopBorder,
			//		parentBottomBorder, parentLeftBorder, parentRightBorder)
			});

			var borderTopRightRadius = parseInt(this._$parent.css('border-top-right-radius'));
			var borderBottomRightRadius = parseInt(this._$parent.css('border-bottom-right-radius'));

			// テキストボックスとボタンの境界を結合するため、
			// テキストボックスの右上と右下にborder-radiusが適用されている場合はそれを解除して、ボタンの右上と右下にborder-radiusを適用する
			if (!isNaN(borderTopRightRadius) && borderTopRightRadius > 0) {
				this._$parent.css('border-top-right-radius', 0);
				this._$btn.css('border-top-right-radius', borderTopRightRadius);
				this._restoreStyles['border-top-right-radius'] = '';
			}

			if (!isNaN(borderBottomRightRadius) && borderBottomRightRadius > 0) {
				this._$parent.css('border-bottom-right-radius', 0);
				this._$btn.css('border-bottom-right-radius', borderBottomRightRadius);
				this._restoreStyles['border-bottom-right-radius'] = '';
			}

			// IEだと$().css('margin')で値が取得できないので個別に取得する
			var parentMarginTop = parseInt(this._$parent.css('margin-top'));
			var parentMarginRight = parseInt(this._$parent.css('margin-right'));
			var parentMarginBottom = parseInt(this._$parent.css('margin-bottom'));
			var parentMarginLeft = parseInt(this._$parent.css('margin-left'));
			var marginStr = h5.u.str.format('{0}px {1}px {2}px {3}px', parentMarginTop,
					parentMarginRight, parentMarginBottom, parentMarginLeft);

			// 重なっている部分のボーダーを無くす
			//this._$btn.css('border-left', 'none');
			// テキストボックスの余白と同じ余白を取る
			this._$btn.css('margin', marginStr);
			this._$btn.append($btnIcon);

			var $btnWrap = $('<div></div>').addClass(this._dropdownBtnWrapClassName);
			$btnWrap.append(this._$btn);
			this._$parent.after($btnWrap);

			// ボタンのサイズに合わせてアイコンの位置を調整する
			//			var marginTop = (btnHeight - $btnIcon.outerHeight()) / 2;
			//			$btnIcon.css('margin-top', marginTop);

			this._resizeMenu();

			return readyPromise;
		},
		__dispose: function() {
			// テキストボックスのスタイルを元に戻す
			this._$parent.css(this._restoreStyles);
		},
		__unbind: function() {
			this._$root.parents('form').unbind('submit', this._onsubmitWrapper);
		},
		/**
		 * 指定されたデータからドロップダウンリストのリストアイテムを生成します
		 *
		 * @param args
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		initDropDownList: function(args) {

			//dataSourceを作成する
			this.createDataSource(args);

			//grid strategyを取得
			this._scrollStrategy = h5.ui.components.virtualScroll.createIndexBaseScrollStrategy();

			//プルダウンを囲むdivへ grid layoutをバインドする
			this._layout = h5.core
					.controller(this.rootElement, h5.ui.components.combobox.ListLayoutController);

			//ドロップダウンリストを初期化する
			this._layout.init(this._dataSource, this.own(this.rendererFunction), 20,
					this._scrollStrategy);

			return this._layout.getInitializePromise();

		},

		/**
		 * 指定されたデータからDataSourceを初期化します
		 *
		 * @param args
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		createDataSource: function(args) {
			if (args.data) {
				//引数がdataの場合はlocalDataSourceを作成する
				this._dataSource = h5.ui.components.virtualScroll.data.createLocalDataSource(args.data);

				//フィルター設定
				if (args.filter && jQuery.isFunction(args.filter)) {
					this.setFilter(args.filter);
				} else {
					this._dataSource.setFilterFunction('value', function(arg, data) {
						return data.value.indexOf(arg) === 0;
					});
				}

			} else if (args.url) {
				//引数がurlの場合はLazyLoadDataSourceを作成する
				this._dataSource = h5.ui.components.virtualScroll.data.createLazyLoadDataSource(args.url,
						args.ajaxSettings);
				this._postData = args.postData;
			}
		},

		setFilter: function(filter) {
			if (filter && jQuery.isFunction(filter)) {
				this._dataSource.setFilterFunction('value', filter);
			}
		},

		/**
		 * 指定されたデータからDataSourceを生成し、ListLayoutへ再設定します
		 *
		 * @param args
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		refreshDataSource: function(args) {
			//dataSourceを作り直す
			this.createDataSource(args);
			//再設定
			this._layout.setDataSource(this._dataSource);
		},
		/**
		 * オーバーレイのサイズとドロップダウンリストの幅をリサイズします
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		'{window} resize': function() {
			if (this._resizeTimerId) {
				clearTimeout(this._resizeTimerId);
				this._resizeTimerId = null;
			}

			this._resizeTimerId = setTimeout(this.own(function() {
				this._resizeOverlay();
				this._resizeMenu();
			}), this._resizeEventThreshold);
		},
		/**
		 * マウス上のリストアイテムを選択状態(ハイライト)にします
		 *
		 * @param context
		 * @param $el
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		'li mouseenter': function(context, $el) {
			var $li = this._$root.find('li');
			$li.removeClass(this._dropdownMenuHighlightClassName);

			this._setHighlight($el);
		},
		/**
		 * 選択中の値をテキストボックスに反映します
		 *
		 * @param context
		 * @param $el
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		'li click': function(context, $el) {
			this.selectMenu();
			this.hideMenu();
			this._$parent.focus();
		},
		/**
		 * ドロップダウンリストの末尾に検索結果を追加(遅延表示)します
		 *
		 * @param context
		 * @param $el
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		'{rootElement} scroll': function(context, $el) {
			// IEだとスクロールバーを操作するとテキストボックスからフォーカスが外れるため、外れないようにする
			this._$parent.focus();
		},

		/**
		 * ドロップダウンリストの総数を設定する
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		setDataTotalLength: function() {
			this._dataTotalLength = this._dataSource.getTotalLength();
		},

		/**
		 * ドロップダウンリストのHTML生成関数
		 */
		rendererFunction: function($target, data) {

			var html = this.view.get(this._templateName, {
				items: data,
				matchedClass: this._matchedListClassName,
				activeClass: this._activeListClassName,
				hiliteClass: this._dropdownMenuHighlightClassName,
				formatter: this._listItemTextFormatter
			});

			$target[0].innerHTML = html;
		},

		/**
		 * 引数に指定した値と前方一致するリストアイテムを候補として表示します
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		narrowDown: function() {

			//古いデータが見えないようドロップダウンリストを非表示にする
			var $list = this._$root.find('li');
			$list.addClass(this._dropdownMenuVisibilityHidden);

			//テキストボックスの入力値を検索条件に設定
			var val = this._$parent.val();
			var filterValue = {
				value: val
			};

			//postDataが存在する場合は、検索条件に追加
			if (this._postData) {
				$.extend(filterValue, this._postData);
			}
			//検索する
			this._layout.changeSearchOptions({
				filter: filterValue
			});
		},
		/**
		 * ドロップダウンリストとテキストボックスに対して以下の処理を行います
		 * <ul>
		 * <li>現在表示している最後のリストアイテムの情報を削除</li>
		 * <li>ドロップダウンリストのスクロール位置を先頭に設定する</li>
		 * <li>選択状態を解除する</li>
		 * </ul>
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		resetMenu: function() {
			this.rootElement.scrollTop = 0;
			this._removeHighlight(this._highlightLineObj.$li);
		},

		/**
		 * ドロップダウンリストを表示します
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		showMenu: function() {
			this._resizeMenu();
			this._$root.show();
			this._$parent.focus();
			this._$body.append(this._$overlay);

			// ドロップボタン、ドロップダウンリスト、オーバーレイの順で要素が前面にくるようz-indexを設定する
			this._$overlay.css('z-index', Z_INDEX_START_VALUE);
			this._$parent.css('z-index', Z_INDEX_START_VALUE + 2);
			this._$root.css('z-index', Z_INDEX_START_VALUE + 3);
			this._$btn.css('z-index', Z_INDEX_START_VALUE + 4);

			delete this._restoreStyles.position;
		},
		/**
		 * ドロップダウンリストを非表示にします
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		hideMenu: function() {
			//入力値をhidden項目へ設定します。
			this.setHiddentValue(this._$parent.val());
			this._$overlay.detach();
			this._$root.hide();

			// z-indexを除去する
			this._$overlay.css('z-index', '');
			this._$parent.css('z-index', '');
			this._$root.css('z-index', '');
			this._$btn.css('z-index', '');
		},
		/**
		 * ドロップダウンリストの表示、非表示を判定します <p> true：表示 false：非表示
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		isShowMenu: function() {
			var isShowMenu;
			this._$root.is(':visible') ? isShowMenu = true : isShowMenu = false;
			return isShowMenu;
		},
		/**
		 * 現在選択中のリストアイテムの次にあるリストアイテムを選択状態にします
		 * <p>
		 * 何も選択されていない場合は先頭の要素を選択状態にします
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		highlightNext: function() {
			//選択行がある かつ 表示範囲の中にハイライト行が存在しない場合
			//次の行を先頭にするようスクロールし、ハイライトする
			if (this._highlightLineObj.$li !== null
					&& (this._dataStartIndex > this._highlightLineObj.indexOfData || this._dataEndIndex < this._highlightLineObj.indexOfData)) {

				//差分行数を求める
				var difference = this._highlightLineObj.indexOfData - this._dataStartIndex;
				if (difference > -(this._dataTotalLength)) {
					//差分が総データ数より大きい場合は、差分 + 1し次の行が先頭になるよう調整する
					difference++;
				}

				if (this._dataTotalLength > this._highlightLineObj.indexOfData) {
					//次の行をハイライトするためindexを1加算
					this._highlightLineObj.indexOfData++;
				}

				//次の行が先頭になるようスクロールする
				this._layout.moveIndex(difference);

			} else {

				//選択行が表示されているリスト内に存在する場合
				if (this._$renderMenuList.length - 1 > this._highlightLineObj.indexOfDom) {

					//ハイライトを解除
					if (this._highlightLineObj.$li !== null) {
						this._removeHighlight(this._highlightLineObj.$li);
					}

					//次の行をハイライトする
					this._highlightLineObj.indexOfDom++;
					this._setHighlight($(this._$renderMenuList[this._highlightLineObj.indexOfDom]));

				} else {
					//選択行が表示されているリストに存在しない場合

					//次の行が存在する場合
					if (this._dataTotalLength - 1 > this._highlightLineObj.indexOfData) {
						//次の行をハイライトするためindexを1加算
						this._highlightLineObj.indexOfData++;
						//1行次にスクロールする
						this._layout.moveIndex(1);
					}
				}
			}
		},


		/**
		 * 現在選択中のリストアイテムの前にあるリストアイテムを選択状態にします
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		highlightPrev: function() {

			//選択行がある かつ 表示範囲の中にハイライト行が存在しない場合
			//次の行を先頭にするようスクロールし、ハイライトする
			if (this._highlightLineObj.$li !== null
					&& (this._dataStartIndex > this._highlightLineObj.indexOfData || this._dataEndIndex < this._highlightLineObj.indexOfData)) {

				//差分行数を求める
				var difference = this._highlightLineObj.indexOfData - this._dataStartIndex;
				if (difference > -(this._dataTotalLength)) {
					//差分が総データ数より大きい場合は、差分 - 1し前の行が先頭になるよう調整する
					difference--;
				}

				if (0 < this._highlightLineObj.indexOfData) {
					//前の行をハイライトするためindexを1減算
					this._highlightLineObj.indexOfData--;
				}

				//次の行が先頭になるようスクロールする
				this._layout.moveIndex(difference);

			} else {

				//選択行が表示されているリスト内に存在する場合
				if (0 < this._highlightLineObj.indexOfDom) {

					//ハイライトを解除
					if (this._highlightLineObj.$li !== null) {
						this._removeHighlight(this._highlightLineObj.$li);
					}

					//前の行をハイライトする
					this._highlightLineObj.indexOfDom--;
					this._setHighlight($(this._$renderMenuList[this._highlightLineObj.indexOfDom]));

				} else {
					//選択行が表示されているリストに存在しない場合

					//前の行が存在場合
					if (0 < this._highlightLineObj.indexOfData) {
						//前の行をハイライトするためindexを1減算
						this._highlightLineObj.indexOfData--;
						//1行前にスクロールする
						this._layout.moveIndex(-1);
					}
				}
			}
		},

		/**
		 * ドロップダウンリスト描画範囲変更イベント
		 * <p>
		 * 描画されているliタグを取得します
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		'{rootElement} renderList': function(context) {

			this._$renderMenuList = this._$root.find('li');

			var evArg = context.evArg;

			//描画範囲を設定
			this._dataStartIndex = evArg.start;
			this._dataEndIndex = evArg.end;

			//描画範囲にハイライト対象がある場合は、ハイライト処理をする
			this._searchHighlightLi();
		},
		/**
		 * 描画されているliタグでハイライト対象を検索し、該当ありの場合にハイライトします
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_searchHighlightLi: function() {

			jQuery.each(this._$renderMenuList, this.own(function(idx, li) {
				var $li = $(li);
				var dataIndex = idx + this._dataStartIndex;

				if (dataIndex === this._highlightLineObj.indexOfData) {
					this._setHighlight($li);
					return false;
				}

				var val = $li.data('value').toString();
				var parentVal = this._$parent.val();
				//テキストの入力値に完全一致するユニークな行がある場合はハイライト
				if (val === parentVal && this._$renderMenuList.length === 1) {
					this._setHighlight($li);
					this.selectMenu();
					return false;
				}
			}));
		},

		/**
		 * 選択中の値をテキストボックスに反映します
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		selectMenu: function() {
			if (this._highlightLineObj.$li === null) {
				return;
			}
			// テキストボックスに表示されている値を反映する
			this._$parent.val(this._highlightLineObj.$li.text()).change();

			// hidden要素にvalueを反映する
			this.setHiddentValue(this._highlightLineObj.$li.data('value'));

			//選択要素を保持する
			this.setSelectedLi(this._highlightLineObj.$li, this._highlightLineObj.indexOfData);
		},
		/**
		 * hidden要素にvalueを反映する
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		setHiddentValue: function(value) {
			this._$hiddenElement.val(value);
		},
		/**
		 * オーバーレイ要素のサイズをウィンドウサイズに合わせます
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_resizeOverlay: function() {
			// 互換モードは考慮しない
			this._$overlay.css({
				width: document.documentElement.scrollWidth, // innerやoffsetから取得すると余分な幅ができてスクロールバーが表示されてしまうため、scrollWidthから取得する
				height: Math.max(document.documentElement.clientHeight,
						document.documentElement.scrollHeight), //ie8対策 window.innerHeight→document.documentElement.clientHeight
			});
		},
		/**
		 * ドロップダウンリストの幅をテキストボックス+ボタンの幅に合わせます
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_resizeMenu: function() {
			this._$root.width((this._$parent.outerWidth() + this._$btn.outerWidth())
					- (this._rootLeftBorderWidth + this._rootRightBorderWidth));
		},

		/**
		 * 指定した要素を選択状態にします
		 *
		 * @param $el
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_setHighlight: function($el) {
			$el.addClass(this._dropdownMenuHighlightClassName);
			this._setHighlightIndex($el);
		},
		/**
		 * ハイライト表示を除去します
		 *
		 * @param $el
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_removeHighlight: function($el) {
			if ($el) {
				$el.removeClass(this._dropdownMenuHighlightClassName);
			}
		},
		/**
		 * ドロップダウンリスト要素と 引数の要素を比較し、valueが同じ要素の表示順をhighlightIndexに保持します
		 *
		 * @param $el
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_setHighlightIndex: function($el) {

			jQuery.each(this._$renderMenuList, this.own(function(idx, li) {
				var $li = $(li);
				if ($li.data('value') === $el.data('value')) {
					this._highlightLineObj.$li = $li;
					this._highlightLineObj.indexOfDom = idx;
					this._highlightLineObj.indexOfData = this._dataStartIndex + idx;
					return false;
				}
			}));
		},
		/**
		 * オーバーレイクリックイベント ドロップダウンリストを非表示にします
		 * <p>
		 * ルート要素上でクリックされた場合は、カーソルを末尾に移動します
		 *
		 * @param ev
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_overlayHitHandler: function(ev) {
			this.hideMenu();
			// オーバーレイの裏側にある要素を取得する
			var $e = $(document.elementFromPoint(ev.pageX, ev.pageY));

			$e.is(':button') ? $e.click() : $e.focus();
		},
		/**
		 * ドロップダウンボタン押下イベント
		 * <p>
		 * ドロップダウンリストを表示または非表示にします
		 *
		 * @param event
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_dropDownBtnClickHandler: function(event) {
			this.isShowMenu() ? this.hideMenu() : this.showMenu();
			this.narrowDown();
		},
		/**
		 * 所属するformのsubmitイベント
		 * <p>
		 * コンボボックスのinput要素をformから削除します
		 *
		 * @parent event
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_submitEventHandler: function() {
			//隠し要素にname属性を追加
			this._$hiddenElement.attr('name', this._$parent.attr('name'));
			//テキストボックスを削除
			this._$parent.remove();
		},
		/**
		 * 選択（click または enter）されたli要素のdataを返します
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		getSelectedLiData: function() {
			if (this._selectedLineObj.$li !== null) {
				return this._dataSource.getCachedData(this._selectedLineObj.indexOfData);
			}
			return null;
		},
		/**
		 * 選択（click または enter）されたli要素を設定します
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		setSelectedLi: function($li, indexOfData) {
			this._selectedLineObj.$li = $li;
			this._selectedLineObj.indexOfData = indexOfData;
		},
		/**
		 * 選択した li要素 をクリアします <pr>
		 *
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		clearSelectedLi: function() {
			this._selectedLineObj.$li = null;
			this._selectedLineObj.indexOfData = -1;
		},

		clearHighlightLi: function() {
			if (this._highlightLineObj.$li !== null) {
				this._removeHighlight(this._highlightLineObj.$li);
			}

			this._highlightLineObj.$li = null;
			this._highlightLineObj.indexOfData = -1;
			this._highlightLineObj.indexOfDom = -1;
		}
	};

	// =========================================================================
	//
	// 外部公開
	//
	// =========================================================================
	h5.core.expose(dropDownListControllerDef);
})(jQuery);

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

	// =========================================================================
	//
	// メインコード（コントローラ・ロジック等）
	//
	// =========================================================================
	/**
	 * コンボボックス全体を管理するコントローラ
	 *
	 * @class h5.ui.components.combobox.ComboBoxRootController
	 */
	var comboBoxRootController = {
		__name: 'h5.ui.components.combobox.ComboBoxRootController',

		_drowDownListController: null,

		__ready: function(context) {
			this._drowDownListController = context.args.dropDownListController;
		},

		/**
		 * ドロップダウンボタン押下イベント
		 * <p>
		 * ドロップダウンリストを表示または非表示にします
		 *
		 * @param event
		 * @memberOf h5.ui.components.combobox.ComboBoxRootController
		 */
		'div[name="combo-box-dropdown-button"] click': function(event) {
			this._drowDownListController._dropDownBtnClickHandler(event);
		},

		clickComboBoxDropdownButton: function() {
			this.$find('div[name="combo-box-dropdown-button"]').trigger('click');
		}
	};
	// =========================================================================
	//
	// 外部公開
	//
	// =========================================================================
	h5.core.expose(comboBoxRootController);

})(jQuery);

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
	//絞り込みが実行されるまでの遅延時間(ms)
	var NARROWDOUN_THRESHOLD = 100;

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

	// =========================================================================
	//
	// メインコード（コントローラ・ロジック等）
	//
	// =========================================================================
	/**
	 * コンボボックス機能を制御するコントローラ
	 *
	 * @class h5.ui.components.combobox.ComboBoxController
	 */
	var comboBoxController = {
		__name: 'h5.ui.components.combobox.ComboBoxController',
		/** INPUT要素を包含する要素(ルート)に適用するクラス名 */
		_baseClassName: 'combobox-root',
		/** INPUT要素に適用するクラス名 */
		_comboboxInputClassName: 'combobox-input',
		/** ドロップダウンリスト要素に適用するクラス名 */
		_comboBoxMenuClassName: 'combobox-menu',
		/** ドロップダウンリストを包含する要素に適用するクラス名 */
		_comboBoxMenuWrapperClassName: 'combobox-menu-wrapper',
		/** 絞り込みの遅延時間(ms) */
		_narrowDounThreshold: NARROWDOUN_THRESHOLD,
		/** ドロップダウンリストコントローラ */
		_dropDownListController: null,
		/** 絞り込みタイマーID */
		_narrowDounId: null,
		/** jQuery化したルート要素 */
		_$input: null,
		/** コンボボックスの選択値を格納する隠し要素 */
		_$hiddenElement: null,

		init: function(context) {

			//rootElementのチェック
			if (!this._isInputElement(this.rootElement)) {
				return;
			}

			var args = context;

			this._$input = $(this.rootElement).addClass(this._comboboxInputClassName);

			var $parent = this._$input.parent();
			var $rootWrap = $('<div></div>').addClass(this._baseClassName);

			//hidden エレメントを取得する
			var $hidden = this._getHiddenElement();
			if ($hidden !== null) {
				//hidden エレメントがある場合は、そのまま使う
				this._$hiddenElement = $hidden;
			} else {
				//hidden エレメントがない場合は、作成する
				this._$hiddenElement = this._createHiddenElement();
			}

			var $menuWrap = $('<div></div>').addClass(this._comboBoxMenuWrapperClassName);
			var $menu = $('<div></div>').addClass(this._comboBoxMenuClassName).hide();

			// ドロップダウンリストがテキストボックスの真下に表示されるよう設定する
			$menu.css('top', this._$input.outerHeight());
			$menu.css('left', 0);

			//テキストボックス、hiddenタグをDIVでくるむ
			$menuWrap.append($menu);
			$rootWrap.append($menuWrap);
			$rootWrap.append(this._$input);
			$rootWrap.append(this._$hiddenElement);


			$parent.append($rootWrap);

			var dropDownParam = {
				parent: this.rootElement,
				hiddenElement: this._$hiddenElement
			};

			$.extend(dropDownParam, args);

			this._dropDownListController = h5.core.controller($menu,
					h5.ui.components.combobox.DropDownListController, dropDownParam);

			var rootComboParam = {
				dropDownListController: this._dropDownListController
			};

			this._comboboxRootController = h5.core.controller($rootWrap,
					h5.ui.components.combobox.ComboBoxRootController, rootComboParam);
			var def = h5.async.deferred();
			h5.async.when(this.readyPromise, this._dropDownListController.readyPromise,
					this._comboboxRootController.readyPromise).done(this.own(function() {
				def.resolve(this);
			}));
			this.initComboboxPromise = def.promise();
			return this.initComboboxPromise;
		},

		_getHiddenElement: function() {
			//input要素と同じname属性でtype="hidden"のinput要素を検索
			var $inputNextElement = this._$input.next('input[type="hidden"][data-name="'
					+ this._$input.attr('name') + '"]');
			if ($inputNextElement.length !== 0) {
				return $inputNextElement;
			}
			return null;
		},

		_createHiddenElement: function() {
			//コンボボックスの選択値を格納する隠しinput要素を作成
			//name属性は、テキストボックス（root）と同じにする
			return $('<input type="hidden" data-name="' + this._$input.attr("name") + '" value="'
					+ this._$input.val() + '">');
		},

		// コンボボックスにfocusしているときは、input要素からfocusoutイベントをあげないようにする。
		'{rootElement} focusout': function(context, $el) {
			// TODO: activeElementはChromeではbodyになってしまうので、要別対応
			if (this._$input.closest('.combobox-root').find(document.activeElement).size() > 0) {
				context.event.stopPropagation();
			}
		},
		/**
		 * 上下矢印キー押下されたらカーソルを移動します
		 *
		 * @param context
		 * @param $el
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		'{rootElement} keydown': function(context, $el) {
			var keyCode = context.event.which;

			if (keyCode === 9) { // shift
				this._dropDownListController.hideMenu();
				return;
			}

			if (keyCode === 38) { // arrow-up
				this._dropDownListController.highlightPrev();
				return;
			}
			if (keyCode === 40) { // arrow-down
				//メニューが非表示の場合は▼ボタンクリックと同様に動く
				if (!this._dropDownListController.isShowMenu()) {
					this._comboboxRootController.clickComboBoxDropdownButton();
				}
				this._dropDownListController.highlightNext();
				return;
			}

			if (keyCode === 13) { //enter
				context.event.preventDefault();
				return;
			}

			if (keyCode !== 38 && keyCode !== 40) {
				return;
			}
		},
		/**
		 * 入力された値と一致するリストアイテムをドロップダウンリストに表示します
		 * <p>
		 * エンターキーが押下されたら、選択中の値をテキストボックスに反映します
		 *
		 * @param context
		 * @param $el
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		'{rootElement} keyup': function(context, $el) {
			var keyCode = context.event.which;

			if (keyCode === 13) { // enter
				context.event.preventDefault();

				this._dropDownListController.selectMenu();
				this._dropDownListController.hideMenu();
				this._$input.focus();
				return;
			}

			// backspace, space, del, [a-z], [0-9], テンキー, 記号 以外のキーは受け付けないようにする
			if (!(keyCode === 8 || keyCode === 32 || keyCode === 46
					|| (48 <= keyCode && keyCode <= 57) || (65 <= keyCode && keyCode <= 90)
					|| (96 <= keyCode && keyCode <= 105) || (186 <= keyCode && keyCode <= 192)
					|| (219 <= keyCode && keyCode <= 222) || keyCode === 226)) {
				return;
			}

			// Chromeでサジェストするとドロップダウンリストのスクロールがなぜかカクつくため、一旦ドロップダウンリストを非表示にしてから検索処理を行う
			this._dropDownListController._$root.hide();

			var val = $el.val();

			if (val == null) {
				val = '';
			} else {
				// 正規表現リテラルをエスケープする
				val = val.replace(/[\\\*\+\.\?\{\}\(\)\[\]\^\$\-\|\/]/g, function(val) {
					return '\\' + val;
				});
			}

			if (this._narrowDounId) {
				clearTimeout(this._narrowDounId);
				this._narrowDounId = null;
			}

			this._narrowDounId = setTimeout(this.own(function() {

				//検索条件が変わったので全てのハイライトを削除
				this._dropDownListController.clearHighlightLi();

				//検索条件がかわったので選択要素をクリア
				this._dropDownListController.clearSelectedLi();

				//絞り込み処理実行
				this._dropDownListController.narrowDown();

				//メニュー表示し、スクロール位置を先頭にする
				this._dropDownListController.showMenu();
				this._dropDownListController.resetMenu();

			}), this._narrowDounThreshold);
		},
		/**
		 * コンボボックス機能を無効にします
		 *
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		disable: function() {
			this._$input.prop('disabled', 'disabled');
			this.disableListeners();
			this._comboboxRootController.disableListeners();
			this._dropDownListController.disableListeners();
		},
		/**
		 * コンボボックスの機能を有効にします
		 *
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		enable: function() {
			this._$input.prop('disabled', '');
			this.enableListeners();
			this._comboboxRootController.enableListeners();
			this._dropDownListController.enableListeners();
		},
		/**
		 * コンボボックスを破棄します
		 *
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		destroy: function() {
			var dropDownListController = this._dropDownListController;
			var $input = this._$input;

			this._$input.removeClass(this._comboboxInputClassName);
			this.dispose();
			dropDownListController.dispose();

			$input.siblings().remove();
			$input.unwrap();
		},
		/**
		 * 指定されたデータからドロップダウンリストのリストアイテムを再生成します
		 * <p>
		 * テキストボックスに入力がある場合は、その値で検索を実行します。
		 *
		 * @param newItems
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		refresh: function(args) {
			//ドロップダウンリスト初期化
			this._dropDownListController.refreshDataSource(args);
		},

		/**
		 * 指定した要素が入力要素かどうかチェックします
		 *
		 * @returns コンボボックスコントローラ
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_isInputElement: function(elem) {
			if (!elem) {
				return false;
			}

			var type = typeof elem;

			if (type !== 'string' && type !== 'object') {
				return false;
			}

			var $elem = $(elem);

			if (!($elem.is('input') && $elem
					.is('[type="text"], [type="tel"], [type="url"], [type="email"], [type="number"]'))) {
				return false;
			}
			return true;
		},

		getText: function() {
			return this._$input.val();
		},

		getValue: function() {
			return this._$hiddenElement.val();
		},

		setFilter: function(filter) {
			this._dropDownListController.setFilter(filter);
		},

		getSelectedItem: function() {
			var data = this._dropDownListController.getSelectedLiData();
			return data;
		}
	};

	// =========================================================================
	//
	// 外部公開
	//
	// =========================================================================
	h5.core.expose(comboBoxController);

})(jQuery);
