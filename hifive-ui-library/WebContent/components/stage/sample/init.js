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
	var LAYER_ID_DIV = 'divlayer';
	var LAYER_ID_EDGE = 'edge';
	var LAYER_ID_UNSCALED = 'unscaled';


	var classManager = h5.cls.manager;

	var RootClass = classManager.getClass('h5.cls.RootClass');

	var BasicDisplayUnit = classManager.getClass('h5.ui.components.stage.BasicDisplayUnit');
	var DisplayUnitContainer = classManager.getClass('h5.ui.components.stage.DisplayUnitContainer');
	var DependentDisplayUnit = classManager.getClass('h5.ui.components.stage.DependentDisplayUnit');
	//var Layer = classManager.getClass('h5.ui.components.stage.Layer');
	var Rect = classManager.getClass('h5.ui.components.stage.Rect');
	var Edge = classManager.getClass('h5.ui.components.stage.Edge');
	console.log(BasicDisplayUnit.create('test-id'));
	var SingleLayerPlane = classManager.getClass('h5.ui.components.stage.SingleLayerPlane');
	var StackViewport = classManager.getClass('h5.ui.components.stage.StackViewport');
	var ViewportDisplayUnitContainer = classManager
			.getClass('h5.ui.components.stage.ViewportDisplayUnitContainer');
	var DragLiveMode = h5.ui.components.stage.DragLiveMode;

	var SynchronizeLayoutHook = classManager
			.getClass('h5.ui.components.stage.SynchronizeLayoutHook');
	var FollowPositionLayoutHook = classManager
			.getClass('h5.ui.components.stage.FollowPositionLayoutHook');
	var DisplaySizeLayoutHook = classManager
			.getClass('h5.ui.components.stage.DisplaySizeLayoutHook');
	var HorizontalLineLayoutHook = classManager
			.getClass('h5.ui.components.stage.HorizontalLineLayoutHook');
	var VisiblePositionLayoutHook = classManager
			.getClass('h5.ui.components.stage.VisiblePositionLayoutHook');

	var DUScrollBar = classManager.getClass('h5.ui.components.stage.DUScrollBar');

	var DragMode = h5.ui.components.stage.DragMode;


	var editorHtml = '<div class="simpleTextEditor"><div class="innerPad"><textarea class="simpleTextEditorTextarea"></textarea>'
			+ '<div class="editorControls"><button class="commitButton">OK</button><span class="controlSpacer"></span>'
			+ '<button class="cancelButton">キャンセル</button></div></div></div>';

	var SimpleTextEditor = RootClass.extend(function(super_) {
		var desc = {
			name: 'sample.SimpleTextEditor',

			field: {
				_editSession: null,
				_undoData: null,
				_$editor: null
			},

			method: {
				/**
				 * @constructor
				 * @memberOf sample.SimpleTextEditor
				 */
				constructor: function SimpleTextEditor() {
					super_.constructor.call(this);
					this._editSession = null;
					this._undoData = null;
				},

				getView: function(editSession) {
					var that = this;
					var $editor = $(editorHtml);
					$editor.on('click', '.commitButton', function() {
						//編集途中状態をDUに反映させる方法は2通り
						//DU自体を変更してrequestRender() または editSession.notifyChange(data);

						//これを行えば
						//that.onCommit(editSession);

						editSession.commit();

						//editSession.notifyChange();
					}).on('input', 'textarea', function() {
						var text = $editor.find('.simpleTextEditorTextarea').val();
						var targetDU = editSession.targets[0];
						targetDU.extraData = {
							text: text
						};
						targetDU.requestRender();
					}).on('click', '.cancelButton', function() {
						editSession.cancel();
					});
					this._$editor = $editor;
					return $editor[0];
				},

				onBegin: function(editSession) {
					this._editSession = editSession;

					var targetDU = editSession.targets[0];
					this._undoData = targetDU.extraData;

					var $textarea = this._$editor.find('.simpleTextEditorTextarea');
					$textarea.val(targetDU.extraData.text).focus();
				},

				onCommit: function(editSession) {
					var text = this._$editor.find('.simpleTextEditorTextarea').val();

					//編集途中状態をDUに反映させる方法は2通り
					//DU自体を変更してrequestRender() または editSession.notifyChange(data);
					var targetDU = editSession.targets[0];
					targetDU.extraData = {
						text: text
					};
					targetDU.requestRender();
				},

				onCancel: function(editSession) {
					var targetDU = editSession.targets[0];
					targetDU.extraData = this._undoData;
					targetDU.requestRender();
				},

				onUpdateLayout: function(editSession, rect) {
					var $editor = this._$editor.find('.innerPad');

					var $controls = $editor.find('.editorControls');

					//"OK"と"キャンセル"ではキャンセルの方がボタンが大きくなってしまうので
					//OKボタンの大きさをキャンセルボタンと同じにする
					var $cancelBtn = $controls.find('.cancelButton');
					$controls.find('.commitButton').width($cancelBtn.width());

					var $textarea = $editor.find('.simpleTextEditorTextarea');

					var controlsHeight = $controls.outerHeight(true);
					var textareaPaddingH = $textarea.innerHeight() - $textarea.height();

					//textareaのサイズは、(エディタの内部高さ) - (コントロールのボーダー高さ) - (textareaのpadding高さ)
					var textHeight = $editor.height() - controlsHeight - textareaPaddingH;
					$textarea.height(textHeight);
				},

				dispose: function(editSession) {
					this._$editor.off();
				}
			}
		};
		return desc;
	});

	var stageInitParam = {
		view: {
			autoInit: false
		},

		layers: [{
			id: LAYER_ID_MAIN,
			isDefault: true,
			type: 'svg'
		}, {
			id: LAYER_ID_DIV,
			type: 'div'
		}, {
			id: LAYER_ID_EDGE,
			type: 'svg'
		}, {
			id: LAYER_ID_UNSCALED,
			type: 'div',
			isUnscaledRendering: true
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

		_setupDU: function(du, rect) {
			var unit = du;
			unit.setRect(rect);
			unit.extraData = {
				userText: 'User-defined text'
			};

			unit.isEditable = false;

			//TODO 引数はsvgではなくこのUnitインスタンス
			unit.setRenderer(function(context, graphics) {
				var reason = context.reason;

				if (!reason.isSizeChanged && !reason.isRenderRequested && !reason.isInitialRender
						&& !reason.isFocusChanged && !reason.isSelectionChanged) {
					//初回描画もしくはリクエスト以外では再描画の必要はない
					return;
				}

				var du = context.displayUnit;

				graphics.clear();

				var rect2 = graphics.drawRect();
				rect2.setAttributes({
					x: 10,
					y: 0,
					width: du.width,
					height: du.height,
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

		_createEdge: function(duFrom, duTo, hAlign) {
			var edge = Edge.create(duFrom, duTo);

			edge.endpointFrom.verticalAlign = 'nearestSide';
			//			edge.endpointFrom.verticalAlign = 'bottom';
			edge.endpointFrom.horizontalAlign = hAlign ? hAlign : 'left';

			edge.endpointTo.verticalAlign = 'nearestSide';
			//			edge.endpointTo.verticalAlign = 'top';
			edge.endpointTo.horizontalAlign = hAlign ? hAlign : 'left';

			//			edge.endpointFrom.horizontalAlign = 'offset';
			//			edge.endpointFrom.alignOffsetX = 15;

			edge.addClass('myEdge');
			edge.addClass('edge-type-1');

			return edge;
		},

		_createDivDU: function(rect, text) {
			var du = BasicDisplayUnit.create();
			du.setRect(rect);
			du.extraData = {
				type: 'text',
				text: text ? text : 'this is a div DU'
			};

			//TODO 引数はsvgではなくこのUnitインスタンス
			du.setRenderer(function(context, graphics) {
				var reason = context.reason;
				if (reason.isInitialRender) {
					$(context.rootElement).addClass('commentDU');
				}

				if(du.isFocused) {
					$(context.rootElement).addClass('focused');
				} else {
					$(context.rootElement).removeClass('focused');
				}

				if(!reason.isInitialRender && !reason.isRenderRequested) {
					return;
				}

				var rawText = context.displayUnit.extraData.text;
				var escaped = h5.u.str.escapeHtml(rawText);

				var htmlText = escaped.replace(/\n/g, '<br>');
				$(context.rootElement).html(htmlText);
			});

			return du;
		},

		_edges: [],

		_units: [],

		fixLayout: null,

		__ready: function() {
			this._stageController.setup(stageInitParam);

			//this._stageController.isWheelScrollDirectionReversed = false;

			this._stageController.setScaleRangeX(0.2, 2);
			this._stageController.setScaleRangeY(0.2, 2);

			var startTime = new Date().getTime();

			var mainLayer = this._stageController.getLayer(LAYER_ID_MAIN);
			var unscaledLayer = this._stageController.getLayer(LAYER_ID_UNSCALED);


			var usContainer = DisplayUnitContainer.create();
			usContainer.setRect(Rect.create(200, 50, 0, 0));
			unscaledLayer.addDisplayUnit(usContainer);
			var usDU = this._createDivDU(Rect.create(200, 200, 100, 40));
			usContainer.addDisplayUnit(usDU);
			usDU.isResizable = true;
			usDU.isDraggable = true;
			usDU.extraData = {
				text: 'in unscaled-rendering layer with ScrollBar'
			};

			var usDU2 = this._createDivDU(Rect.create(200, 300, 100, 40));
			usContainer.addDisplayUnit(usDU2);
			usDU2.isResizable = true;
			usDU2.isDraggable = true;

			var sb = DUScrollBar.create();
			sb.width = 16;
			sb.height = 100;
			sb.isDraggable = false;
			sb.isResizable = false;
			usContainer.addDisplayUnit(sb);

			var container = DisplayUnitContainer.create();
			//TODO コンテナのwidth, heightに関わらず、無限に出る
			container.setRect(Rect.create(200, 100, 100, 100));
			container.overflow = 'hidden';
			this._container = container;

			var numCreate = 30;

			var plane = SingleLayerPlane.create();
			this._stageController.addPlane(plane);

			var stackViewport = StackViewport.create(plane);
			stackViewport.setSize(2000, 100);
			stackViewport.orientation = true; // 水平方向にスタック

			var numPartitions = 10;

			var viewportContainers = stackViewport.createPartitions(numPartitions);

			for (var i = 0, len = numPartitions; i < len; i++) {
				var vc = viewportContainers[i];
				vc.x = 50;
				vc.y = 300 + 100 * i;

				if (i % 2 == 0) {
					vc.overflow = 'hidden';
				}

				mainLayer.addDisplayUnit(vc);
			}

			for (var i = 0, len = numCreate; i < len; i++) {
				var rect = Rect.create(i * 80 + 4, 10, 80, 40);
				var unit = this._setupDU(BasicDisplayUnit.create(), rect);
				unit.isResizable = true;
				unit.isEditable = false;
				unit.zIndex = numCreate - i;
				//				container.addDisplayUnit(unit);

				plane.addDisplayUnit(unit);

				this._units.push(unit);
			}


			//			mainLayer.addDisplayUnit(container);

			var edge = this._createEdge(this._units[1], this._units[3]);
			this._edges.push(edge);
			this._stageController.getLayer(LAYER_ID_EDGE).addDisplayUnit(edge);

			var dependentDU = DependentDisplayUnit.create(this._units[1]);
			var depRect = Rect.create(400, 300, 60, 40);
			this._setupDU(dependentDU, depRect);
			this._stageController.getLayer(LAYER_ID_MAIN).addDisplayUnit(dependentDU);
			dependentDU.isResizable = true;
			dependentDU.isEditable = false;
			dependentDU.resizeConstraint = {
				minWidth: 20,
				maxWidth: 300,
				minHeight: 20,
				maxHeight: 100,
				stepX: 30,
				stepY: 20,
				region: {
					left: 300,
					right: 500
				}
			};

			var edge = this._createEdge(this._units[3], this._units[6]);
			this._edges.push(edge);

			this._stageController.getLayer(LAYER_ID_EDGE).addDisplayUnit(edge);

			this._containerTest();

			//DIVレイヤーテスト
			var divContainer = DisplayUnitContainer.create();
			var rect = Rect.create(0, 0, 200, 60);
			divContainer.setRect(rect);
			var divDU = this._createDivDU(rect);
			divDU.x = 0;
			divDU.y = 0;
			divContainer.addDisplayUnit(divDU);
			this._stageController.getLayer(LAYER_ID_DIV).addDisplayUnit(divContainer);
			divDU.isResizable = true;

			this._divDU = divDU;

			var syncLayout = SynchronizeLayoutHook.create(false, true, false, true);
			syncLayout.setSource(usDU);
			syncLayout.addTargets(sb);

			/*
			var followLayout = FollowPositionLayoutHook.create(40, 30);
			followLayout.setSource(divDU);
			followLayout.addTargets(usDU);
			*/

			var displaySizeLayout = DisplaySizeLayoutHook.create();
			displaySizeLayout.attachTo(sb, 16, null);

			var visiblePositionLayout = VisiblePositionLayoutHook.create(null, null, 0, null);
			visiblePositionLayout.attachTo(sb);

			/*
			var hLineLayout = HorizontalLineLayoutHook.create('top');
			hLineLayout.attachTo([usDU, sb]);
			 */

			this._stageController.initView();

			var endTime = new Date().getTime();

			var msg = 'initialize time = ' + (endTime - startTime) + '[ms]';
			$('#stat').text(msg);
			console.log(msg);

			this._stageController.getLayer(LAYER_ID_EDGE).UIDragScreenScrollDirection = h5.ui.components.stage.ScrollDirection.XY;

			//var worldPos = this._stageController.coordinateConverter.toWorldPosition(1, 1);

			//this._stageController.setvisibleRangeY(-200, 200);
		},

		_containerTest: function() {
			var container = DisplayUnitContainer.create();
			container.setRect(Rect.create(300, 200, 200, 200));
			this._stageController.addDisplayUnit(container);
			container.isBoundaryScrollEnabled = true;
			var du1 = BasicDisplayUnit.create();

			du1.isEditable = false;
			du1.setRect(Rect.create(0, 0, 100, 50));
			du1.extraData = {
				userText: 'テキスト文字列'
			};
			du1.setRenderer(renderer);
			container.addDisplayUnit(du1);

			var c2 = DisplayUnitContainer.create();
			c2.setRect(Rect.create(300, 500, 200, 200));
			this._stageController.addDisplayUnit(c2);
			this._c2 = c2;

			var du2 = BasicDisplayUnit.create();
			du2.setRect(Rect.create(0, 0, 50, 50));
			du2.extraData = {
				userText: 'テキスト文字列'
			};
			du2.setRenderer(renderer);
			du2.isEditable = false;
			c2.addDisplayUnit(du2);
			c2.overflow = 'hidden';

			var e1 = this._createEdge(du1, du2);
			this._stageController.addDisplayUnit(e1);

			function renderer(context, graphics) {
				var reason = context.reason;

				if (!reason.isSizeChanged && !reason.isRenderRequested && !reason.isInitialRender
						&& !reason.isFocusChanged && !reason.isSelectionChanged) {
					//初回描画もしくはリクエスト以外では再描画の必要はない
					return;
				}

				var du = context.displayUnit;

				graphics.clear();

				var rect2 = graphics.drawRect();
				rect2.setAttributes({
					x: 0,
					y: 0,
					width: du.width,
					height: du.height,
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
					rect2._element.style.fill = 'maroon';
				}

				var text = graphics.drawText();
				text.setText('' + du.id);
				text.setAttributes({
					x: 0,
					y: 0,
					'font-fize': 10
				});
			}

		},

		_c2: null,

		'[name="scrollC2"] click': function(context) {
			this._c2.scrollBy(-10, -10);
		},

		'{rootElement} duClick': function(context) {
			var du = context.evArg.displayUnit;
			var duId = du.id;
			//this.log.debug('duClick! id={0}', duId);

			if(this._isCreatingEdge) {
				//エッジ生成中
				if(this._ceDUFrom && this._ceDUFrom !== du) {
					//1つ目のDUが選択済み、かつ今回クリックしたのがそれとは異なるので、今回のDUとエッジを作る
					var edge = this._createEdge(this._ceDUFrom, du, 'nearestSide');
					this._stageController.getLayer(LAYER_ID_EDGE).addDisplayUnit(edge);

					//エッジ生成モード解除
					this._isCreatingEdge = false;
					this.$find('#createEdgeMode').text('');
				} else {
					//1つ目のDUとして選択
					this._ceDUFrom = du;
					this.$find('#createEdgeMode').text('2つ目のDUを選択');
				}
				return;
			}

			var gp = du.getWorldGlobalPosition();
			var foremostDUC = this._stageController._getForemostDisplayUnitContainerAt(gp.x, gp.y);
			console.debug('duClick: foremostContainer = ', foremostDUC);
		},

		'{rootElement} duDblclick': function(context) {
			var du = context.evArg.displayUnit;
			var duId = du.id;
			this.log.debug('duDblclick! id={0}', duId);

			if(du.isEditable) {
				du.beginEdit();
			}
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
			this.log
					.debug(
							'stageSelectionChange: focusedRaw={3}, focused.id={2}, selected={0}, unfocused={5}, unfocusedRaw={4}, unselected={1}',
							ev.changes.selected.length, ev.changes.unselected.length,
							ev.focused ? ev.focused.id : 'null', ev.focusedRaw ? ev.focusedRaw.id
									: 'null', ev.unfocusedRaw ? ev.unfocusedRaw.id : 'null',
							ev.unfocused ? ev.unfocused.id : 'null');
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

		'{rootElement} duDragBegin': function(context) {
			this.log.debug('duDragBegin');

			//			setTimeout(function(){
			//				context.evArg.dragSession.cancel();
			//			}, 2000);

			if(typeof context.evArg.dragSession.getTargets()[0].extraData.text === 'string') {
				context.evArg.dragSession.liveMode = DragLiveMode.OVERLAY;
			} else {
				context.evArg.dragSession.liveMode = DragLiveMode.OVERLAY_AND_STAY;
			}

			var elem = $.parseHTML('<div class="dragProxy">ドラッグプロキシ<br>ドラッグ数：'
					+ context.evArg.dragSession.getTargets().length + '</div>')[0];

			//context.event.preventDefault();
			//			context.evArg.dragSession.setProxyElement(elem);

			//context.event.preventDefault();
		},

		'{rootElement} duDragMove': function(context) {
			var dragOverDU = context.evArg.dragOverDisplayUnit;
			this.log.debug('duDragMove: dragOverDUID={0}', dragOverDU == null ? 'null'
					: dragOverDU.id);
			//context.evArg.dragSession.setCursor('not-allowed');
		},

		'{rootElement} duDragDrop': function(context) {
			this.log.debug('duDragDrop');
		},

		'{rootElement} duDragCancel': function(context) {
			this.log.debug('duDragCancel');
		},

		'{rootElement} duDragEnd': function(context) {
			this.log.debug('duDragEnd');
		},

		'{rootElement} stageClick': function(context) {
			this.log.debug('stageClick');
			//context.event.preventDefault();
		},

		'[name="scrollIntoView"] click': function() {
			//var du = this._stageController.getDisplayUnitById('duid_4');
			var du = this._units[4];
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
			console.log('stageDragStarting', context.evArg);
			//context.event.preventDefault();
		},

		'[name="dragRegion"] click': function() {
			this._stageController.UIDragMode = 7; //
		},

		'{rootElement} stageViewUpdate': function() {
		//console.log('Views are actually Updated');
		},

		'{rootElement} duResizeBegin': function(context) {
			console.log(context.event.type);

			var elem = $.parseHTML('<div class="dragProxy">リサイズプロキシ<br>ドラッグ数：'
					+ context.evArg.resizeSession.getTargets().length + '</div>')[0];

			//context.event.preventDefault();
			context.evArg.resizeSession.setProxyElement(elem);

			//			setTimeout(function(){
			//				console.log('resizeSession.cancel()');
			//				context.evArg.resizeSession.cancel();
			//			}, 2000);

			//context.event.preventDefault();

			//context.evArg.resizeSession.setConstraintOverride();
		},

		'{rootElement} duResizeChange': function(context) {
			console.log(context.event.type);
		},

		'{rootElement} duResizeCommit': function(context) {
			console.log(context.event.type);
			//			context.evArg.resizeSession.async = true;
			//			setTimeout(function(){
			//				context.evArg.resizeSession.end();
			//			}, 2000);
		},

		'{rootElement} duResizeEnd': function(context) {
			console.log(context.event.type);
		},

		'{rootElement} duResizeCancel': function(context) {
			console.log(context.event.type);
		},

		'input[name="setRectDU"] click': function(context) {
			//this.fixLayout.width = 400;
			//this.fixLayout.height = 500;

			var du = this._units[5];
			du.setRect({
				x: 10,
				y: 20,
				width: 300,
				height: 80
			});
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

		'input[name="editDivDU"] click': function() {
			//this._container.scrollX = 10;
			this._divDU.beginEdit();
			//			du.startEdit();
			//			du.commitEdit();
			//			du.cancelEdit();
		},

		'input[name="setSize"] click': function() {
			this._stageController.setSize(600, 600);

			//			var that = this;
			//			setTimeout(function(){
			//				that._stageController.setSize(null, null);
			//			}, 2000);

		},

		'{rootElement} stageViewStructureChange': function() {
			console.log('stageViewStructureChange');
		},

		'{rootElement} stageViewUnifiedSightChange': function() {
			console.log('stageViewUnifiedSightChange');
		},

		'{rootElement} stageSightChange': function() {
			console.log('sightChange');
		},

		'{rootElement} duEditBeginning': function(context) {
			var arg = context.evArg;
			var editor = SimpleTextEditor.create();
			arg.setEditor(editor);
			//arg.setModal(true);

			var autoLayoutSetting = {
				followTarget: arg.displayUnit
			};
			arg.setAutoLayout(autoLayoutSetting);
		},

		'[name="createDUByRegion"] click': function() {
			this._stageController.UIDragMode = DragMode.REGION;
		},

		'{rootElement} stageDragRegionStart': function(context) {
			console.log(context.event.type);
		},

		'{rootElement} stageDragRegionEnd': function(context) {
			var evArg = context.evArg;
			console.log(evArg);
			this._stageController.UIDragMode = DragMode.AUTO;

			var region = evArg.region;

			var now = new Date();
			var nowStr = '生成時刻：' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds()
					+ '.' + now.getMilliseconds();

			var du = this._createDivDU(region, nowStr);
			du.isDraggable = true;
			du.isEditable = true;
			du.isResizable = true;
			this._stageController.getLayer(LAYER_ID_DIV).addDisplayUnit(du);
		},

		'{[name="createEdge"]} click': function(context) {
			this._isCreatingEdge = true;
			this._ceDUFrom = null;
			this.$find('#createEdgeMode').text('1つ目のDUを選択');
		},

		_isCreatingEdge: false,

		_ceDUFrom: null
	};


	$(function() {
		h5.core.controller('#appRoot', controller);

		var stage = h5.cls.manager.getNamespaceObject('h5.ui.components.stage');
		console.log(stage);

		//TOOD classとして作ったコントローラはチェックでconstructorプロパティが重複すると言われる
		//		var dscClass = h5.cls.manager.getClass('h5.ui.components.stage.DragSessionController');
		//		var c = dscClass.create();
		//		var cc = h5.core.controller('body', c);

		function Parent() {
		// do nothing
		}
		Parent.prototype._f1 = 'f1-init-value';

		function Child() {
		// do nothing
		}

		Child.prototype = Object.create(Parent.prototype);
		Child.prototype.constructor = Child;

		var descriptor = {
			enumerable: true,
			configurable: false,
			get: function() {
				return this._f1;
			},
			set: function(value) {
				this._f1 = value;
			}
		};
		Object.defineProperty(Child.prototype, 'f1', descriptor);

		var c1 = new Child();
		console.log('c1.f1 = ' + c1.f1);

		//Object.seal(c1);

		c1.f1 = 'instance child value';
		console.log('c1.f1 = ' + c1.f1);

		var c2 = new Child();
		console.log('c2.f1 = ' + c2.f1);

		console.log(c1);

	});

})(jQuery);
