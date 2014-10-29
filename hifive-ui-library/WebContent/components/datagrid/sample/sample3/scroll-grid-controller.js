/*global h5, bert*/

// ---- Controller ---- //
(function($) {

	// --- 定数 --- //

	//行番号
	var H5GRID_ROW_ID = 'h5DynGridRowId';


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

		// --- プロパティ --- //

		/**
		 * ScrollGridControllerライブラリ
		 * 
		 * @memberOf datagrid.sample.scrollGridController
		 * @type Controller
		 */
		_gridController: h5.ui.components.datagrid.ScrollGridController,

		/**
		 * サンプルデータ取得ロジック
		 * 
		 * @memberOf datagrid.sample.scrollGridController
		 * @type Logic
		 */
		_gridLogic: datagrid.sample.GridLogic,


		// --- プライベートなメソッド --- //

		/**
		 * 選択社員IDの表示を更新する
		 * 
		 * @memberOf datagrid.sample.scrollGridController
		 * @param
		 */
		_updateSelectDataIds: function() {
			var selectedDataIds = this._gridController.getSelectedDataIds();
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

			//サンプルデータ取得
			this._gridLogic.loadData().done(this.own(function(data) {

				//データグリッド初期化
				this._gridController.init({
					data: data,
					idKey: 'id',
					rowHeight: 25,
					gridHeight: 651,
					gridWidth: 860,
					headerColumns: 2,
					verticalScrollStrategy: 'index',
					columns: [{
						propertyName: '_selectCheckBox',
						header: '<input id="selectAll" type="checkbox">',
						width: 40,
						formatter: function(cellData) {
							if (cellData.isHeaderRow) {
								return cellData.value;
							}
							var dataId = cellData.dataId;
							var checked = cellData.selected ? 'checked' : '';
							var html = '<input type="checkbox"';
							html += ' data-bert-data-id="' + dataId + '"';
							html += ' ' + checked;
							html += '>';
							return html;
						},
						sortable: false,
						markable: false
					}, {
						propertyName: 'id',
						header: '社員ID',
						width: 100,
						sortable: true
					}, {
						propertyName: 'name',
						header: '氏名',
						width: 150,
						sortable: true
					}, {
						propertyName: 'place',
						header: '配属',
						width: 100,
						sortable: true
					}, {
						propertyName: 'position',
						header: '部署',
						width: 100,
						sortable: true
					}, {
						propertyName: 'tel',
						header: '電話番号',
						width: 120,
						sortable: true
					}, {
						propertyName: 'mail',
						header: 'メールアドレス',
						width: 260,
						sortable: true
					}, {
						propertyName: 'note',
						header: '備考',
						width: 200
					}]
				});
			}));

		},

		// --- イベントハンドラメソッド --- //

		/**
		 * グリッドの再描画
		 * 
		 * @memberOf datagrid.sample.scrollGridController
		 * @param
		 */
		'#grid renderGrid': function() {

			//bootstrapのtableストライプ
			this.$find('.grid-header-columns table').addClass('table table-striped');
			this.$find('.grid-main-box table').addClass('table table-striped');

			var selectedDataIds = this._gridController.getSelectedDataIds();
			if (selectedDataIds.length > 0) {
				//選択データがある場合はチェックON状態にする
				//データ変更後の再描画でヘッダも再描画されチェックボックスがOFF状態に戻るため
				this.$find('#selectAll')[0].checked = true;
			}
		},

		/**
		 * チェックボックス変更（全選択チェックボックス以外）
		 * 
		 * @memberOf datagrid.sample.scrollGridController
		 * @param context
		 * @param $el
		 */
		'input[type="checkbox"]:not(#selectAll) change': function(context, $el) {
			var isSelected = $el.prop('checked');

			//チェックボックス取得
			// data による取得は数値変換できる場合はしてしまうので文字列に直す
			var dataId = String($el.data('bertDataId'));

			if (isSelected) {
				this._gridController.selectData(dataId);

				//1つでも選択がある場合はヘッダチェックボックスをONにする
				this.$find('#selectAll')[0].checked = true;
			} else {
				this._gridController.unselectData(dataId);
			}

			this._updateSelectDataIds();
		},

		/**
		 * 全選択チェックボックスクリック
		 * <p>
		 * 
		 * @memberOf datagrid.sample.scrollGridController
		 * @param context
		 * @param $el
		 */
		'#selectAll click': function(context, $el) {
			//全選択 or 全選択解除
			$el[0].checked ? this._gridController.selectAllData() : this._gridController
					.unselectAllData();
			this._updateSelectDataIds();
		},

		/**
		 * 行クリック（ヘッダ行以外）
		 * 
		 * @memberOf datagrid.sample.scrollGridController
		 * @param context
		 * @param $el
		 */
		'td[data-h5-dyn-grid-is-header-row="false"] click': function(context, $el) {
			// rowId から元データの取得
			var rowId = $el.data(H5GRID_ROW_ID);
			var data = this._gridController.getCachedData(rowId);

			alert(JSON.stringify(data));
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
			var selectedDataIds = this._gridController.getSelectedDataIds();
			alert(selectedDataIds.length + '件選択しています\n' + selectedDataIds);
		}

	};

	// ---- Init ---- //
	$(function() {
		h5.core.controller('body', scrollGridController);
	});

})(jQuery);
