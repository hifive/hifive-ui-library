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
	/**
	 * コンボボックスのドロップダウンリストの表示を管理するコントローラ
	 * 
	 * @class
	 * @memberOf h5.ui.components.combobox
	 * @name h5.ui.components.combobox.ListLayoutController
	 */
	var listLayoutController = {

		// --- Setting --- //

		/**
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		__name: 'h5.ui.components.combobox.ListLayoutController',


		// --- Property --- //
		/**
		 * 表示データ
		 * 
		 * @private
		 * @type DataModel
		 * @name _source
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		_source: null,

		/**
		 * 行の高さ
		 * 
		 * @private
		 * @type Number
		 * @name _rowHeight
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		_rowHeight: 0,

		/**
		 * スクロール量とデータ描画位置を管理するコントローラ（IndexBaseScrollStrategy）
		 * 
		 * @private
		 * @type Controloler
		 * @name _scrollStrategy
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		_scrollStrategy: null,

		/**
		 * データの描画開始位置
		 * 
		 * @private
		 * @type Number
		 * @name _start
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		_start: 0,

		/**
		 * データの描画終了位置
		 * 
		 * @private
		 * @type Number
		 * @name _end
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		_end: 0,

		/**
		 * データ描画タイマーID
		 * 
		 * @private
		 * @type Number
		 * @name _renderWaitTimerId
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		_renderWaitTimerId: null,

		/**
		 * データの変更イベントハンドラ
		 * 
		 * @private
		 * @type Function
		 * @name _changeSourceHandler
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		_changeSourceHandler: null,

		/**
		 * 初期化処理のDeferredオブジェクト
		 * 
		 * @private
		 * @type Deferred
		 * @name _initializeDeferred
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		_initializeDeferred: null,

		/**
		 * 描画領域のコントローラ
		 * 
		 * @private
		 * @type Object
		 * @name _boxController
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		_boxController: null,

		/**
		 * スクロールのコントローラ
		 * 
		 * @private
		 * @type Object
		 * @name _barController
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		_barController: null,

		/**
		 * 描画領域エレメント
		 * 
		 * @private
		 * @type Object
		 * @name boxRootElement
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		boxRootElement: null,

		/**
		 * スクロールエレメント
		 * 
		 * @private
		 * @type Object
		 * @name barRootElement
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		barRootElement: null,

		// --- Private Method --- //

		/**
		 * リスト内容を描画する
		 * <p>
		 * sourceがキャッシュされている場合はそのまま描画し、キャッシュされていない場合はロード後に描画する
		 * <p>
		 * 描画終了後はrenderListイベントが発生する
		 * <p>
		 * ロード完了後はloadDataEndイベントが発生する
		 * 
		 * @private
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
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
					//描画する
					that._boxController.render(data).done(function() {
						that._boxController.endLoad();
						that.trigger('renderList', renderListEventArg);
					});
				});
				return;
			}

			if (this._renderWaitTimerId !== null) {
				clearTimeout(this._renderWaitTimerId);
			}

			//描画領域を隠してローディング表示を描画する
			this._boxController.beginLoad();
			that.trigger('loadDataBegin');

			this._renderWaitTimerId = setTimeout(function() {

				var timerId = that._renderWaitTimerId;

				that._source.sliceAsync(start, end).then(function(data) {
					if (timerId !== that._renderWaitTimerId) {
						return;
					}
					that._renderWaitTimerId = null;

					//描画する
					that._boxController.render(data);
					//ローディング表示をやめて描画領域を表示する。
					that._boxController.endLoad();

					that.trigger('loadDataEnd');
					that.trigger('renderList', renderListEventArg);
				});

			}, RENDER_WAIT_TIME);
		},

		/**
		 * スクロール処理
		 * <p>
		 * スクロール量にあわせてスクロールバーのスクロール位置を調整し、リスト内容を再描画する
		 * 
		 * @private
		 * @param {Number} scrollDiff スクロール量
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		_scroll: function(scrollDiff) {
			var windowSize = $(this.__rootElement).height();
			var totalLength = this._source.getTotalLength();

			var dataInfo = {
				totalCells: totalLength,
				defaultCellSize: this._rowHeight
			};

			//スクロール量からsourceの描画位置を取得する
			var scrollInfo = this._scrollStrategy.scroll(scrollDiff, windowSize, dataInfo);

			//スクロールバーの位置を調整する
			this._barController.setScrollPosition(scrollInfo.scrollPosition);
			this._barController.setScrollSize(scrollInfo.scrollSize);

			var index = scrollInfo.index;

			// 柏村追記：プライベートメソッド化
			//表示行数を取得する
			var len = this._getDispDataLength(windowSize);

			//描画位置を設定する
			if (scrollInfo.isEnd) {
				this._start = index - len;
				if (this._start < 0) {
					this._start = 0;
				}
				this._end = index;
				this._boxController.setVerticalPositionBottom();
			} else {
				this._start = index;
				this._end = index + len;
				if (totalLength < this._end) {
					this._end = totalLength;
				}
				this._boxController.setVerticalPosition(scrollInfo.offset);
			}

			this._render();
		},

		// 柏村追記：プライベートメソッド化
		/**
		 * 表示行数を取得する
		 * 
		 * @private
		 * @param {Object} windowSize rootElementの高さ
		 * @returns {Number} 表示行数
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		_getDispDataLength: function(windowSize) {
			return Math.ceil(windowSize / this._rowHeight);
		},

		// --- Life Cycle Method --- //

		/**
		 * Controllerのconstructライフサイクル。
		 * 
		 * @private
		 * @param {Object} context
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		__construct: function(context) {
			this._initializeDeferred = h5.async.deferred();

			this.__construct_box(context);
			this.__construct_bar(context);
		},

		/**
		 * Controllerのinitライフサイクル。必要な要素の生成、コントローラ化を行う。
		 * 
		 * @private
		 * @param {Object} context
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		__init: function(context) {

			// TODO: 子コントローラの parentController が null になっていて問題になる可能性あり

			var $root = $(this.__rootElement);

			var $box = $('<div></div>').addClass(BOX_CLASS).css({
				height: '100%',
				float: 'left'
			}).appendTo(this.__rootElement);
			this.boxRootElement = $box[0];

			var $bar = $('<div></div>').addClass(BAR_CLASS).css({
				height: '100%'
			}).appendTo(this.__rootElement);
			this.barRootElement = $bar[0];

			//			this._boxController = h5.core.controller($box,
			//					h5.ui.components.combobox.VirtualScrollBoxController);
			//			this._barController = h5.core.controller($bar,
			//					h5.ui.components.combobox.VerticalScrollBarController);

			this._boxController = this;
			this._barController = this;

			this.__init_box(context);
			this.__init_bar(context);
			//			this.__init_bar(context).done(function() {


			//			return this._barController.initPromise.then(function() {
			var boxWidth = $root.width() - h5.ui.components.combobox.getScrollBarWidth();
			$box.width(boxWidth);
			//			});
		},

		/**
		 * Controllerのunbindライフサイクル。初期化時に生成した要素の削除を行う
		 * 
		 * @private
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		__unbind: function() {
			if (this._source) {
				this._source.dispose();
			}

			if (this._boxController && this._boxController.__unbind_box) {
				this._boxController.__unbind_box();
			}
			if (this._barController && this._barController.__unbind_bar) {
				this._barController.__unbind_bar();
			}

			clearTimeout(this._renderWaitTimerId);
			$(this.__rootElement).empty();
		},

		// --- Event Handler --- //

		//h5scroll イベントハンドラ
		//マウスホイールの移動量分スクロールして再描画する
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

			this._focusText();
		},

		//mousewheelイベントハンドラ
		//h5scroll イベントを発生させる
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

		/**
		 * 初期化時処理
		 * <p>
		 * 処理に必要なプライベート変数を設定する
		 * 
		 * @param {DataModel} source データモデル
		 * @param {Function} renderer 描画関数
		 * @param {Number} rowHeight 行の高さ
		 * @param {Controller} scrollStrategy スクロール管理コントローラ
		 * @returns {Promise} 初期化処理のPromiseオブジェクト
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		init: function(source, renderer, rowHeight, scrollStrategy) {

			this._source = source;
			this._scrollStrategy = scrollStrategy;

			var that = this;

			this._changeSourceHandler = this.own(function() {
				this.refresh();
			});

			this.initPromise.then(function() {
				that._boxController.init_box(renderer);
				that._rowHeight = rowHeight;

				that._source.addEventListener('changeSource', that._changeSourceHandler);
			});

			var promises = [this.readyPromise, this._boxController.readyPromise];

			h5.async.when(promises).then(function() {
				that._initializeDeferred.resolve();
			});

			return this.getInitializePromise();
		},

		/**
		 * スクロールをリフレッシュする
		 * <p>
		 * スクロール位置を先頭へ戻す
		 * 
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		refresh: function() {
			this._scrollStrategy.resetPageInfo();
			this._scroll(0);
		},

		/**
		 * 描画領域を隠してローディング表示を描画する
		 * 
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		beginLoad: function() {
			this._boxController.beginLoad();
		},

		/**
		 * ローディング表示をする DIV のエレメントを取得する
		 * 
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		getLoadingInfoDiv: function() {
			this._boxController.getLoadingDiv();
		},

		/**
		 * 行数を指定してスクロールを行う
		 * 
		 * @param {Number} diff 行数
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		moveIndex: function(diff) {
			var windowSize = $(this.__rootElement).height();
			var scrollDiff = this._scrollStrategy.indexDiffToScrollDiff(diff, windowSize);
			this._scroll(scrollDiff);
		},

		/**
		 * 検索条件を変更する
		 * 
		 * @param {Object} searchOptions 検索条件
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		changeSearchOptions: function(searchOptions) {
			var windowSize = $(this.__rootElement).height();

			this._source.changeSearchOptions($.extend({
				cachePageSize: this._getDispDataLength(windowSize)
			}, searchOptions));
		},

		/**
		 * データを設定する
		 * 
		 * @param {DataModel} dataSource データモデル
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		setDataSource: function(dataSource) {
			if (this._source !== null) {
				this._source.removeEventListener('changeSource', this._changeSourceHandler);

				this._source = dataSource;
				this._source.addEventListener('changeSource', this._changeSourceHandler);

				this.refresh();
			}
		},

		/**
		 * 初期化処理のPromiseを取得する
		 * 
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		getInitializePromise: function() {
			return this._initializeDeferred.promise();
		}

	};

	// =========================================================================
	//
	// 外部公開
	//
	// =========================================================================
	//	h5.core.expose(listLayoutController);


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
	// リスト1行の高さのデフォルト値
	var DEFAULT_LIST_HEIGHT = 20;

	// リスト内要素のテンプレート
	var MENU_TEMPLATE = '<ul style="list-style-type:none; margin:0; padding:0;">'
			+ '[% for (var i = 0, ilen = items.length; i < ilen; i++) { %]'
			+ '[%   var data = items[i], ret = formatter(data, i), label = (typeof ret === "string" ? ret : "&nbsp;") %]'
			+ '<li style="width:100%; height: [%= height %]px;"'
			+ ' class="[%= matchedClass %] [%= activeClass %]" data-value="[%= data["value"] %]">[%:= label %]</li>'
			+ '[% } %]' + '</ul>';

	//リストの表示方向
	var LIST_POSITION_UPPER = 'upper';
	var LIST_POSITION_LOWER = 'lower';

	/** テンプレート名 */
	var MENU_TEMPLATE_NAME = 'comboboxMenu';
	/** 画面に表示されているリストアイテムに適用するクラス名 */
	var ACTIVE_LIST_CLASS_NAME = 'active';
	/** 検索条件に一致したリストアイテムに適用するクラス名 */
	var MATCHED_LIST_CLASS_NAME = 'matched';
	/** ドロップダウンリスト表示時に一緒に表示するオーバーレイの要素に適用するクラス名 */
	var OVERLAY_CLASS_NAME = 'combobox-dropdown-menu-overlay';
	/** ドロップダウンリストのハイライトする要素に適用するクラス名 */
	var HIGHLIGHT_CLASS_NAME = 'combobox-dropdown-menu-highlight';
	/** ドロップダウンリストを非表示にするクラス名 */
	var MENU_VISIBLE_CLASS_NAME = 'combobox-dropdown-menu-visibility-hidden';

	// =============================
	//
	// スコープ内静的プロパティ
	//
	// =============================
	var defaultSelectedLineObj = {
		$li: null,
		indexOfData: -1
	};
	var defaultHighlightObj = {
		$li: null,
		indexOfData: -1,
		indexOfDom: -1
	};

	// innerやoffsetから取得すると余分な幅ができてスクロールバーが表示されてしまうため、scrollWidthから取得する
	var windowWidth = document.documentElement.scrollWidth;
	//ie8対策 window.innerHeight→document.documentElement.clientHeight
	var windowHeight = Math.max(document.documentElement.clientHeight,
			document.documentElement.scrollHeight);

	// =============================
	// スコープ内静的変数
	// =============================

	// =============================
	// スコープ内静的関数
	// =============================

	function defaultFilter(arg, data) {
		return data.value.indexOf(arg) === 0;
	}

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

	// =========================================================================
	//
	// メインコード（コントローラ・ロジック等）
	//
	// =========================================================================
	/**
	 * ドロップダウンリストを制御するコントローラ
	 * 
	 * @class
	 * @memberOf h5.ui.components.combobox
	 * @name DropDownListController
	 */
	var dropDownListControllerDef = {
		__name: 'h5.ui.components.combobox.DropDownListController',

		/**
		 * コンボボックスのテキストボックス
		 * 
		 * @private
		 * @type Object
		 * @name _$root
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_$parent: null,

		/**
		 * コンボボックスのドロップダウンリスト
		 * 
		 * @private
		 * @type Object
		 * @name _$root
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_$root: null,

		/**
		 * htmlのbody
		 * 
		 * @private
		 * @type Object
		 * @name _$btn
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_$body: null,

		/**
		 * コンボボックスのドロップダウンボタン
		 * 
		 * @private
		 * @type Object
		 * @name _$btn
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_$btn: null,

		/**
		 * オーバーレイ
		 * 
		 * @private
		 * @type Object
		 * @name _$overlay
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_$overlay: null,

		/**
		 * 一回の読込みでドロップダウンに表示するアイテム数
		 * 
		 * @private
		 * @type Number
		 * @name _maxItems
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_maxItems: 0,

		/**
		 * テキストボックスに適用したスタイル情報
		 * 
		 * @private
		 * @type Object
		 * @name _restoreStyles
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_restoreStyles: {},

		/**
		 * リストアイテムに表示するテキストを生成する関数
		 * 
		 * @private
		 * @type Function
		 * @name _listItemTextFormatter
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_listItemTextFormatter: null,

		/**
		 * 検索対象に含めるプロパティ名
		 * 
		 * @private
		 * @type Object
		 * @name _searchProps
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_searchProps: null,

		/**
		 * メニューの左枠線幅
		 * 
		 * @private
		 * @type Number
		 * @name _rootLeftBorderWidth
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_rootLeftBorderWidth: null,

		/**
		 * メニューの右枠線幅
		 * 
		 * @private
		 * @type Number
		 * @name _rootRightBorderWidth
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_rootRightBorderWidth: null,

		/**
		 * リサイズタイマーID
		 * 
		 * @private
		 * @type Number
		 * @name _resizeTimerId
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_resizeTimerId: null,

		/**
		 * 仮想スクロール
		 * 
		 * @private
		 * @type Object
		 * @name _virtualScroll
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_virtualScroll: null,

		/**
		 * postする値を格納するhidden要素
		 * 
		 * @private
		 * @type Object
		 * @name _$hiddenElement
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_$hiddenElement: null,

		/**
		 * ドロップダウンリストの表示を管理するコントローラ
		 * 
		 * @private
		 * @type Controller
		 * @name _layout
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_layout: null,

		/**
		 * 表示データを管理するデータモデル
		 * 
		 * @private
		 * @type DataModel
		 * @name _dataSource
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_dataSource: null,

		/**
		 * スクロール量とデータ描画位置を管理するコントローラ（IndexBaseScrollStrategy）
		 * 
		 * @private
		 * @type Controloler
		 * @name _scrollStrategy
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_scrollStrategy: null,

		/**
		 * データ全体の長さ
		 * 
		 * @private
		 * @type Number
		 * @name _dataTotalLength
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_dataTotalLength: null,

		/**
		 * 検索条件
		 * <p>
		 * コンボボックス作成時に任意で指定される検索条件. _postDataが指定された場合は、フィルター条件にデフォルトで含める
		 * 
		 * @private
		 * @type Object
		 * @name _postData
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_postData: null,

		/**
		 * リストの表示方向
		 * 
		 * @private
		 * @type String
		 * @name _listPosition
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_listPosition: null,

		/**
		 * 描画されているliタグ
		 * 
		 * @private
		 * @type Object
		 * @name _$renderMenuList
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_$renderMenuList: null,

		/**
		 * 直前のリスト内でのマウスの位置
		 * 
		 * @private
		 * @type Object
		 * @name _mousePos
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_mousePos: null,

		/**
		 * 選択されているli要素
		 * 
		 * @private
		 * @type Object
		 * @name _selectedLineObj
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_selectedLineObj: $.extend(true, {}, defaultSelectedLineObj),

		/**
		 * ハイライト要素
		 * 
		 * @private
		 * @type Object
		 * @name _selectedLineObj
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_highlightLineObj: $.extend(true, {}, defaultHighlightObj),

		/**
		 * ドロップダウンリスト表示フラグ
		 * <p>
		 * true:表示する false:表示しない
		 * 
		 * @private
		 * @type Boolean
		 * @name _disabled
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_disabled: false,

		/**
		 * マウスポインタの位置
		 * 
		 * @private
		 * @type Object
		 * @name _lastMousePos
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_lastMousePos: null,

		/**
		 * 描画開始位置
		 * 
		 * @private
		 * @type Number
		 * @name _dataStartIndex
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_dataStartIndex: 0,

		/**
		 * 描画終了位置
		 * 
		 * @private
		 * @type Number
		 * @name _dataEndIndex
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_dataEndIndex: 0,

		/**
		 * 総件数設定イベントハンドラ
		 * 
		 * @private
		 * @type Function
		 * @name _setDataTotalLengthWrapper
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_setDataTotalLengthWrapper: null,

		// --- プライベートメソッド --- //

		/**
		 * 指定されたデータからドロップダウンリストのリストアイテムを生成します
		 * 
		 * @param args
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_initDropDownList: function(args) {

			//dataSourceを作成する
			this._createDataSource(args);

			//3bchi-grid strategyを取得
			this._scrollStrategy = h5.ui.components.combobox.createIndexBaseScrollStrategy();

			//プルダウンを囲むdivへ3bchi-grid layoutをバインドする
			//			this._layout = h5.core.controller(this.rootElement_dropdown,
			//					h5.ui.components.combobox.ListLayoutController);
			this._layout = this;
			//ドロップダウンリストを初期化する
			this._layout.init_list(this._dataSource, this.own(this._rendererFunction),
					DEFAULT_LIST_HEIGHT, this._scrollStrategy);

			return this._layout.getInitializePromise();

		},

		/**
		 * 指定されたデータからDataSourceを初期化します
		 * 
		 * @param args
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_createDataSource: function(args) {
			if (args.data) {
				//引数がdataの場合はlocalDataSourceを作成する
				this._dataSource = h5.ui.components.virtualScroll.data
						.createLocalDataSource(args.data);

				//フィルター設定
				if (args.filter && jQuery.isFunction(args.filter)) {
					this.setFilter(args.filter);
				} else {
					this._dataSource.setFilterFunction('value', defaultFilter);
				}

			} else if (args.url) {
				//引数がurlの場合はLazyLoadDataSourceを作成する
				this._dataSource = h5.ui.components.virtualScroll.data.createLazyLoadDataSource(
						args.url, args.ajaxSettings);
				this._postData = args.postData;
			} else {
				throw new Error('urlまたはdataを引数に指定してください');
			}
		},

		_clearResizeTimeout: function() {
			if (this._resizeTimerId) {
				clearTimeout(this._resizeTimerId);
				this._resizeTimerId = null;
			}
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
				//テキストの入力値完全一致するユニークな行がある場合はハイライト
				if (this._hasSingleExactMatchingVal(val)) {
					this._setHighlight($li);
					this.selectMenu();
					return false;
				}
			}));
		},

		/**
		 * テキストの入力値完全一致するユニークな行があるか
		 * 
		 * @param val
		 * @returns {Boolean}
		 */
		_hasSingleExactMatchingVal: function(val) {
			return val === this._$parent.val() && this._$renderMenuList.length === 1;
		},

		/**
		 * テキストボックスにフォーカスをあてる
		 * 
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_focusText: function() {
			this._$parent.focus();
			// 入力がある場合は末尾にフォーカスを当てる
			this._$parent[0].value += '';
		},

		/**
		 * オーバーレイ要素のサイズをウィンドウサイズに合わせます
		 * 
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		_resizeOverlay: function() {
			// 互換モードは考慮しない
			if (this._$overlay) {
				this._$overlay.css({
					width: windowWidth,
					height: windowHeight
				});
			}
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
			$el.addClass(HIGHLIGHT_CLASS_NAME);
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
				$el.removeClass(HIGHLIGHT_CLASS_NAME);
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
			if (this._disabled || !this._layout
					|| this._layout.getInitializePromise().state() !== 'resolved') {
				return;
			}

			this.isShowMenu() ? this.hideMenu() : this.showMenu();
			this._focusText();
			this.narrowDown();
		},

		/**
		 * ドロップダウンリストのHTML生成関数
		 */
		_rendererFunction: function($target, data) {

			var html = this.view.get(MENU_TEMPLATE_NAME, {
				items: data,
				height: DEFAULT_LIST_HEIGHT - 1,
				matchedClass: MATCHED_LIST_CLASS_NAME,
				activeClass: ACTIVE_LIST_CLASS_NAME,
				hiliteClass: HIGHLIGHT_CLASS_NAME,
				formatter: this._listItemTextFormatter
			});

			$target[0].innerHTML = html;
		},

		// --- ライフサイクルイベント --- //

		/**
		 * Controllerのinitライフサイクル。必要な要素の生成、コントローラ化を行う。
		 * 
		 * @private
		 * @param {Object} context
		 * @memberOf h5.ui.components.combobox.ListLayoutController
		 */
		__init: function(context) {
			this._$root = $(this.__rootElement);
			this._$body = $('body');
			this._$parent = $(context.args.parent);
			this._$hiddenElement = context.args.$hiddenElement;
			this._disabled = context.args.disabled;
			this._$btn = context.args.$btn;
			this._restoreStyles = context.args.restoreStyles;

			var $menu = context.args.$menu;
			this._rootLeftBorderWidth = parseFloat($menu.css('border-left-width'));
			this._rootRightBorderWidth = parseFloat($menu.css('border-right-width'));

			// IE9では、テキストボックスにフォーカスが当たっている状態でスクロールバーをクリックすると
			// テキストボックスのフォーカスが外れfocusoutイベントが発生してしまう
			// そのためfocusousetは使用せず、ドロップダウンリスト表示中のみ存在する透明のオーバーレイ要素を作って擬似的にfocusoutと同じ処理を行う
			// (ただしTabキーでのフォーカス移動は、ComboBoxControllerのkeyupで対応する)
			this._$overlay = $('<div></div>').addClass(OVERLAY_CLASS_NAME);
			// オーバーレイ クリックイベント
			this._$overlay.click(this.own(this._overlayHitHandler));
			// ウィンドウサイズを計算してオーバーレイを表示する
			this._resizeOverlay();
			this._resizeMenu();
		},

		/**
		 * Controllerのunbindライフサイクル。初期化時に生成した要素の削除を行う
		 * 
		 * @private
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		__unbind: function() {
			if (this._dataSource) {
				this._dataSource.dispose();
			}

			if (this._$overlay) {
				this._$overlay.remove();
			}
			this._clearResizeTimeout();
		},

		// ---- イベントハンドラ --- //

		/**
		 * オーバーレイのサイズとドロップダウンリストの幅をリサイズします
		 * 
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		'{window} resize': function() {
			this._clearResizeTimeout();

			this._resizeTimerId = setTimeout(this.own(function() {
				this._resizeOverlay();
				this._resizeMenu();
			}), RESIZE_EVENT_THRESHOLD);
		},

		/**
		 * マウス上のリストアイテムを選択状態(ハイライト)にします
		 * 
		 * @param context
		 * @param $el
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		'li mouseenter': function(context, $el) {
			var mousePos = {
				x: context.event.pageX,
				y: context.event.pageY
			};

			if (this._lastMousePos && this._lastMousePos.x === mousePos.x
					&& this._lastMousePos.y === mousePos.y) {
				return;
			}

			this._lastMousePos = mousePos;

			// 同じ要素だったら処理を抜ける
			if (this._highlightLineObj.$li && this._highlightLineObj.$li[0] === $el[0]) {
				return;
			}

			var $li = this._$root.find('li');
			this._removeHighlight($li);

			this._setHighlight($el);
		},
		/**
		 * 選択中の値をテキストボックスに反映します
		 * 
		 * @param context
		 * @param $el
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		'{rootElement} click': function(context, $el) {
			if (this._disabled) {
				return;
			}

			var $target = $(context.event.target);
			if ($target.is('li')) {
				this._removeHighlight(this._highlightLineObj.$li);
				this._setHighlight($target);

				this.selectMenu();
				this.hideMenu();
			}
			if (!$target.is('input')) {
				this._focusText();
			}
		},
		/**
		 * ドロップダウンリストの末尾に検索結果を追加(遅延表示)します
		 * 
		 * @param context
		 * @param $el
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		'{rootElement} h5scroll': function(context, $el) {
			// IEだとスクロールバーを操作するとテキストボックスからフォーカスが外れるため、外れないようにする
			this._focusText();
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

		// ---- パブリックメソッド --- //

		init: function(args) {
			// ユーザ指定パラメータ
			//this._searchLabel = args.hasOwnProperty('searchLabel') ? args.searchLabel : true;
			this._listItemTextFormatter = createListItemTextFormatter(args.textFormat, this);
			this._searchProps = args.searchProps || [];
			this._maxItems = args.maxItems || DEFAULT_MAX_ITEMS;
			this._listPosition = args.listPosition;

			this.view.register(MENU_TEMPLATE_NAME, MENU_TEMPLATE);

			//dataSourceの初期化
			var readyPromise = this._initDropDownList(args);

			//データ変更時のイベントハンドラを設定
			this._setDataTotalLengthWrapper = this.own(this.setDataTotalLength);
			this._dataSource.addEventListener('changeSource', this._setDataTotalLengthWrapper);

			return readyPromise;
		},

		setFilter: function(filter) {
			if (filter === null) {
				this._dataSource.setFilterFunction('value', defaultFilter);
				return;
			}

			if (jQuery.isFunction(filter)) {
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
			this._createDataSource(args);
			//再設定
			this._layout.setDataSource(this._dataSource);
			this.clearHighlightLi();
			this.clearSelectedLi();
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
		 * 引数に指定した値と前方一致するリストアイテムを候補として表示します
		 * 
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		narrowDown: function() {

			//古いデータが見えないようドロップダウンリストを非表示にする
			var $list = this._$root.find('li');
			$list.addClass(MENU_VISIBLE_CLASS_NAME);

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
		 * @memberOf h5.ui.components.combobox.DropDown ListController
		 */
		resetMenu: function() {
			this.__rootElement.scrollTop = 0;
			var $li = this._highlightLineObj.$li;
			if (!$li) {
				return;
			}

			var val = $li.data('value').toString();
			if (!this._hasSingleExactMatchingVal(val)) {
				this._removeHighlight($li);
			}
		},

		/**
		 * ドロップダウンリストを表示します
		 * 
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		showMenu: function() {
			if (this._disabled) {
				return;
			}

			this._resizeMenu();
			this._$root.show();
			this._$root.css({
				top: this._listPosition === 'upper' ? -this._$root.height() : this._$parent
						.outerHeight(),
				left: 0
			});

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
		 * ドロップダウンリストの表示、非表示を判定します <pr> true：表示 false：非表示
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

				if (this._dataTotalLength > this._highlightLineObj.indexOfData + 1) {
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
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		setListPosition: function(listPosition) {
			this._listPosition = listPosition;
		},

		/**
		 * コンボボックスデータのリストを取得します
		 * 
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		getBaseDataList: function() {
			return this._dataSource.getBaseData();
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
		 * 選択li要素をクリアします <pr>
		 * 
		 * @memberOf h5.ui.components.combobox.DropDownListController
		 */
		clearSelectedLi: function() {
			this._selectedLineObj = $.extend(true, {}, defaultSelectedLineObj);
		},

		clearHighlightLi: function() {
			if (this._highlightLineObj.$li !== null) {
				this._removeHighlight(this._highlightLineObj.$li);
			}

			this._highlightLineObj = $.extend(true, {}, defaultHighlightObj);
		},

		disable: function() {
			this._disabled = true;
			if (this.isInit) {
				this.hideMenu();
			}
		},

		enable: function() {
			this._disabled = false;
		}
	};

	// =========================================================================
	//
	// 外部公開
	//
	// =========================================================================
	//	h5.core.expose(dropDownListControllerDef);

	h5.u.obj.expose('h5.ui.components.combobox', {
		LIST_POSITION_UPPER: LIST_POSITION_UPPER,
		LIST_POSITION_LOWER: LIST_POSITION_LOWER
	});

	// =========================================================================
	//
	// 外部定義のインクルード
	//
	// =========================================================================

	//	var dropDownListController = h5.ui.components.combobox.DropDownListController;
	//	var listLayoutController = h5.ui.components.combobox.ListLayoutController;
	var scrollBoxController = h5.ui.components.combobox.VirtualScrollBoxController;
	var scrollBarController = h5.ui.components.combobox.VerticalScrollBarController;

	// =========================================================================
	//
	// スコープ内定数
	//
	// =========================================================================
	var LIFE_CYCLE_NAMES = ['__construct', '__init', '__ready', '__unbind', '__dispose', 'init'];

	/** ドロップダウンボタンに適用するクラス名 */
	var BTN_CLASS_NAME = 'combobox-dropdown-btn';

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
	var comboBoxRootController = $.extend({}, dropDownListControllerDef, listLayoutController,
			scrollBoxController, scrollBarController, {
				__name: 'h5.ui.components.combobox.ComboBoxRootController',

				__construct: function(context) {
					this.__rootElement = context.args.__rootElement;

					if (this.__construct_dropdown) {
						this.__construct_dropdown(context);
					}
					if (this.__construct_list) {
						this.__construct_list(context);
					}
				},

				__init: function(context) {
					if (this.__init_dropdown) {
						this.__init_dropdown(context);
					}
					if (this.__init_list) {
						this.__init_list(context);
					}
					//						this.__init_box(context);
					//						this.__init_bar(context);
				},

				__ready: function(context) {
					if (this.__ready_dropdown) {
						this.__ready_dropdown(context);
					}
					if (this.__ready_list) {
						this.__ready_list(context);
					}
					//						this.__init_box(context);
					//						this.__init_bar(context);
				},

				//		_drowDownListController: null,

				//		__ready: function(context) {
				//			this._drowDownListController = context.args.dropDownListController;
				//		},

				/**
				 * ドロップダウンボタン押下イベント
				 * <p>
				 * ドロップダウンリストを表示または非表示にします
				 * 
				 * @param event
				 * @memberOf h5.ui.components.combobox.ComboBoxRootController
				 */
				'div.combobox-dropdown-btn-wrapper click': function(event) {
					//			this._drowDownListController._dropDownBtnClickHandler(event);
					this._dropDownBtnClickHandler(event);
				},

				clickComboBoxDropdownButton: function() {
					this.$find('div.' + BTN_CLASS_NAME).trigger('click');
				},

				/**
				 * Controllerのunbindライフサイクル。初期化時に生成した要素の削除を行う
				 * 
				 * @private
				 * @memberOf h5.ui.components.combobox.ComboBoxRootController
				 */
				__unbind: function() {
					if (this.__unbind_list) {
						this.__unbind_list();
					}
					if (this.__unbind_dropdown) {
						this.__unbind_dropdown();
					}
				},

				__dispose: function() {
					if (this.__dispose_list) {
						this.__dispose_list();
					}
					if (this.__dispose_dropdown) {
						this.__dispose_dropdown();
					}
				}
			});

	for (var i = 0, len = LIFE_CYCLE_NAMES.length; i < len; i++) {
		var lifeCycleName = LIFE_CYCLE_NAMES[i];
		comboBoxRootController[lifeCycleName + '_dropdown'] = dropDownListControllerDef[lifeCycleName];
		comboBoxRootController[lifeCycleName + '_list'] = listLayoutController[lifeCycleName];
		comboBoxRootController[lifeCycleName + '_box'] = scrollBoxController[lifeCycleName];
		comboBoxRootController[lifeCycleName + '_bar'] = scrollBarController[lifeCycleName];
	}

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

	// 送信実行後、画面にとどまる場合の後処理を待つ時間
	var POST_SUMBIT_WAIT_TIME = 1000;

	/** INPUT要素を包含する要素(ルート)に適用するクラス名 */
	var COMBOBOX_BASE_CLASS_NAME = 'combobox-root';
	/** INPUT要素に適用するクラス名 */
	var COMBOBOX_INPUT_CLASS_NAME = 'combobox-input';
	/** ドロップダウンリスト要素に適用するクラス名 */
	var COMBOBOX_MENU_CLASS_NAME = 'combobox-menu';
	/** ドロップダウンリストを包含する要素に適用するクラス名 */
	var COMBOBOX_MENU_WRAPPER_CLASS_NAME = 'combobox-menu-wrapper';
	/** ドロップダウンボタンを包含する要素に適用するクラス名 */
	var BTN_WRAP_CLASS_NAME = 'combobox-dropdown-btn-wrapper';
	/** ドロップダウンボタンに適用するクラス名 */
	var BTN_CLASS_NAME = 'combobox-dropdown-btn';
	/** ドロップダウンボタンのアイコンに適用するクラス名 */
	var BTN_ICON_CLASS_NAME = 'combobox-dropdown-btn-icon';
	/** ドロップダウンボタンをdisableにするクラス名 */
	var DISABLE_CLASS_NAME = 'disabled';

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
	 * @class
	 * @memberOf h5.ui.components.combobox
	 * @name ComboBoxController
	 */
	var comboBoxController = {
		__name: 'h5.ui.components.combobox.ComboBoxController',
		/**
		 * ドロップダウンリストコントローラ
		 * 
		 * @private
		 * @type Controller
		 * @name _dropDownListController
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_dropDownListController: null,
		/**
		 * 絞り込みタイマーID
		 * 
		 * @private
		 * @type Number
		 * @name _narrowDounId
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_narrowDounId: null,
		/**
		 * jQuery化したルート要素
		 * 
		 * @private
		 * @type jQuery
		 * @name _$input
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_$input: null,
		/**
		 * jQuery化したフォーム要素
		 * 
		 * @private
		 * @type jQuery
		 * @name _$form
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_$form: null,
		/**
		 * コンボボックスの選択値を格納する隠し要素
		 * 
		 * @private
		 * @type jQuery
		 * @name _$hiddenElement
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_$hiddenElement: null,
		/**
		 * hiddenタグが最初から用意されているか
		 * 
		 * @private
		 * @type jQuery
		 * @name _$hiddenElement
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_hasOrgHiddenElm: false,
		/**
		 * コントローラ化前のinput要素のstyle
		 * 
		 * @private
		 * @type Object
		 * @name _restoreStyles
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_restoreStyles: {},

		/**
		 * 送信イベントハンドラ。hidden値をサーバに送る
		 * 
		 * @private
		 * @type Function
		 * @name _onsubmitWrapper
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_onsubmitWrapper: null,

		/**
		 * コンボボックスがdisableかどうか
		 * 
		 * @private
		 * @type Boolean
		 * @name _disabled
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_disabled: false,

		// ---- ライフサイクルイベント --- //

		/**
		 * Controllerのconstructライフサイクル。deferredとPromiseの生成を行う
		 * 
		 * @private
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		__construct: function() {
			this._initComboboxDeferred = this.deferred();
			this.initComboboxPromise = this._initComboboxDeferred.promise();
		},

		/**
		 * Controllerのinitライフサイクル。必要な要素の生成、コントローラ化を行う。
		 * 
		 * @private
		 * @returns {Promise} comboboxRootControllerのreadyPromiseオブジェクト
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		__init: function() {
			// rootElementのチェック
			if (!this._isInputElement(this.rootElement)) {
				this.throwError('comboboxControllerはinput要素にバインドしてください');
			}

			this._$input = $(this.rootElement).addClass(COMBOBOX_INPUT_CLASS_NAME);

			//テキストボックスの親要素のsubmitイベントにハンドラを登録する
			this._onsubmitWrapper = this.own(this._submitEventHandler);
			this._$form = $(this.rootElement.form);
			this._$form.submit(this._onsubmitWrapper);

			var $parent = this._$input.parent();
			this._$rootWrap = $('<div></div>').addClass(COMBOBOX_BASE_CLASS_NAME);

			//hiddenタグを取得する
			var $hidden = this._getHiddenElement();
			if ($hidden !== null) {
				//hiddenタグある場合は、そのまま使う
				this._$hiddenElement = $hidden;
				this._hasOrgHiddenElm = true;
			} else {
				//hiddenタグがない場合は、作成する
				this._$hiddenElement = this._createHiddenElement();
			}

			var $menuWrap = $('<div></div>').addClass(COMBOBOX_MENU_WRAPPER_CLASS_NAME);
			var $menu = $('<div></div>').addClass(COMBOBOX_MENU_CLASS_NAME).hide();

			//テキストボックス、hiddenタグをDIVでくるむ
			$menuWrap.append($menu);
			this._$rootWrap.append($menuWrap);
			this._$rootWrap.append(this._$input);
			this._$rootWrap.append(this._$hiddenElement);

			$parent.append(this._$rootWrap);

			this._appendBtn();

			var rootComboParam = {
				parent: this.rootElement,
				$hiddenElement: this._$hiddenElement,
				__rootElement: $menu[0],
				disabled: this._disabled,
				$btn: this._$btn,
				$menu: $menu,
				restoreStyles: this._restoreStyles
			//				listPosition: args ? args.listPosition : null
			};

			// コンボボックスを包むコントローラのコントローラ化
			this._comboboxRootController = h5.core.controller(this._$rootWrap,
					h5.ui.components.combobox.ComboBoxRootController, rootComboParam);
			// ドロップダウンリストのコントローラ化
			// 高速化対応で、_comboboxRootControllerに統合されたので、
			// 参照のみを持たせる
			this._dropDownListController = this._comboboxRootController;

			return this._comboboxRootController.readyPromise;
		},

		/**
		 * Controllerのunbindライフサイクル。初期化時に生成した要素の削除を行う
		 * 
		 * @private
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		__unbind: function() {
			if (this._comboboxRootController) {
				this._comboboxRootController.dispose();
			}

			if (this._$form) {
				// submitイベントハンドラを削除する
				this._$form.unbind('submit', this._onsubmitWrapper);
			}

			// テキストボックスのスタイルを元に戻す
			if (this._$input) {
				this._$input.css(this._restoreStyles);
				this._$input.removeClass(COMBOBOX_INPUT_CLASS_NAME);
				this._$rootWrap.before(this._$input);
				if (this._hasOrgHiddenElm) {
					this._$rootWrap.before(this._$hiddenElement);
				}
				this._$rootWrap.remove();
			}
		},

		// ---- プライベートメソッド --- //

		/**
		 * コンボボックスのボタンを生成して追加する
		 * 
		 * @private
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_appendBtn: function() {
			var offset = this._$input.offset();
			//			var $parent = this._$input.parent();
			var parentBorderColor = this._$input.css('border-top-color'); // IEではborder-colorだと値が取得できないのでborder-top-colorで取得する
			//			var parentBorderStyle = $parent.css('border-top-style'); // IEではborder-styleだと値が取得できないのでborder-top-styleで取得する
			//			var parentTopBorder = parseFloat($parent.css('border-top-width'));
			//			var parentBottomBorder = parseFloat($parent.css('border-bottom-width'));
			//			var parentLeftBorder = parseFloat($parent.css('border-left-width'));
			//			var parentRightBorder = parseFloat($parent.css('border-right-width'));
			var btnHeight = this._$input.outerHeight();

			// appearanceが適用されていてかつ色がデフォルトの場合は、ボタンにボーダーカラーを適用しない
			if (this._$input.css('appearance') !== 'none'
					&& parentBorderColor.replace(/ /g, '') === 'rgb(0,0,0)') {
				parentBorderColor = '';
			}

			// ドロップダウンリスト表示用ボタンアイコン
			var $btnIcon = $('<div></div>').addClass(BTN_ICON_CLASS_NAME);

			// ドロップダウンリスト表示用ボタン
			this._$btn = $('<div></div>');
			this._$btn.addClass(BTN_CLASS_NAME);
			if (this._$input.prop('disabled') || this._disabled) {
				this._disabled = true;
				this._$input.prop('disabled', 'disabled');
				this._$btn.addClass(DISABLE_CLASS_NAME);
			}
			// テキストボックスのサイズに合わせてボタンのサイズを調整すし、ボーダーのスタイルをコピーする
			this._$btn.css({
				height: btnHeight
			//				borderStyle: parentBorderStyle,
			//				borderColor: parentBorderColor,
			//				borderWidth: h5.u.str.format('{0}px {1}px {2}px {3}px', parentTopBorder,
			//						parentBottomBorder, parentLeftBorder, parentRightBorder)
			});

			var borderTopRightRadius = parseInt(this._$input.css('border-top-right-radius'));
			var borderBottomRightRadius = parseInt(this._$input.css('border-bottom-right-radius'));

			// テキストボックスとボタンの境界を結合するため、
			// テキストボックスの右上と右下にborder-radiusが適用されている場合はそれを解除して、ボタンの右上と右下にborder-radiusを適用する
			if (!isNaN(borderTopRightRadius) && borderTopRightRadius > 0) {
				this._$input.css('border-top-right-radius', 0);
				this._$btn.css('border-top-right-radius', borderTopRightRadius);
				this._restoreStyles['border-top-right-radius'] = '';
			}

			if (!isNaN(borderBottomRightRadius) && borderBottomRightRadius > 0) {
				this._$input.css('border-bottom-right-radius', 0);
				this._$btn.css('border-bottom-right-radius', borderBottomRightRadius);
				this._restoreStyles['border-bottom-right-radius'] = '';
			}

			// IEだと$().css('margin')で値が取得できないので個別に取得する
			var parentMarginTop = parseInt(this._$input.css('margin-top'));
			var parentMarginRight = parseInt(this._$input.css('margin-right'));
			var parentMarginBottom = parseInt(this._$input.css('margin-bottom'));
			var parentMarginLeft = parseInt(this._$input.css('margin-left'));
			var marginStr = h5.u.str.format('{0}px {1}px {2}px {3}px', parentMarginTop,
					parentMarginRight, parentMarginBottom, parentMarginLeft);

			// テキストボックスの余白と同じ余白を取る
			this._$btn.css('margin', marginStr);
			this._$btn.append($btnIcon);

			var $btnWrap = $('<div></div>').addClass(BTN_WRAP_CLASS_NAME);
			$btnWrap.append(this._$btn);
			this._$input.after($btnWrap);

			// ボタンのサイズに合わせてアイコンの位置を調整する
			//			var marginTop = (btnHeight - $btnIcon.outerHeight()) / 2;
			//			$btnIcon.css('margin-top', marginTop);

			//			this._resizeMenu();
		},

		/**
		 * 指定した要素が入力要素かどうかチェックします
		 * 
		 * @private
		 * @returns {Boolean} 入力要素かどうか
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_isInputElement: function(elem) {
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

		/**
		 * 所属するformのsubmitイベント
		 * <p>
		 * コンボボックスのinput要素をformから削除します
		 * 
		 * @parent {jQuerEvent} event イベントオブジェクト
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_submitEventHandler: function(event) {
			if (event.isDefaultPrevented()) {
				return;
			}

			//隠し要素にname属性を追加
			var name = this._$input.attr('name');
			this._$hiddenElement.attr('name', name);
			//テキストボックスを削除
			this._$input.attr('name', '');

			// そのまま画面にとどまる場合に備えて、一定時間経過後に値を戻す
			setTimeout(this.own(function() {
				this._$hiddenElement.attr('name', '');
				this._$input.attr('name', name);
			}), POST_SUMBIT_WAIT_TIME);
		},

		/**
		 * hidden要素が最初から設定されている場合は、それを取得する
		 * 
		 * @returns {jQuery} hidden要素のjQueryオブジェクト。ない場合はnull
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_getHiddenElement: function() {
			//input要素と同じname属性でtype="hidden"のinput要素を検索
			var $inputNextElement = this._$input.next('input[type="hidden"][data-name="'
					+ this._$input.attr('name') + '"]');
			if ($inputNextElement.length !== 0) {
				return $inputNextElement;
			}
			return null;
		},

		/**
		 * hidden要素を生成する
		 * 
		 * @returns {jQuery} 生成したhidden要素のjQueryオブジェクト
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		_createHiddenElement: function() {
			//コンボボックスの選択値を格納する隠しinput要素を作成
			//name属性は、テキストボックス（root）と同じにする
			return $('<input type="hidden" data-name="' + this._$input.attr("name") + '" value="'
					+ this._$input.val() + '">');
		},

		// ---- イベントハンドラ --- //

		// コンボボックスにfocusしているときは、input要素からfocusoutイベントをあげないようにする。
		'{rootElement} focusout': function(context, $el) {
			// TODO: activeElementはChromeではbodyになってしまうので、要別対応
			if (this._$rootWrap.find(document.activeElement).size() > 0) {
				context.event.stopPropagation();
			}
		},

		// 上下矢印キー押下されたらカーソルを移動します
		// メニュー非表示で↓キーを押下時は▼ボタンクリックと同様に動く
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
				context.event.preventDefault();
				//メニューが非表示の場合は▼ボタンクリックと同様に動く
				if (!this._dropDownListController.isShowMenu()) {
					this._comboboxRootController.clickComboBoxDropdownButton();
				}
				this._dropDownListController.highlightNext();
				return;
			}

			if (keyCode === 13) { //enterで送信されるのを防ぐ
				context.event.preventDefault();
				return;
			}

			if (keyCode !== 38 && keyCode !== 40) {
				return;
			}
		},

		// 	入力された値と一致するリストアイテムをドロップダウンリストに表示します
		// エンターキーが押下されたら、選択中の値をテキストボックスに反映します
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

			// 一定時間入力がなければ検索を実行するようにする(負荷軽減対策)
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

			}), NARROWDOUN_THRESHOLD);
		},

		// ---- パブリックメソッド --- //

		/**
		 * コンボボックスを初期化する。コントローラ化された時点で必要な要素は加わっているので、ドロップダウンリストの初期化のみを行う。
		 * 
		 * @param {Object} args 設定パラメータオブジェクト
		 * @returns {Promise} すべての処理の終了を待つPromiseオブジェクト
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		init: function(args) {
			this.readyPromise.then(this.own(function() {
				this._dropDownListController.init_dropdown(args).done(this.own(function() {
					this._initComboboxDeferred.resolve();
				})).fail(this.own(function() {
					this._initComboboxDeferred.reject();
				}));
			}));
			return this.initComboboxPromise;
		},

		/**
		 * コンボボックス機能を無効にします
		 * 
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		disable: function() {
			this._disabled = true;
			if (this._$input) {
				this._$input.prop('disabled', 'disabled');
				this._dropDownListController.disable();
				this._$btn.addClass(DISABLE_CLASS_NAME);
			}
		},
		/**
		 * コンボボックスの機能を有効にします
		 * 
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		enable: function() {
			this._disabled = false;
			if (this._$input) {
				this._$input.prop('disabled', '');
				this._dropDownListController.enable();
				this._$btn.removeClass(DISABLE_CLASS_NAME);
			}
		},
		/**
		 * コンボボックスを破棄します
		 * 
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		destroy: function() {
			this.dispose();
		},

		/**
		 * 指定されたデータからドロップダウンリストのリストアイテムを再生成します
		 * <p>
		 * テキストボックスに入力がある場合は、その値で検索を実行します。
		 * 
		 * @param {Object} args init時に渡すものと同じパラメータオブジェクト
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		refresh: function(args) {
			//ドロップダウンリスト初期化
			this._dropDownListController.refreshDataSource(args);
		},

		/**
		 * テキストボックスに入力されている値を取得する
		 * 
		 * @returns {String} テキストボックスに入力されている値
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		getText: function() {
			return this._$input.val();
		},

		/**
		 * hiddenに設定されている値を取得する
		 * 
		 * @returns {String} hiddenに設定されている値
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		getValue: function() {
			return this._$hiddenElement.val();
		},

		/**
		 * hiddenに値を設定する
		 * 
		 * @param {String} value hiddenに設定する値
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		setValue: function(value) {
			this._$hiddenElement.val(value);
		},

		/**
		 * 絞込用のフィルター関数をセットする
		 * 
		 * @param {Function} filter 絞込用のフィルター関数
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		setFilter: function(filter) {
			this._dropDownListController.setFilter(filter);
		},

		/**
		 * ドロップダウンリストの位置を設定します
		 * 
		 * @param {String} listPosition ドロップダウンリストの位置
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		setListPosition: function(listPosition) {
			this._dropDownListController.setListPosition(listPosition);
		},

		/**
		 * 選択中のデータオブジェクトを返します
		 * 
		 * @returns {Object} 選択中のデータオブジェクト。未選択ならnull
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		getSelectedItem: function() {
			return this._dropDownListController.getSelectedLiData();
		},

		/**
		 * リストの表示するデータのリストを返します
		 * 
		 * @param {Object} リストの表示するデータ
		 * @memberOf h5.ui.components.combobox.ComboBoxController
		 */
		getBaseDataList: function() {
			return this._dropDownListController.getBaseDataList();
		}
	};

	// =========================================================================
	//
	// 外部公開
	//
	// =========================================================================
	h5.core.expose(comboBoxController);

})(jQuery);
