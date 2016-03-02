/* jshint browser: true, jquery: true */
/* global h5 */

(function($) {
	'use strict';

	var datagrid = h5.ui.components.datagrid;
	var cellFormatter = datagrid.view.dom.cellFormatter;
	var changeHandler = datagrid.view.dom.changeHandler;

	var log = h5.log.createLogger('sample');

	function dumyAjax(param) {

		if (param.type === 'search') {
			
			return datagrid.util.delay(500, function() {
				return {
					// MEMO: 9000兆 ぐらいに JavaScript 整数値の限界値がある & その辺だと表示がずれることがある
					fetchLimit: 10000000000000,
					fetchParam: param.param
				};
			});
			
		} else if (param.type === 'fetch') {

			var range = param.range;
			var dataArray = [];
			for (var i = 0, len = range.length; i < len; i++) {
				dataArray.push({
					id: String(i + range.index),
					name: 'Taro',
					score: 70
				});
			}
			
			return datagrid.util.delay(500, function() {
				return {
					dataArray: dataArray
				};
			});

		} else if (param.type === 'commit') {
			log.info(param.edit);
			return datagrid.util.delay(500, $.noop);
		}
	}


	var pageController = {

		// --- Metadata --- //

		__name: 'PageController',

		__meta: {
			_gridController: {
				rootElement: '#grid'
			}
		},


		// --- Child Controller --- //

		_gridController: datagrid.GridController,


		// --- Life Cycle Method --- //

		__ready: function() {

			var param = {
				searcher: {
					type: 'lazy',
					param: {
						fetchUnit: 100
					}
				},

				mapper: {
					type: 'property',
					param: {
						direction: 'vertical',
						visibleProperties: {
							header: ['_select', 'id'],
							main: ['name', 'score', 'hoge']
						},

						dataDirectionSize: {
							size: 25
						}
					}
				},

				view: {
					type: 'table',
					param: {
						cellClassDefinition: {
							highScore: function(cell) {
								if (cell.editedData == null || cell.editedData.score == null) {
									return false;
								}
								return 80 <= cell.editedData.score;
							},

							editedCell: function(cell) {
								return cell.editedValue !== cell.originalValue;
							}
						},

						disableInput: function() {
							return false;
						}
					}
				},

				properties: {
					_select: {
						size: 25,
						enableResize: false,
						toValue: function(data, cell) {
							return cell.isSelectedData;
						},

						formatter: cellFormatter.checkbox(true),
						changeHandler: changeHandler.selectData()
					},

					id: {
						size: 150
					},

					name: {
						formatter: cellFormatter.select(['Taro', 'Jiro', 'Hanako']),
						changeHandler: changeHandler.edit(),
						sortable: true
					},

					score: {
						formatter: cellFormatter.input('text'),
						changeHandler: changeHandler.edit(parseInt),
						sortable: true
					},

					hoge: {
						size: 150,
						toValue: function() {
							return 'hoge';
						},

						sortable: true,
						sortProperty: 'id'
					}
				}
			};

			var dataSource = datagrid.createDataSource({
				idProperty: 'id',
				type: 'ajax',
				param: {
					ajax: dumyAjax,
					search: {
						request: function(param) {
							return {
								type: 'search',
								param: param
							};
						},
						response: function(result) {
							return result;
						}
					},
					fetch: {
						request: function(param, range) {
							return {
								type: 'fetch',
								param: param,
								range: range
							};
						},
						response: function(result) {
							return result;
						}
					},
					find: {
						request: $.noop,
						response: $.noop
					},
					commit: {
						request: function(edit) {
							return {
								type: 'commit',
								edit: edit.getReplacedDataSet()
							};
						},
						response: $.noop
					}
				}
			});

			window.dataSource = dataSource;
			this._gridController.activate(dataSource, param);

			datagrid.util.delay(1000, this.own(function() {
				this._gridController.search({});
			}));
		},


		// --- Event Handler --- //

		'.gridCellFrame mousedown': function(context, $el) {
			var cellStr = $el.data('h5DynGridCell');
			var cell = h5.u.obj.deserialize(cellStr);
			log.info('click dataId={0}', cell.dataId);
		},

		'{window} resize': function() {
			this._gridController.resize();
		}

	};

	$(function() {
		window.controller = h5.core.controller('body', pageController);
	});

})(jQuery);
