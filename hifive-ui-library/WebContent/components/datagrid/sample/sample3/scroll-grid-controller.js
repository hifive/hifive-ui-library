/* jshint browser: true, jquery: true */
/*global h5*/

(function($) {
	'use strict';

	var datagrid = h5.ui.components.datagrid;
	var cellFormatter = datagrid.view.dom.cellFormatter;
	var changeHandler = datagrid.view.dom.changeHandler;

	var log = h5.log.createLogger('sample');

	var initParam = {
		searcher: {
			type: 'all'
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
				}
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
	 * スクロールグリッドコントローラ
	 *
	 * @class
	 * @name scrollGridController
	 */
	var scrollGridController = {

		/**
		 * コントローラ名
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @type string
		 */
		__name: 'datagrid.sample.scrollGridController',


		/**
		 * メタ定義
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @type object
		 */
		__meta: {
			_gridController: {
				rootElement: '#grid'
			}
		},

		// --- 子コントローラ --- //
		/**
		 * ScrollGridControllerライブラリ
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @type Controller
		 */
		_gridController: datagrid.GridController,


		// --- プロパティ --- //

		// --- プライベートなメソッド --- //

		/**
		 * 選択社員IDの表示を更新する
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param
		 */
		_updateSelectDataIds: function() {
			var selectedDataIds = this._gridController.getSelectedDataIdAll();
			if (selectedDataIds.length < 15) {
				this.$find('#selectedDataIds').text(selectedDataIds);
			} else {
				this.$find('#selectedDataIds').text(selectedDataIds.slice(0, 14) + '....');
			}
		},

		// --- ライフサイクル関連メソッド --- //
		/**
		 * 初期処理
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param
		 */
		__ready: function() {
			this.init(1000);
		},

		// --- イベントハンドラメソッド --- //
		/**
		 * サンプルデータ件数の変更
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param
		 */
		'.create-record-form submit': function(context) {
			context.event.preventDefault();
			var num = parseInt(this.$find('[name="num-of-record"]').val());
			if (num !== num) {
				return;
			}
			this.setData(num);
		},

		/**
		 * グリッドが描画されたら bootstrap の table-striped を追加する
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param
		 */
		'#grid gridRender': function() {
			//bootstrapのtableストライプ
			this.$find('.gridHeaderColumnsBox table').addClass('table table-striped');
			this.$find('.gridMainBox table').addClass('table table-striped');
		},

		/**
		 * チェックボックスクリック
		 * <p>
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 */
		'#grid gridChangeDataSelect': function() {
			this._updateSelectDataIds();
		},

		/**
		 * グリッドセルを mosuedown
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param context
		 * @param $el
		 */
		'.gridCellFrame mousedown': function(context, $el) {
			// 対象のグリッドセルを取得
			var cell = this._getGridCell($el);
			// グリッドセルのデータを表示
			this._showGridCell(cell);
		},

		/**
		 * 選択社員IDリンク クリック
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param context
		 * @param $el
		 */
		'#showSelectedDataIds click': function(context, $el) {
			//選択社員IDをアラート表示
			var selectedDataIds = this._gridController.getSelectedDataIdAll();
			alert(selectedDataIds.length + '件選択しています\n' + selectedDataIds);
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
			this._gridController.activate(dataSource, initParam);

			datagrid.util.delay(1000, this.own(function() {
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
		},

		// --- Private Method --- //

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
		}

	};

	$(function() {
		h5.core.controller('body', scrollGridController);
	});

})(jQuery);
