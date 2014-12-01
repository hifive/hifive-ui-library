/*global h5, bert*/

// ---- Controller ---- //
(function($) {

	var pagingGridController = {

		// --- コントローラの設定 --- //

		__name: 'pagingGridController',

		//		__meta: {
		//			_gridController: {
		//				rootElement: '#grid'
		//			}
		//		},

		// --- プロパティ --- //

		//		_gridController: h5.ui.components.datagrid.PagingGridController,

		_gridLogic: datagrid.sample.GridLogic,

		// --- プライベートなメソッド --- //

		_updateSelectDataIds: function() {
			var selectedDataIds = this._gridController.getSelectedDataIds();
			if (selectedDataIds.length < 15) {
				this.$find('#selectedDataIds').text(selectedDataIds);
			} else {
				this.$find('#selectedDataIds').text(selectedDataIds.slice(0, 14) + '....');
			}
		},

		// --- ライフサイクル関連メソッド --- //

		__ready: function() {
			var defaultNum = this.$find('[name="num-of-record"]').val();
			this.init(0, defaultNum);
		},

		init: function(start, end) {
			//gridの初期化
			if (this._gridController) {
				this._gridController.dispose();
			}
			// 要素のリセット
			this.$find('#grid').attr('id', 'old-grid').after('<div id="grid"></div>');
			this.$find('#old-grid').remove();
			this._gridController = h5.core.controller('#grid',
					h5.ui.components.datagrid.PagingGridController);
			this._gridController.readyPromise.done(this.own(function() {
				this._gridLogic.loadData(start, end).done(this.own(function(data) {
					this._gridController.init({
						data: data,
						idKey: 'id',
						pageSize: 25,
						rowHeight: 25,
						headerColumns: 2,
						gridWidth: 850,
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
							width: 250,
							sortable: true
						}]
					});
				}));
			}));
		},

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

		// --- イベントハンドラメソッド --- //

		// 選択
		'input[type="checkbox"]:not(#selectAll) change': function(context, $el) {
			var isSelected = $el.prop('checked');

			// data による取得は数値変換できる場合はしてしまうので文字列に直す
			var dataId = String($el.data('bertDataId'));

			if (isSelected) {
				this._gridController.selectData(dataId);
				this.$find('#selectAll')[0].checked = true;
			} else {
				this._gridController.unselectData(dataId);
			}

			this._updateSelectDataIds();
		},

		// 全選択 or 全選択解除
		'#selectAll click': function(context, $el) {
			$el[0].checked ? this._gridController.selectAllData() : this._gridController
					.unselectAllData();
			this._updateSelectDataIds();
		},

		// rowId から元データの取得
		'td[data-grid-is-header-row="false"] click': function(context, $el) {
			var rowId = $el.data('gridRowId');
			var data = this._gridController.getCachedData(rowId);

			alert(JSON.stringify(data));
		},

		'#nextPage click': function(context, $el) {
			context.event.preventDefault();

			var currentPage = this._gridController.getCurrentPage();
			var totalPage = this._gridController.getTotalPages();
			if ((currentPage + 1) <= totalPage) {
				this._gridController.movePage(currentPage + 1);
			}

		},

		'#lastPage click': function(context, $el) {
			context.event.preventDefault();

			var totalPage = this._gridController.getTotalPages();
			this._gridController.movePage(totalPage);
		},

		'#prevPage click': function(context, $el) {
			context.event.preventDefault();

			var currentPage = this._gridController.getCurrentPage();
			this._gridController.movePage(currentPage - 1);
		},

		'#firstPage click': function(context, $el) {
			context.event.preventDefault();
			this._gridController.movePage(1);
		},

		'#currentPage change': function(context, $el) {
			var page = parseInt($el.val(), 10);
			var totalPages = this._gridController.getTotalPages();

			if (isNaN(page) || page < 0 || totalPages < page) {
				var currentPage = this._gridController.getCurrentPage();
				$el.val(currentPage);
				return;
			}

			this._gridController.movePage(page);
		},

		// ページが変更されたらページの表示を変える
		'#grid changeSource': function() {
			var totalPages = this._gridController.getTotalPages();
			var currentPage = this._gridController.getCurrentPage();

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

		'#showSelectedDataIds click': function(context, $el) {
			var selectedDataIds = this._gridController.getSelectedDataIds();
			alert(selectedDataIds.length + '件選択しています\n' + selectedDataIds);
		},

		// 件数の変更
		'.create-record-form submit': function(context) {
			context.event.preventDefault();
			var num = this.$find('[name="num-of-record"]').val();
			this.init(0, num);
		}
	};

	//---- Init ---- //
	$(function() {
		h5.core.controller('body', pagingGridController);
	});

})(jQuery);
