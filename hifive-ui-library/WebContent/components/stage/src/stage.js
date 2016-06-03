/*
 * Copyright (C) 2012-2016 NS Solutions Corporation
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

	var RootClass = h5.cls.RootClass;

	var Rect = RootClass.extend({
		name: 'h5.ui.components.stage.Rect',
		property: {
			x: {
				isAccessor: true
			},
			y: {
				isAccessor: true
			},
			width: {
				isAccessor: true
			},
			height: {
				isAccessor: true
			}
		},
		method: {
			/**
			 * @memberOf h5.ui.components.stage.Rect
			 */
			constructor: function Rect(x, y, width, height) {
				Rect._super.call(this);
				this._p_x = x !== undefined ? x : 0;
				this._p_y = y !== undefined ? y : 0;
				this._p_width = width !== undefined ? width : 0;
				this._p_height = height !== undefined ? height : 0;
			}
		}
	});

	var Point = RootClass.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.Point',
			property: {
				x: null,
				y: null
			},
			method: {
				constructor: function Point(x, y) {
					Point._super.call(this);
					this.x = x;
					this.y = y;
				}
			}
		};
		return desc;
	});

	var WorldPoint = Point.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.WorldPoint',
			method: {
				constructor: function WorldPoint(x, y) {
					WorldPoint._super.call(this, x, y);
				}
			}
		};
		return desc;
	});

	var DisplayPoint = Point.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.DisplayPoint',
			method: {
				constructor: function DisplayPoint(x, y) {
					DisplayPoint._super.call(this, x, y);
				}
			}
		};
		return desc;
	});

	function createSvgElement(name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	}

	function setSvgAttribute(element, key, value) {
		element.setAttributeNS(null, key, value);
	}

	function setSvgAttributes(element, param) {
		for ( var key in param) {
			element.setAttributeNS(null, key, param[key]);
		}
	}

	var SVGDrawElement = RootClass.extend({
		name: 'h5.ui.components.stage.SVGDrawElement',
		property: {
			_element: null
		},
		method: {
			/**
			 * @memberOf h5.ui.components.stage.SVGDrawElement
			 */
			constructor: function SVGDrawElement() {
				SVGDrawElement._super.call(this);
			},
			setElement: function(element) {
				//TODO こんすとらくた渡しにする
				this._element = element;
			},
			getElement: function() {
				return this._element;
			},
			setAttribute: function(key, value) {
				setSvgAttribute(this._element, key, value);
			},
			setAttributes: function(param) {
				setSvgAttributes(this._element, param);
			}
		},
	});

	var SVGLine = SVGDrawElement.extend({
		name: 'h5.ui.components.stage.SVGLine',
		method: {
			constructor: function SVGLine() {
				SVGLine._super.call(this);
			}
		}
	});

	var SVGText = SVGDrawElement.extend({
		name: 'h5.ui.components.stage.SVGText',

		property: null,

		method: {
			/**
			 * @memberOf h5.ui.components.stage.SVGText
			 */
			constructor: function SVGText() {
				SVGText._super.call(this);
			},
			setText: function(text) {
				this._element.textContent = text;
				//				var str = document.createTextNode(text);
				//				this._element.appendChild(str);
			}
		}
	});


	var SVGGraphics = RootClass.extend({
		name: 'h5.ui.components.stage.SVGGraphics',
		property: {
			_rootSvg: null
		},
		method: {
			/**
			 * @memberOf h5.ui.components.stage.SVGGraphics
			 */
			constructor: function SVGGraphics() {
				SVGGraphics._super.call(this);
			},

			drawLine: function() {
				var line = createSvgElement('line');
				this._rootSvg.appendChild(line);
				var sl = SVGLine.create();
				sl.setElement(line);
				return sl;
			},
			drawRect: function() {
				var rect = createSvgElement('rect');
				this._rootSvg.appendChild(rect);
				var de = SVGDrawElement.create();
				de.setElement(rect);
				return de;
			},
			drawCircle: function() {
				var circle = createSvgElement('circle');
				this._rootSvg.appendChild(circle);
				var de = SVGDrawElement.create();
				de.setElement(circle);
				return de;
			},
			drawText: function(str) {
				var text = createSvgElement('text');
				this._rootSvg.appendChild(text);
				var de = SVGText.create();
				de.setElement(text);

				if (str != null) {
					de.setText(str);
				}

				return de;
			}
		}
	});

	//TODO layouter(仮)を差し込めるようにし、
	//layouterがいる場合にはx,y,w,hをセットしようとしたときに
	//layouterがフックして強制ブロック・別の値をセット等できるようにする
	var DisplayUnit = h5.cls.RootClass.extend(function() {
		var duIdSequence = 0;

		var classDesc = {
			name: 'h5.ui.components.stage.DisplayUnit',
			isAbstract: true,
			property: {
				id: null,

				//TODO privateなプロパティへの対応
				_parentDU: null,

				_rootStage: null,

				x: {
					isAccessor: true
				},
				y: {
					isAccessor: true
				},
				width: {
					isAccessor: true
				},
				height: {
					isAccessor: true
				},
				domRoot: {
					isAccessor: true
				},
				extraData: {
					isAccessor: true
				}
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.DisplayUnit
				 */
				constructor: function DisplayUnit(id) {
					DisplayUnit._super.call(this);
					//TODO 引数のIDは必須にする？？
					if (id == null) {
						//TODO ただの連番でなくGUID等にする
						this.id = 'duid_' + duIdSequence;
					} else {
						//TODO IDが渡された場合は一意性チェックを入れたい(※ここではなく、StageにaddされるときにStage側が行う)
						this.id = id;
					}

					//TODO prop.defaultValueで
					this.x = 0;
					this.y = 0;
					this.width = 0;
					this.height = 0;
				},

				setRect: function(rect) {
					this.x = rect.x;
					this.y = rect.y;
					this.width = rect.width;
					this.height = rect.height;

					//TODO 仮実装
					setSvgAttributes(this.domRoot, {
						x: rect.x,
						y: rect.y,
						width: rect.width,
						height: rect.height
					});
				},

				getRect: function() {
					var rect = Rect.create(this.x, this.y, this.width, this.height);
					return rect;
				},

				remove: function() {
					if (this._parentDU) {
						this._parentDU.removeDisplayUnit(this);
					}
				},

				moveTo: function(x, y) {
					this.x = x;
					this.y = y;

					//TODO 仮実装
					setSvgAttributes(this.domRoot, {
						x: x,
						y: y
					});
				},

				moveBy: function(x, y) {
					this.x += x;
					this.y += y;

					//TODO 仮実装
					setSvgAttributes(this.domRoot, {
						x: this.x,
						y: this.y
					});
				},

				scrollIntoView: function() {
				//TODO
				},

				getWorldGlobalPosition: function() {
					if (!this._parentDU) {
						return null;
					}

					var wgx = this.x;
					var wgy = this.y;

					var parentDU = this._parentDU;
					while (!Layer.isClassOf(parentDU)) {
						var parentPos = parentDU.getWorldGlobalPosition();
						wgx += parentPos.x;
						wgy += parentPos.y;
						parentDU = this._parentDU._parentDU;
					}

					var wpos = WorldPoint.create(wgx, wgy);
					return wpos;
				},

				_onAddedToRoot: function(stage) {
				//do nothing
				}

			//				scrollIntoView: {
			//					func: function () {
			//
			//					},
			//					type: ['int', 'int']
			//				}
			}
		};

		return classDesc;
	});



	var BasicDisplayUnit = DisplayUnit.extend({
		name: 'h5.ui.components.stage.BasicDisplayUnit',
		property: {
			_graphics: null,
			_renderer: null,
			isSelected: {
				isAccessor: true
			}
		},
		method: {
			constructor: function BasicDisplayUnit() {
				BasicDisplayUnit._super.call(this);

				//TODO 仮想化
				this._graphics = SVGGraphics.create();
				this._graphics._rootSvg = createSvgElement('svg');
				this.domRoot = this._graphics._rootSvg;
				this.domRoot.setAttribute('data-stage-role', 'basicDU'); //TODO for debugging
			},
			/**
			 * @memberOf h5.ui.components.stage.BasicDisplayUnit
			 */
			setRenderer: function(renderer) {
				this._renderer = renderer;
			}
		}
	});

	//TODO Path <- Edge などとする
	//TODO DUからrect系をはずすか
	var Edge = DisplayUnit.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.Edge',
			property: {
				_from: null,
				_to: null
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.Edge
				 */
				constructor: function Edge(duFrom, duTo) {
					Edge._super.call(this);
					this._from = duFrom;
					this._to = duTo;

					this.domRoot = createSvgElement('svg');
					this.domRoot.setAttribute('data-stage-role', 'edge'); //TODO for debugging
					//this._render();
				},
				setRect: function() {
					throw new Error('EdgeではsetRectは使えません');
				},
				_render: function() {
					//TODO 仮実装
					//バインドされているDUの位置が変わったら再描画が必要
					var fr = this._from.getRect();
					//var tr = this._to.getRect();

					var fwPos = this._from.getWorldGlobalPosition();
					var twPos = this._to.getWorldGlobalPosition();

					var line = createSvgElement('line');
					setSvgAttributes(line, {
						x1: fwPos.x + fr.width,
						y1: fwPos.y + fr.height,
						x2: twPos.x,
						y2: twPos.y
					});

					this.domRoot.appendChild(line);
				},
				_onAddedToRoot: function(stage) {
					this._render();
				}
			}
		};
		return desc;
	});

	var DisplayUnitContainer = DisplayUnit.extend({
		name: 'h5.ui.components.stage.DisplayUnitContainer',
		property: {
			_rootG: null,
			_children: null,
			_scaleX: null,
			_scaleY: null
		},
		method: {
			/**
			 * @memberOf h5.ui.components.stage.DisplayUnitContainer
			 */
			constructor: function DisplayUnitContainer() {
				DisplayUnitContainer._super.call(this);

				//TODO defaultValue
				this.x = 0;
				this.y = 0;
				this.width = 0;
				this.height = 0;

				this._scaleX = 1;
				this._scaelY = 1;

				this._children = [];

				//TODO ここではsvgは作らない。
				this.domRoot = createSvgElement('svg');
				this.domRoot.setAttribute('data-stage-role', 'container'); //TODO for debugging

				//TODO 暫定的に、コンテナはoverflow:visibleにするようにした
				//width, heightの指定との整合性について検討
				this.domRoot.setAttribute('overflow', 'visible');

				//rootGは<g>要素。transformを一括してかけるため、
				//子要素は全てこの<g>の下に追加する。
				this._rootG = createSvgElement('g');
				this.domRoot.appendChild(this._rootG);
			},

			addDisplayUnit: function(du) {
				this._children.push(du);
				this._rootG.appendChild(du.domRoot);
				if (typeof du._renderer === 'function') {
					du._renderer(du._graphics, du);
				}
				du._parentDU = this;
			},

			removeDisplayUnit: function(du) {
				var idx = this._children.indexOf(du);
				if (idx !== -1) {
					this._children.splice(idx, 1);
					this._rootG.removeChild(du.domRoot);
					du._parentDU = null;
				}
			},

			getDisplayUnitById: function(id) {
				return null; //TODO
			},

			getDisplayUnitAll: function() {
				return this._children;
			},

			_onAddedToRoot: function(rootStage) {
			//TODO ここでは定義しない方がよい？
			//AbstractMethodにする？(できるようにする？)
			},

			setScale: function(scaleX, scaleY) {
				if (scaleX != null) {
					this._scaleX = scaleX;
				}
				if (scaleY != null) {
					this._scaleY = scaleY;
				}
				this._updateTransform();
			},

			_updateTransform: function() {
				var transform = h5.u.str.format('scale({0},{1})', this._scaleX, this._scaleY);
				this._rootG.setAttribute('transform', transform);
			}
		}
	});


	//TODO LayerはDUの子クラスにしない方がよいか（DUContainerと一部が同じだとしても）
	var Layer = DisplayUnitContainer.extend({
		name: 'h5.ui.components.stage.Layer',
		property: {
			//_rootStage: null,
			_canScrollX: true,
			_canScrollY: true
		},
		method: {
			/**
			 * @constructor
			 * @memberOf h5.ui.components.stage.Layer
			 */
			constructor: function Layer(id) {
				Layer._super.call(this);
				this.x = 0;
				this.y = 0;
				this.width = 0;
				this.height = 0;

				this._children = [];

				//TODO ここではsvgは作らない。
				//this.domRoot = createSvgElement('svg');
				this.domRoot.setAttribute('data-stage-role', 'layer');
				//				this.domRoot.setAttribute('x', 0);
				//				this.domRoot.setAttribute('y', 0);
				//				this.domRoot.setAttribute('width', 1000);
				//				this.domRoot.setAttribute('height', 1000);

				this.id = id;
				this._canScrollX = true;
				this._canScrollY = true;
			},

			addDisplayUnit: function(du) {
				Layer._super.prototype.addDisplayUnit.call(this, du);

				du._onAddedToRoot(this._rootStage);
			},

			getWorldGlobalPosition: function() {
				var p = WorldPoint.create(this.x, this.y);
				return p;
			}
		}
	});

	h5.u.obj.expose('h5.ui.components.stage', {
		BasicDisplayUnit: BasicDisplayUnit,
		Layer: Layer,
		DisplayUnitContainer: DisplayUnitContainer,
		Rect: Rect,
		Point: Point,
		WorldPoint: WorldPoint,
		DisplayPoint: DisplayPoint,
		Edge: Edge
	});

	var stageLogic = {
		__name: 'h5.ui.components.stage.StageLogic'
	};

})(jQuery);


(function($) {

	var EVENT_SIGHT_CHANGE = 'stageSightChange';

	var stageModule = h5.ui.components.stage;

	var DisplayPoint = stageModule.DisplayPoint;

	var stageController = {
		/**
		 * @memberOf h5.ui.components.stage.StageController
		 */
		__name: 'h5.ui.components.stage.StageController',

		_root: null,

		_units: null,

		_rect: null,

		_scaleX: 1,

		_scaleY: 1,

		_initData: null,

		__construct: function() {
			this._units = new Map();
			this._layers = [];
			this._rect = stageModule.Rect.create(0, 0, 0, 0);
		},

		__ready: function() {
			if (!this._duRoot) {
				var rootSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				this._duRoot = rootSvg;
				//rootSvg.setAttribute('overflow', 'visible');
			}
			//$(this._root).css('position', 'relative');


			this.rootElement.appendChild(this._duRoot);

			this.refresh();
		},

		_updateRootSize: function(width, height) {
			var w = width !== undefined ? width : $(this.rootElement).width();
			var h = height !== undefined ? height : $(this.rootElement).height();

			this._duRoot.setAttributeNS(null, 'width', w);
			this._duRoot.setAttributeNS(null, 'height', h);

			this._rect.width = w;
			this._rect.height = h;
			this._updateViewBox();
		},

		_updateViewBox: function() {
			//TODO ViewBoxで全体のスクロールやスケールを実現するかどうかは
			//パフォーマンス等の観点を考えて検討

			var x = this._rect.x;
			var y = this._rect.y;
			var w = this._rect.width; // / this._scaleX;
			var h = this._rect.height; // / this._scaleY;

			this._duRoot.setAttribute('viewBox', h5.u.str.format('{0} {1} {2} {3}', x, y, w, h));
		},

		setup: function(initData) {
			//TODO setup()が__readyより前などいつ呼ばれても正しく動作するようにする

			this._initData = initData;

			if (initData.layers) {
				for (var i = 0, len = initData.layers.length; i < len; i++) {
					var layer = stageModule.Layer.create(initData.layers[i].id);
					this.addLayer(layer);
				}
			}
		},

		addDisplayUnit: function(displayUnit) {
			this._units.set(displayUnit.id, displayUnit);
			this._duRoot.appendChild(displayUnit.domRoot);

			displayUnit.domRoot.setAttributeNS(null, 'x', displayUnit.x);
			displayUnit.domRoot.setAttributeNS(null, 'y', displayUnit.y);

			if (displayUnit._renderer) {
				displayUnit._renderer();
			}

		},

		removeDisplayUnit: function(displayUnit) {
			this.removeById(displayUnit.id);
		},

		removeDisplayUnitById: function(id) {
			//FIXME deleteが失敗する
			this._unit["delete"](displayUnit.id);
			this._duRoot.removeChild(displayUnit.domRoot);
		},

		removeDisplayUnitAll: function() {
		//TODO
		},

		addLayer: function(layer, index) {
			if (index != null) {
				this._layers.splice(index, 0, layer);
			} else {
				this._layers.push(layer);
			}
			this._duRoot.appendChild(layer.domRoot);
		},

		getLayer: function(id) {
			for (var i = 0, len = this._layers.length; i < len; i++) {
				var layer = this._layers[i];
				if (layer.id === id) {
					return layer;
				}
			}
			return null;
		},

		scrollTo: function(dispX, dispY) {
			var oldPos = DisplayPoint.create(this._rect.x, this._rect.y);

			this._rect.x = dispX;
			this._rect.y = dispY;
			this._updateViewBox();

			var newPos = DisplayPoint.create(dispX, dispY);

			//TODO 現在はこの場所でイベントを出しているが、
			//将来的にはrefresh()のスロットの中で（非同期化された描画更新フレーム処理の中で）
			//描画更新後にイベントをあげるようにする
			var evArg = {
				scrollPosition: {
					oldValue: oldPos,
					newValue: newPos,
					isChanged: true
				},
				scale: {
					oldValue: {
						x: this._scaleX,
						y: this._scaleY
					},
					newValue: {
						x: this._scaleX,
						y: this._scaleY
					},
					isChanged: false
				}
			};
			this.trigger(EVENT_SIGHT_CHANGE, evArg);
		},

		scrollBy: function(dispX, dispY) {
			var x = this._rect.x + dispX;
			var y = this._rect.y + dispY;
			this.scrollTo(x, y);
		},

		scrollWorldTo: function(wx, wy) {

		},

		scrollWorldBy: function(wx, wy) {

		},

		setScale: function(scaleX, scaleY) {
			if (scaleX != null) {
				this._scaleX = scaleX;
			}
			if (scaleY != null) {
				this._scaleY = scaleY;
			}

			for (var i = 0, len = this._layers.length; i < len; i++) {
				var layer = this._layers[i];
				layer.setScale(this._scaleX, this._scaleY);
			}
		},

		setScaleX: function(scaleX) {
			this.setScale(scaleX, null);
		},

		setScaleY: function(scaleY) {
			this.setScale(null, scaleY);
		},

		refresh: function(immediate) {
			this._updateRootSize();
		},

		getScrollPosition: function() {
			var pos = stageModule.DisplayPoint.create(this._rect.x, this._rect.y);
			return pos;
		}
	};

	h5.core.expose(stageController);

})(jQuery);
