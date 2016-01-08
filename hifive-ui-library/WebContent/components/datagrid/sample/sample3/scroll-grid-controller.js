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

		//		/**
		//		 * グリッドの再描画
		//		 *
		//		 * @memberOf datagrid.sample.scrollGridController
		//		 * @param
		//		 */
		//		'#grid gridRender': function() {
		//
		//			// FIXME ?
		//			//bootstrapのtableストライプ
		//			this.$find('.grid-header-columns table').addClass('table table-striped');
		//			this.$find('.grid-main-box table').addClass('table table-striped');
		//
		//			var selectedDataIds = this._gridController.getSelectedDataIdAll();
		//			if (selectedDataIds.length > 0) {
		//				//選択データがある場合はチェックON状態にする
		//				//データ変更後の再描画でヘッダも再描画されチェックボックスがOFF状態に戻るため
		//				this.$find('#selectAll')[0].checked = true;
		//			}
		//		},

		//		/**
		//		 * チェックボックス変更（全選択チェックボックス以外）
		//		 *
		//		 * @memberOf datagrid.sample.scrollGridController
		//		 * @param context
		//		 * @param $el
		//		 */
		//		'input[type="checkbox"]:not(#selectAll) change': function(context, $el) {
		//			var isSelected = $el.prop('checked');
		//
		//			//チェックボックス取得
		//			// data による取得は数値変換できる場合はしてしまうので文字列に直す
		//			var dataId = String($el.data('bertDataId'));
		//
		//			if (isSelected) {
		//				this._gridController.selectData(dataId);
		//
		//				//1つでも選択がある場合はヘッダチェックボックスをONにする
		//				this.$find('#selectAll')[0].checked = true;
		//			} else {
		//				this._gridController.unselectData(dataId);
		//			}
		//
		//			this._updateSelectDataIds();
		//		},

		//		/**
		//		 * 全選択チェックボックスクリック
		//		 * <p>
		//		 *
		//		 * @memberOf datagrid.sample.scrollGridController
		//		 * @param context
		//		 * @param $el
		//		 */
		//		'#selectAll click': function(context, $el) {
		//			//全選択 or 全選択解除
		//			$el[0].checked ? this._gridController.selectAllData() : this._gridController
		//					.unselectAllData();
		//			this._updateSelectDataIds();
		//		},

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
		 * 行クリック（ヘッダ行以外）
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param context
		 * @param $el
		 */
		// FIXME アラートを閉じても範囲選択中のため使いかってが悪い
		//		'.gridCellFrame click': function(context, $el) {
		//			var focusedCell = this._gridController.getFocusedCell();
		//			var row = focusedCell.row;
		//			var column = focusedCell.column;
		//			// row,column からセルデータを取得
		//			var cell = this._gridController.getGridCell(row, column);
		//			// ヘッダ行またはヘッダ列ならば何もしない
		//			if(cell.isHeaderRow || cell.isHeaderColumn){
		//				return;
		//			}
		//			alert(JSON.stringify(cell));
		//		},
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
			// サンプルデータ生成
			var data = sample.createData(num);
			// dataSource 取得
			var dataSource = this._gridController.getDataSource();
			// dataAccessor 取得
			var dataAccessor = dataSource.getDataAccessor();
			// data を設定(内部で search が走る)
			dataAccessor.setSourceData(data);
			// data を設定後、選択状態を全て解除する
			this._gridController.unselectDataAll();
			// グリッドをリフレッシュする
			this._gridController.refresh();
		}

	};

	$(function() {
		h5.core.controller('body', scrollGridController);
	});

})(jQuery);
