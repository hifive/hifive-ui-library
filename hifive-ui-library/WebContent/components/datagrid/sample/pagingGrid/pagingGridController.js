/* jshint browser: true, jquery: true */
/* global h5 */
(function($) {
	'use strict';

	var datagrid = h5.ui.components.datagrid;
	var cellFormatter = datagrid.view.dom.cellFormatter;
	var changeHandler = datagrid.view.dom.changeHandler;

	var log = h5.log.createLogger('sample');

	var initParam = {
		searcher: {
			type: 'all',
			paging: {
				enable: true,
				pageSize: 30
			}
		},

		mapper: {
			type: 'property',
			param: {
				direction: 'vertical',
				visibleProperties: {
					header: ['_selectCheckBox', 'id'],
					main: ['name', 'place', 'position', 'tel', 'mail', 'note']
				},
				dataDirectionSize: {
					size: 25
				}
			}
		},

		view: {
			type: 'table',
			param: {
				cellClassDefinition: {},
				disableInput: function() {
					return false;
				},
				sortAscIconClasses: ['glyphicon glyphicon-sort-by-alphabet'],
				sortDescIconClasses: ['glyphicon glyphicon-sort-by-alphabet-alt']
			}
		},

		properties: {
			_selectCheckBox: {
				size: 25,
				enableResize: false,
				toValue: function(data, cell) {
					return cell.isSelectedData;
				},
				formatter: cellFormatter.checkbox(true),
				changeHandler: changeHandler.selectData()
			},

			id: {
				size: 70,
				sortable: true
			},

			name: {
				size: 100,
				sortable: true
			},

			place: {
				size: 100
			},

			position: {
				size: 110
			},

			tel: {
				size: 140
			},

			mail: {
				size: 270
			},

			note: {
				size: 150
			}
		}
	};

	// --- 定数 --- //

	// --- コントローラ --- //

	/**
	 * ページンググリッドコントローラ
	 *
	 * @class
	 * @name PagingGridController
	 */
	var pagingGridController = {

		/**
		 * コントローラ名
		 *
		 * @memberOf datagrid.sample.PagingGridController
		 * @type string
		 */
		__name: 'datagird.sample.PagingGridController',

		/**
		 * メタ定義
		 */
		__meta: {
			_gridController: {
				rootElement: '#grid'
			}
		},

		// --- 子コントローラ --- //

		_gridController: datagrid.GridController,

		// --- プロパティ --- //

		_dataSearcher: null,

		// --- ライフサイクル関連メソッド --- //
		/**
		 * 初期処理
		 */
		__ready: function() {
			this.init(1000);
			this._dataSearcher = this._gridController.getDataSearcher();
		},

		// --- イベントハンドラメソッド --- //

		/**
		 * データ件数の変更
		 */
		'.createRecordForm submit': function(context, $el) {
			context.event.preventDefault();
			var num = parseInt($el.find('[name="numOfRecord"]').val());
			if (num !== num) {
				return;
			}
			this.setData(num);
		},

		/**
		 * 1ページの表示件数の変更
		 */
		'.pageSizeForm submit': function(context, $el) {
			context.event.preventDefault();
			var num = parseInt($el.find('[name="pageSize"]').val());
			if (num !== num) {
				return;
			}
			this._dataSearcher.setPageSize(num);
			this._updateTotalPages();
		},

		/**
		 * グリッドが描画されたら bootstrap の table-striped を追加する
		 */
		'#grid gridRender': function() {
			// bootstrapのtableストライプ
			this.$find('.gridHeaderColumnsBox table').addClass('table-striped');
			this.$find('.gridMainBox table').addClass('table-striped');
		},

		/**
		 * チェックボックスクリック
		 */
		'#grid gridChangeDataSelect': function() {
			this._updateSelectDataIds();
		},

		/**
		 * グリッドセルを mosuedown
		 */
		'.gridCellFrame mousedown': function(context, $el) {
			// 対象のグリッドセルを取得
			var cell = this._getGridCell($el);
			// グリッドセルのデータを表示
			this._showGridCell(cell);
		},

		/**
		 * 選択社員IDリンク クリック
		 */
		'#showSelectedDataIds click': function(context, $el) {
			//選択社員IDをアラート表示
			var selectedDataIds = this._gridController.getSelectedDataIdAll();
			alert(selectedDataIds.length + '件選択しています\n' + selectedDataIds);
		},

		'{rootElement} gridChangeSearchComplete': function(context, $el) {
			this._updateTotalPages();
			this._updateCurrentPage();
		},

		/**
		 * 次のページを表示
		 */
		'#nextPage click': function(context, $el) {
			context.event.preventDefault();
			var currentPage = this._dataSearcher.getCurrentPage();
			var totalPage = this._dataSearcher.getTotalPages();
			if ((currentPage + 1) <= totalPage) {
				this._dataSearcher.movePage(currentPage + 1);
				this._updateCurrentPage();
			}
		},

		/**
		 * 最後のページを表示
		 */
		'#lastPage click': function(context, $el) {
			context.event.preventDefault();

			var totalPage = this._dataSearcher.getTotalPages();
			this._dataSearcher.movePage(totalPage);
			this._updateCurrentPage();
		},

		/**
		 * 前のページを表示
		 */
		'#prevPage click': function(context, $el) {
			context.event.preventDefault();
			var currentPage = this._dataSearcher.getCurrentPage();
			if (1 <= currentPage - 1) {
				this._dataSearcher.movePage(currentPage - 1);
				this._updateCurrentPage();
			}
		},

		/**
		 * 先頭のページを表示
		 */
		'#firstPage click': function(context, $el) {
			context.event.preventDefault();
			this._dataSearcher.movePage(1);
			this._updateCurrentPage();
		},

		/**
		 * 現在のページ入力要素を変更したら指定ページを表示する
		 */
		'#currentPage change': function(context, $el) {
			var page = parseInt($el.val(), 10);
			var totalPages = this._dataSearcher.getTotalPages();

			if (Number.isNaN(page) || page <= 0 || totalPages < page) {
				var currentPage = this._dataSearcher.getCurrentPage();
				$el.val(currentPage);
				return;
			}
			this._dataSearcher.movePage(page);
		},

		'#grid changeSearchComplete': function() {
			var totalPages = this._dataSearcher.getTotalPages();
			var currentPage = this._dataSearcher.getCurrentPage();

			if (currentPage === 1) {
				this.$find('#prevPage').addClass('disabled-link');
			} else {
				this.$find('#prevPage').removeClass('disabled-link');
			}
			if (currentPage === totalPages) {
				this.$find('#nextPage').addClass('disabled-link', true);
			} else {
				this.$find('#nextPage').removeClass('disabled-link');
			}

			this.$find('#totalPages').text(totalPages);
			this.$find('#currentPage').val(currentPage);
		},

		// --- Public Method --- //

		init: function(num) {
			// サンプルデータ生成
			var dataSource = datagrid.createDataSource({
				idProperty: 'id',
				type: 'local',
				param: sample.createData(num)
			});

			//データグリッド初期化
			return this._gridController.activate(dataSource, initParam).done(this.own(function() {
				this._gridController.search({});
			}));
		},

		setData: function(num) {
			// TODO clear() を呼ばないと表示が更新されない
			this._gridController.clear();

			// サンプルデータ生成
			var data = sample.createData(num);
			// dataSource 取得
			var dataSource = this._gridController.getDataSource();
			// dataAccessor 取得
			var dataAccessor = dataSource.getDataAccessor();
			// data を設定(内部で search が走る)
			dataAccessor.setSourceDataSet(data);
			// data を設定後、選択状態を全て解除する
			this._gridController.unselectDataAll();

			// searchして描画を更新
			// TODO refresh() では更新されない
			this._gridController.search({});
			// FIXME search()すると前のデータと思わしきものが表示される
			// 1000件(初期)→10件にしても10件より多い数が表示される
		},

		// --- Private Method --- //

		/**
		 * 選択社員IDの表示を更新する
		 */
		_updateSelectDataIds: function() {
			var selectedDataIds = this._gridController.getSelectedDataIdAll();
			if (selectedDataIds.length < 15) {
				this.$find('#selectedDataIds').text(selectedDataIds);
			} else {
				this.$find('#selectedDataIds').text(selectedDataIds.slice(0, 14) + '....');
			}
		},

		_getGridCell: function($gridCellFrame) {
			if (!$gridCellFrame.hasClass('gridCellFrame')) {
				return;
			}
			// row,column からセルデータを取得
			var row = $gridCellFrame.data('h5DynGridRow');
			var column = $gridCellFrame.data('h5DynGridColumn');
			return this._gridController.getGridCell(row, column);
		},

		_showGridCell: function(cell) {
			this.$find('.gridCellInfo').text(JSON.stringify(cell.editedData, null, '\n'));
		},

		/**
		 * 全体ページ数のラベルを更新する
		 */
		_updateTotalPages: function() {
			var totalPages = this._dataSearcher.getTotalPages();
			this.$find('#totalPages').text(totalPages);
		},

		/**
		 * 現在ページ入力要素の値を更新する
		 */
		_updateCurrentPage: function() {
			var currentPage = this._dataSearcher.getCurrentPage();
			this.$find('#currentPage').val(currentPage);
		}
	};

	//---- Init ---- //
	$(function() {
		window.c = h5.core.controller('body', pagingGridController);
		window.g = c._gridController;
	});

})(jQuery);
