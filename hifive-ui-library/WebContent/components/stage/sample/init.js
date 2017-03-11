/*
 * Copyright (C) 2016 NS Solutions Corporation
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
 */
(function($) {
	'use strict';

	var LAYER_ID_MAIN = 'main';
	var LAYER_ID_EDGE = 'edge';

	var classManager = h5.cls.manager;

	var BasicDisplayUnit = classManager.getClass('h5.ui.components.stage.BasicDisplayUnit');
	var DisplayUnitContainer = classManager.getClass('h5.ui.components.stage.DisplayUnitContainer');
	//var Layer = classManager.getClass('h5.ui.components.stage.Layer');
	var Rect = classManager.getClass('h5.ui.components.stage.Rect');
	var Edge = classManager.getClass('h5.ui.components.stage.Edge');

	var stageInitParam = {
		view: {
			autoInit: false
		},

		layers: [{
			id: LAYER_ID_MAIN,
			isDefault: true
		}, {
			id: LAYER_ID_EDGE
		}]
	};


	var stageInitParam2 = {
		layers: [{
			id: 'background'
		}, {
			id: LAYER_ID_MAIN,
			isDefault: true
		}, {
			id: LAYER_ID_EDGE
		}]
	};

	function keyGen() {
		var key = 'abfajafja-' + new Date().getTime() + '-' + parseInt(Math.random() * 100000);
		return key;
	}

	var MAX_ITER = 500000;

	function byMap(map) {
		var removeKeys = [];

		for (var i = 0; i < MAX_ITER; i++) {
			var key = keyGen();
			var rect = Rect.create();
			map.set(key, rect);

			if (Math.random() < 0.3) {
				removeKeys.push(key);
			}
		}

		var array = [];

		map.forEach(function(value, key, thisMap) {
			array.push(value);
		});

		for (var i = 0, len = removeKeys.length; i < len; i++) {
			var rk = removeKeys[i];
			map['delete'](rk); //TODO deleteがEclipseだとキーワード扱いされてエラーになってしまう
		}

		return array;
	}

	function byObj(obj) {
		var removeKeys = [];

		for (var i = 0; i < MAX_ITER; i++) {
			var key = keyGen();
			var rect = Rect.create();
			obj[key] = rect;

			if (Math.random() < 0.3) {
				removeKeys.push(key);
			}
		}

		var array = [];

		for ( var key in obj) {
			var value = obj[key];
			array.push(value);
		}

		for (var i = 0, len = removeKeys.length; i < len; i++) {
			var rk = removeKeys[i];
			delete obj[rk];
		}

		return array;
	}


	var controller = {
		/**
		 * @memberOf hifive.ui.components.sample.stage.AppController
		 */
		__name: 'h5.ui.components.stage.SampleAppController',

		__meta: {
			_stageController: {
				rootElement: '#stageRoot'
			}
		},

		_stageController: h5.ui.components.stage.StageController,

		'[name="moveTo"] click': function(context, $el) {
			this._units[2].moveTo(100, 100);
		},

		'[name="moveBy"] click': function(context, $el) {
			//this._units[1].moveBy(50, 50);
			var du = this._stageController.getFocusedDisplayUnit();
			du.isDraggable = !du.isDraggable;
			du.requestRender();
		},

		'[name="stageScrollTo"] click': function(context) {
			this._stageController.scrollTo(100, 50);
		},

		'[name="stageScrollBy"] click': function(context) {
			//y軸は下向きが正なので、-10すると見た目的には
			//オブジェクトは下に動いたように見える
			this._stageController.scrollBy(-10, -10);
		},

		'[name="scaleX"] change': function(context, $el) {
			var val = parseInt($el.val()) / 100;
			this._stageController.setScale(val, val);
		},

		'[name="scaleY"] change': function(context, $el) {
			var val = $el.val();
			var newScaleY = parseInt(val) / 100;
			this._stageController.setScale(null, newScaleY);
		},

		'[name="getScrollPosition"] click': function() {
		//			var pos = this._stageController.getScrollPosition();
		//			var str = pos.x + ', ' + pos.y;
		//			this.$find('#scrollPos').text(str);

		//this._stageController.UIDragScreenScrollDirection = 3;
		//
		//			var map = new Map();
		//			var obj = Object.create(null);
		//
		//			var beginTime = new Date().getTime();
		//
		//			//byMap(map);  //IE11 1600後半
		//			byObj(obj); //IE11 1600前半？
		//
		//			var endTime = new Date().getTime();
		//
		//			var str = 'time=' + (endTime - beginTime);
		//			this.$find('#scrollPos').text('map: ' + str);
		},

		_createDU: function(rect) {
			var unit = BasicDisplayUnit.create();
			unit.setRect(rect);
			unit.extraData = {
				userText: 'User-defined text'
			};

			//TODO 引数はsvgではなくこのUnitインスタンス
			unit.setRenderer(function(context, graphics) {
				var reason = context.reason;

				if (!reason.isRenderRequested && !reason.isInitialRender && !reason.isFocusChanged
						&& !reason.isSelectionChanged) {
					//初回描画もしくはリクエスト以外では再描画の必要はない
					return;
				}

				var du = context.displayUnit;

				graphics.clear();

				var rect2 = graphics.drawRect();
				rect2.setAttributes({
					x: 10,
					y: 0,
					width: 20,
					height: 20,
					opacity: 1
				});
				//				rect2.fill = du.isSelected ? 'red' : 'black';

				if (du.isFocused) {
					rect2._element.style.fill = 'blue';
				} else if (du.isSelected) {
					rect2._element.style.fill = 'red';
				} else if (!du.isDraggable) {
					rect2._element.style.fill = 'green';
				} else {
					rect2._element.style.fill = 'black';
				}

				//				var vLayout = VerticalLayout.create();
				//				vLyaout.add(rect1, rect2, rect3).align();

				var rect2 = graphics.drawRect();
				rect2.setAttributes({
					x: 30,
					y: 0,
					width: 20,
					height: 20,
					opacity: 0.5
				});

				var text = graphics.drawText();
				text.setText('' + du.id);
				text.setAttributes({
					x: 0,
					y: 10,
					'font-fize': 10
				});
			});

			return unit;
		},

		_createEdge: function(duFrom, duTo) {
			var edge = Edge.create(duFrom, duTo);

			edge.endpointTo.junctionVerticalAlign = 'top';

			edge.endpointFrom.junctionVerticalAlign = 'bottom';

			edge.endpointFrom.junctionHorizontalAlign = 'offset';
			edge.endpointFrom.junctionOffsetX = 15;

			edge.addClass('myEdge');
			edge.addClass('edge-type-1');

			return edge;
		},

		_edges: [],

		_units: [],

		__ready: function() {
			this._stageController.setup(stageInitParam);

			//this._stageController.isWheelScrollDirectionReversed = false;

			this._stageController.setScaleRangeX(0.2, 2);
			this._stageController.setScaleRangeY(0.2, 2);

			var startTime = new Date().getTime();

			var container = DisplayUnitContainer.create();
			//TODO コンテナのwidth, heightに関わらず、無限に出る
			container.setRect(Rect.create(200, 100, 100, 100));

			this._container = container;

			var numCreate = 30;

			for (var i = 0, len = numCreate; i < len; i++) {
				var rect = Rect.create(i * 80 + 4, 10, 80, 40);
				var unit = this._createDU(rect);
				unit.zIndex = numCreate - i;
				container.addDisplayUnit(unit);
				this._units.push(unit);
			}

			var mainLayer = this._stageController.getLayer(LAYER_ID_MAIN);
			mainLayer.addDisplayUnit(container);

			var edge = this._createEdge(this._units[1], this._units[3]);
			this._edges.push(edge);
			this._stageController.getLayer(LAYER_ID_EDGE).addDisplayUnit(edge);

			var edge = this._createEdge(this._units[3], this._units[6]);
			this._edges.push(edge);

			this._stageController.getLayer(LAYER_ID_EDGE).addDisplayUnit(edge);

			this._stageController.initView();

			var endTime = new Date().getTime();

			var msg = 'initialize time = ' + (endTime - startTime) + '[ms]';
			$('#stat').text(msg);
			console.log(msg);

			this._stageController.getLayer(LAYER_ID_EDGE).UIDragScreenScrollDirection = h5.ui.components.stage.ScrollDirection.XY;

			//var worldPos = this._stageController.coordinateConverter.toWorldPosition(1, 1);

			//this._stageController.setvisibleRangeY(-200, 200);
		},

		'{rootElement} duClick': function(context) {
			var du = context.evArg.displayUnit;
			var duId = du.id;
			this.log.debug('duClick! id={0}', duId);
		},

		'{rootElement} duDblclick': function(context) {
			var du = context.evArg.displayUnit;
			var duId = du.id;
			this.log.debug('duDblclick! id={0}', duId);
		},

		'{rootElement} duMouseEnter': function(context) {
			var du = context.evArg.displayUnit;
			this.log.debug('duMouseEnter  du.id=' + du.id);
		},

		'{rootElement} duMouseLeave': function(context) {
			var du = context.evArg.displayUnit;
			this.log.debug('duMouseLeave du.id=' + du.id);
		},

		'{rootElement} stageContextmenu': function(context) {
			this.log.debug('stageContextmenu');
			context.event.preventDefault();
		},

		'{rootElement} contextmenu': function(context) {
		//			var du = context.evArg.displayUnit;
		//			this.log.debug('duContextmenu id=' + du.id);
		//context.event.preventDefault();
		},

		'{rootElement} duContextmenu': function(context) {
			var du = context.evArg.displayUnit;
			this.log.debug('duContextmenu id=' + du.id);
			//context.event.preventDefault();
		},

		'{rootElement} stageSelectionChange': function(context) {
			var ev = context.evArg;
			this.log.debug('stageSelectionChange: focused.id={2}, selected={0},unselected={1}',
					ev.changes.selected.length, ev.changes.unselected.length,
					ev.focused ? ev.focused.id : 'null');
		},

		'{rootElement} duKeyDown': function(context) {
			//最新のWeb仕様(DOM4, Dom Level3 Events)では、
			//キーボードイベントでは key か code を使用すべきとされている。IE9,FF23, Ch51以降で対応。
			//charCode, keyCode, whichはDeprecatedなので使用しない。
			//なお、keyboardEvent.key において矢印キーの値は
			//IE,FF36-は"Right"、FF37+,Chは"ArrowRight"のような文字列になるので注意。
			//詳細：https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
			this.log.debug('duKeyDown tagName={0}, key={1}', context.event.target.tagName,
					context.event.key);
		},

		'{rootElement} duKeyPress': function(context) {
			this.log.debug('duKeyPress tagName={0}, key={1}', context.event.target.tagName,
					context.event.key);
		},

		'{rootElement} duKeyUp': function(context) {
			this.log.debug('duKeyUp tagName={0}, key={1}', context.event.target.tagName);
		},

		'{rootElement} stageDragStart': function(context) {
			this.log.debug('stageDragStart');

			var elem = $.parseHTML('<div class="dragProxy">ドラッグプロキシ<br>ドラッグ数：'
					+ context.evArg.dragSession.getTarget().length + '</div>')[0];

			//context.event.preventDefault();
			context.evArg.dragSession.setProxyElement(elem);
		},

		'{rootElement} stageDragMove': function(context) {
			var dragOverDU = context.evArg.dragOverDisplayUnit;
			this.log.debug('stageDragMove: dragOverDUID={0}', dragOverDU == null ? 'null'
					: dragOverDU.id);
			//context.evArg.dragSession.setCursor('not-allowed');
		},

		'{rootElement} stageDragEnd': function(context) {
			this.log.debug('stageDragEnd');
		},

		'{rootElement} stageClick': function(context) {
			this.log.debug('stageClick');
			//context.event.preventDefault();
		},

		'[name="scrollIntoView"] click': function() {
			var du = this._stageController.getDisplayUnitById('duid_4');
			du.scrollIntoView('center');
		},

		'[name="scrollIntoView_glance"] click': function() {
			var du = this._stageController.getDisplayUnitById('duid_5');
			du.scrollIntoView();
		},

		'{rootElement} stageDragSelectStart': function(context) {
		//context.event.preventDefault();
		},

		'{rootElement} stageDragStarting': function(context) {
		//context.event.preventDefault();
		},

		'[name="dragRegion"] click': function() {
			this._stageController.UIDragMode = 5; //
		},

		'{rootElement} stageDragRegionStart': function(context) {
			console.log(context.event.type);
		},

		'{rootElement} stageDragRegionEnd': function(context) {
			console.log(context.event.type);
			console.log(context.evArg);
		},

		'input[name="splitView"] click': function(context) {
			var hDef = [{
				height: 300,
				scrollBarMode: 'always'
			}, {
				type: 'separator',
				height: 5
			}, {}];

			//3行
			//			hDef = [{
			//				height: 300,
			//				scrollBarMode: 'always'
			//			}, {
			//				type: 'separator',
			//				height: 5
			//			},
			//
			//			{
			//				height: 300,
			//				scrollBarMode: 'always'
			//			},
			//
			//			{
			//				type: 'separator',
			//				height: 5
			//			},
			//
			//			{}
			//			];

			hDef = [{
				"height": 369,
				"visibleRangeY": {
					"min": -1000,
					"max": 2000
				},
				"scrollBarMode": "always"
			}, {
				"type": "separator",
				"height": 4
			}, {
				//"height": 300, // 末尾のcontentsのheightは省略可能
				"visibleRangeY": {
					"min": -1000,
					"max": 2000
				},
				scrollBarMode: 'always'
			}];

			//			hDef = [{
			//				scrollBarMode: 'always'
			//			}];

			var vDef = [{
				scrollBarMode: 'always'
			}];

			//2列
			vDef = [{
				width: 300,
				scrollBarMode: 'always',
				visibleRangeX: {
					min: -1000,
					max: 1000
				}
			}, {
				type: 'separator',
				width: 5
			}, {
				scrollBarMode: 'always',
				visibleRangeX: {
					min: -1000,
					max: 1000
				}
			}];

			//3列
			//			vDef = [{
			//				width: 300,
			//				scrollBarMode: 'always',
			//				visibleRangeX: {
			//					min: -1000,
			//					max: 1000
			//				}
			//			}, {
			//				type: 'separator',
			//				width: 5
			//			}, {
			//				width: 300,
			//				scrollBarMode: 'always',
			//				visibleRangeX: {
			//					min: -1000,
			//					max: 1000
			//				}
			//			}, {
			//				type: 'separator',
			//				width: 5
			//			}, {
			//				scrollBarMode: 'always',
			//				visibleRangeX: {
			//					min: -1000,
			//					max: 1000
			//				}
			//			}];

			this._stageController.splitView(hDef, vDef);
		},

		'input[name="setup"] click': function() {
			this._stageController.setup(stageInitParam2);
		},

		'input[name="visibleRangeY"] click': function() {
			this._stageController._getActiveView().setVisibleRangeY(0, 1000);
		},

		'input[name="visibleRangeX"] click': function() {
			this._stageController._getActiveView().setVisibleRangeX(-500, 2000);
		},

		'input[name="clearSplitView"] click': function(context) {
			this._stageController.splitView(null, null);
		},

		'input[name="removeDU"] click': function(context) {
			var selections = this._stageController.getSelectedDisplayUnits();
			selections.forEach(function(du) {
				du.remove();
			});
			//this._container.moveTo(200, 10);
		},

		'input[name="cascadeRemove"] click': function(context) {
			this._edges[0]._from.remove();
		},

		'{rootElement} duCascadeRemoving': function(context) {
			context.event.preventDefault();
			console.log(context);
		},

		'input[name="row1vr"] click': function(context) {
			this._stageController.getViewCollection().getView(0, 1).setVisibleRangeX(100, 200);
			this._stageController.getViewCollection().getView(1, 0).setVisibleRangeY(0, 100);
		},

		'input[name="zIndex"] click': function() {
			var selections = this._stageController.getSelectedDisplayUnits();
			selections.forEach(function(du) {
				du.zIndex = 4;
			});
		},

		'{rootElement} stageViewStructureChange': function() {
			console.log('stageViewStructureChange');
		},

		'{rootElement} stageViewUnifiedSightChange': function() {
			console.log('stageViewUnifiedSightChange');
		}
	};


	$(function() {
		h5.core.controller('#appRoot', controller);

		var stage = h5.cls.manager.getNamespaceObject('h5.ui.components.stage');
		console.log(stage);

		//TOOD classとして作ったコントローラはチェックでconstructorプロパティが重複すると言われる
		//		var dscClass = h5.cls.manager.getClass('h5.ui.components.stage.DragSessionController');
		//		var c = dscClass.create();
		//		var cc = h5.core.controller('body', c);

	});

})(jQuery);
