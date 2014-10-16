/*global h5, bert*/

// ---- Logic ---- //
(function($) {
	var DATA_URL = '/api/sample3';

	var gridSampleLogic = {
		__name: 'bert.fw.grid.sample.GridLogic',

		loadData: function() {
			var def = this.deferred();
			bert.fw.ajax(DATA_URL, {
				dataType: 'json',
				data : '',
			}).done(function(data){
				def.resolve(data.list);
			});
			return def.promise();
		}
	};

	h5.core.expose(gridSampleLogic);

})(jQuery);

// ---- Controller ---- //
(function($) {

	var scrollGridController = {

		// --- コントローラの設定 --- //

		__name: 'scrollGridController',

		__meta: {
			_gridController: {
				rootElement: '#grid'
			}
		},

		// --- プロパティ --- //

		_gridController: h5.ui.components.datagrid.ScrollGridController,

		_gridLogic: bert.fw.grid.sample.GridLogic,

		// --- プライベートなメソッド --- //

		_updateSelectDataIds: function() {
			var selectedDataIds = this._gridController.getSelectedDataIds();
			if(selectedDataIds.length < 15){
				this.$find('#selectedDataIds').text(selectedDataIds);
			}else{
				this.$find('#selectedDataIds').text(selectedDataIds.slice(0, 14) + '....');
			}
		},

		// --- ライフサイクル関連メソッド --- //

		__ready: function() {

			//gridの初期化
			this._gridLogic.loadData().done(this.own(function(data) {
				this._gridController.init({
					data: data,
					idKey: 'id',
					rowHeight: 25,
					gridHeight: 651,
					gridWidth : 800,
					headerColumns: 2,
					verticalScrollStrategy: 'index',
					columns: [
					{
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
						sortable: false
					}, {
						propertyName: 'id',
						header: '社員ID',
						width: 100,
						sortable: true
					},
					{
						propertyName: 'name',
						header: '氏名',
						width: 150,
						sortable: true
					},
					{
						propertyName: 'place',
						header: '配属',
						width: 100,
						sortable: true
					},
					{
						propertyName: 'position',
						header: '部署',
						width: 100,
						sortable: true
					},
					{
						propertyName: 'tel',
						header: '電話番号',
						width: 120,
						sortable: true
					},
					{
						propertyName: 'mail',
						header: 'メールアドレス',
						width: 250,
						sortable: true
					}
					]
				});
			}));

		},


		'#grid renderGrid' :function(){

			//bootstrapのtableストライプ
			this.$find('.grid-header-columns table').addClass('table table-striped');
			this.$find('.grid-main-box table').addClass('table table-striped');

			var selectedDataIds = this._gridController.getSelectedDataIds();
			if(selectedDataIds.length > 0){
				//選択データがある場合はチェックON状態にする
				//データ変更後の再描画でヘッダも再描画されチェックボックスがOFF状態に戻るため
				this.$find('#selectAll')[0].checked = true;
			}
		},

		// --- イベントハンドラメソッド --- //

		// 選択
		'input[type="checkbox"]:not(#selectAll) change': function(context, $el) {
			var isSelected = $el.prop('checked');

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

		// 全選択 or 全選択解除
		'#selectAll click': function(context, $el) {
			$el[0].checked ?  this._gridController.selectAllData() : this._gridController.unselectAllData();
			this._updateSelectDataIds();
		},

		// rowId から元データの取得
		'td[data-grid-is-header-row="false"] click': function(context, $el) {
			var rowId = $el.data('gridRowId');
			var data = this._gridController.getCachedData(rowId);

			alert(JSON.stringify(data));
		},

		//選択社員IDをアラート表示
		'#showSelectedDataIds click' : function(context, $el){
			var selectedDataIds = this._gridController.getSelectedDataIds();
			alert(selectedDataIds.length +'件選択しています\n'+selectedDataIds);
		},

		// ヘッダをクリックしたらソート
		'td.grid-header[data-h5-dyn-grid-is-sortable-column="true"] click': function(context, $el) {
			var key = $el.data('data-h5-dyn-grid-property-name');
			this._gridController.sort(key);
		}

	};

	// ---- Init ---- //
	$(function() {
		h5.core.controller('body', scrollGridController);
	});

})(jQuery);