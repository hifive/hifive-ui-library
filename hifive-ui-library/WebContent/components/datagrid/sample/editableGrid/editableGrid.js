/* jshint browser: true, jquery: true */
/* global h5 */

(function($) {
	'use strict';

	var datagrid = h5.ui.components.datagrid;
	var cellFormatter = datagrid.view.dom.cellFormatter;
	var changeHandler = datagrid.view.dom.changeHandler;

	var log = h5.log.createLogger('sample');

	function random(n) {
		return Math.floor(Math.random() * n);
	}

	function randomValue(array) {
		var i = random(array.length);
		return array[i];
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

			var names = ['Taro', 'Hanako', 'Jiro'];
			var sourceArray = [];

			for (var i = 0; i < 10000; i++) {
				sourceArray.push({
					id: (i === 10) ? 'GG' : String(i),
					name: randomValue(names),
					score: random(11) * 10
				});
			}

			var param = {
				searcher: {
					type: 'all'
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
							size: 20
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
						},

						sortAscIconClasses: ['aaaaaa'],
						sortDescIconClasses: [],
						sortClearIconClasses: []
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
						size: 50
					},

					name: {
						formatter: cellFormatter.select(['Taro', 'Jiro', 'Hanako']),
						changeHandler: changeHandler.edit(),
						sortable: true,
						filter: ['Taro', 'Jiro', 'Hanako']
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
				type: 'local',
				param: sourceArray
			});

			this._gridController.activate(dataSource, param);

			datagrid.util.delay(1000, this.own(function() {
				this._gridController.search({});
			}));
		},


		// --- Event Handler --- //

		'.gridCellFrame mousedown': function(context, $el) {
			var row = $el.data('h5DynGridRow');
			log.info('click row={0}', row);
		},

		'{window} resize': function() {
			this._gridController.refresh();
		}

	};

	$(function() {
		window.controller = h5.core.controller('body', pageController);
	});

})(jQuery);