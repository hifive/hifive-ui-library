/*global h5, bert*/

// ---- Controller ---- //
(function($) {

	// --- 定数 --- //

	//列番号（0始まりの連番）グリッドデータ変更毎に連番が振られる
	var H5GRID_COLUMN_ID = 'h5DynGridColumnId';

	//行番号
	var H5GRID_ROW_ID = 'h5DynGridRowId';

	//移動列クラス
	var CLASS_TRACK_COLUMN = 'tracking-column';

	//非表示クラス
	var CLASS_DISP_HIDDEN = 'disp-hidden';

	//矢印セレクタ
	var SELECTOR_ARROW = '.trackend-sign';

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

		/**
		 * トラック開始列のインデックス
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @type number
		 */
		_trackdStartColumnIndex  : null,

		/**
		 * 列位置配列（表示されている列の位置（X座標）とインデックスを管理）
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @type array
		 */
		_colPositionArray : [],

		// --- プライベートなメソッド --- //

		/**
		 * 選択社員IDの表示を更新する
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param
		 */
		_updateSelectDataIds: function() {
			var selectedDataIds = this._gridController.getSelectedDataIds();
			if(selectedDataIds.length < 15){
				this.$find('#selectedDataIds').text(selectedDataIds);
			}else{
				this.$find('#selectedDataIds').text(selectedDataIds.slice(0, 14) + '....');
			}
		},

		/**
		 * 表示されているヘッダーセルのleftとIDを取得する
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param
		 */
		_getColumnsPositionInfo : function() {
			var $td = this.$find('.grid-header-rows tr td');
			var array = [];
			$td.each(function() {

				array.push({
					left : this.getBoundingClientRect().left,
					id : $(this).data(H5GRID_COLUMN_ID)
				});
			});

			return array;
		},

		/**
		 * trackEndのX座標に最も左端が近いセルのインデックスを取得する
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param context
		 */
		_getTrackdEndColumnIndex : function(context) {
			var mouseX = context.event.clientX;
			var idx;

			for (var i = 0, len = this._colPositionArray.length; i < len; i++) {
				var left = this._colPositionArray[i].left;
				var colId = this._colPositionArray[i].id;

				if (mouseX < left || i === len) {
					idx = colId;
					break;
				}
			}

			if (idx == null) {
				idx = this.$find('.grid-header-rows td').last().data(
						H5GRID_COLUMN_ID) + 1;
			}

			return idx;
		},

		/**
		 * 矢印表示
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param context
		 */
		_showTrackendSign : function(context){

			var idx = this._getTrackdEndColumnIndex(context);

			var $headerTd = this.$find('[data-h5-dyn-grid-column-id=' + idx + '].grid-header');
			var offset = $headerTd.offset();

			if ($headerTd.length === 0) {
				// 最後列にカラムを移動させるケース
				var selector = '[data-h5-dyn-grid-column-id=' + (idx - 1)
						+ '].grid-header';
				$headerTd = this.$find(selector);

				offset = $headerTd.offset();
				offset.left += $headerTd.width();
			}

			//矢印を取得
			var $arrow = this.$find(SELECTOR_ARROW);

			//矢印の非表示クラスを除去
			$arrow.removeClass(CLASS_DISP_HIDDEN);

			//矢印移動
			$arrow.offset({
				'top' : offset.top - 17,
				'left' : offset.left - 6
			});
		},

		/**
		 * 矢印非表示
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param
		 */
		_hideTrackendSign : function(){
			//矢印に非表示クラスを設定
			this.$find(SELECTOR_ARROW).addClass(CLASS_DISP_HIDDEN);
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
					data : data,
					idKey: 'id',
					rowHeight: 25,
					gridHeight: 651,
					gridWidth : 860,
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
						sortable: false,
						markable: false
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
						width: 260,
						sortable: true
					},
					{
						propertyName: 'note',
						header: '備考',
						width: 200
					}
					]
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

			//表示されている列のX座標とインデックスを取得
			this._colPositionArray = this._getColumnsPositionInfo();
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
		 * 全選択チェックボックスクリック<p>
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param context
		 * @param $el
		 */
		'#selectAll click': function(context, $el) {
			//全選択 or 全選択解除
			$el[0].checked ?  this._gridController.selectAllData() : this._gridController.unselectAllData();
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
		'#showSelectedDataIds click' : function(context, $el){
			//選択社員IDをアラート表示
			var selectedDataIds = this._gridController.getSelectedDataIds();
			alert(selectedDataIds.length +'件選択しています\n'+selectedDataIds);
		},

		/**
		 * ヘッダ トラック開始
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param context
		 * @param $el
		 */
		'.grid-header-rows .grid-header h5trackstart' : function(context, $el) {
			//トラック開始列インデックスを取得
			this._trackdStartColumnIndex = $el.data(H5GRID_COLUMN_ID);
		},

		/**
		 * ヘッダ トラック中
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param context
		 * @param $el
		 */
		'.grid-header-rows .grid-header h5trackmove' : function(context, $el) {
			//トラック中の列へクラスを設定
			this.$find('[data-h5-dyn-grid-column-id='+ this._trackdStartColumnIndex + '] .grid-cell-frame').addClass(CLASS_TRACK_COLUMN);

			//矢印表示
			this._showTrackendSign(context);
		},

		/**
		 * ヘッダ トラック終了
		 *
		 * @memberOf datagrid.sample.scrollGridController
		 * @param context
		 * @param $el
		 */
		'.grid-header-rows .grid-header h5trackend' : function(context, $el) {

			//トラック終了列インデックスを取得
			var trackEndIndex = this._getTrackdEndColumnIndex(context);

			var gridColumns = this._gridController.getColumns();
			var trackColum = gridColumns[this._trackdStartColumnIndex];// trackStartの発火元のカラム

			//
			if (trackEndIndex < this._trackdStartColumnIndex) {
				this._trackdStartColumnIndex += 1;
			}

			//trackEndの発火元の列の次に列を追加
			gridColumns.splice(trackEndIndex, 0, trackColum);
			//trackStartの発火元の列を削除
			gridColumns.splice(this._trackdStartColumnIndex, 1);

			this._gridController.setColumns(gridColumns);
			this._trackdStartColumnIndex = null;

			//矢印非表示
			this._hideTrackendSign();
		},

	};

	// ---- Init ---- //
	$(function() {
		h5.core.controller('body', scrollGridController);
	});

})(jQuery);
